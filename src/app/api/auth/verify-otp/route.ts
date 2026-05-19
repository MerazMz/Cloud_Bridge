import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { verifyOtpSchema } from "@/validators/auth.validators";
import { signIn, ensureStorageChannel } from "@/services/telegram/telegram.service";
import {
  encryptSession,
} from "@/services/crypto/crypto.service";
import {
  getOtpState,
  updateOtpState,
  clearOtpState,
  createAuthTokens,
  setAuthCookies,
} from "@/services/auth/auth.service";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";

const log = createLogger("API:verify-otp");

const MAX_OTP_ATTEMPTS = 5;

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = verifyOtpSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.flatten().fieldErrors;
      const firstError = Object.values(errors).flat()[0] || "Invalid input";
      return errorResponse(firstError, 400);
    }

    const { phoneNumber, code } = validation.data;

    // Retrieve OTP state from Redis
    const otpState = await getOtpState(phoneNumber);
    if (!otpState) {
      return errorResponse(
        "Verification session expired. Please request a new code.",
        400
      );
    }

    // Check phone number matches
    if (otpState.phoneNumber !== phoneNumber) {
      return errorResponse("Phone number mismatch.", 400);
    }

    // Check attempts limit
    if (otpState.attempts >= MAX_OTP_ATTEMPTS) {
      await clearOtpState(phoneNumber);
      return errorResponse(
        "Too many failed attempts. Please request a new code.",
        429
      );
    }

    // Increment attempts
    await updateOtpState(phoneNumber, { attempts: otpState.attempts + 1 });

    // Verify OTP with Telegram
    const result = await signIn(
      otpState.tempSessionString,
      phoneNumber,
      code,
      otpState.phoneCodeHash
    );

    // Handle 2FA required
    if (result.type === "2fa_required") {
      await updateOtpState(phoneNumber, {
        step: "needs_2fa",
        tempSessionString: result.tempSessionString,
      });

      log.info("2FA required", { phone: phoneNumber.slice(0, 4) + "****" });

      return successResponse(
        { requires2FA: true, phoneNumber },
        "Two-factor authentication is required."
      );
    }

    // Success — complete the login flow
    const { user, sessionString } = result;

    // Encrypt the Telegram session
    const encrypted = encryptSession(sessionString);

    // Ensure storage channel exists
    let storageChannelId: bigint | null = null;
    let storageChannelAccessHash: string | null = null;
    try {
      const channel = await ensureStorageChannel(
        sessionString,
        user.telegramUserId
      );
      storageChannelId = channel.channelId;
      storageChannelAccessHash = channel.accessHash;
    } catch (channelError) {
      log.warn("Failed to create storage channel — will retry later", {
        error: channelError,
      });
    }

    // Upsert user in database
    const dbUser = await prisma.user.upsert({
      where: { telegramUserId: user.telegramUserId },
      update: {
        phoneNumber,
        telegramAccessHash: user.accessHash,
        telegramSessionEncrypted: encrypted.encrypted,
        telegramSessionIv: encrypted.iv,
        telegramSessionAuthTag: encrypted.authTag,
        displayName: user.displayName,
        username: user.username || null,
        storageChannelId,
        storageChannelAccessHash,
        updatedAt: new Date(),
      },
      create: {
        phoneNumber,
        telegramUserId: user.telegramUserId,
        telegramAccessHash: user.accessHash,
        telegramSessionEncrypted: encrypted.encrypted,
        telegramSessionIv: encrypted.iv,
        telegramSessionAuthTag: encrypted.authTag,
        displayName: user.displayName,
        username: user.username || null,
        storageChannelId,
        storageChannelAccessHash,
      },
    });

    // Create auth tokens
    const userAgent = request.headers.get("user-agent") || undefined;
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      undefined;

    const tokens = await createAuthTokens(dbUser.id, userAgent, ipAddress);

    // Set HttpOnly cookies
    await setAuthCookies(tokens.accessToken, tokens.refreshToken);

    // Clean up OTP state
    await clearOtpState(phoneNumber);

    log.info("Login successful", {
      userId: dbUser.id,
      telegramUserId: user.telegramUserId.toString(),
    });

    return successResponse(
      {
        userId: dbUser.id,
        displayName: user.displayName,
        username: user.username,
      },
      "Login successful."
    );
  } catch (error) {
    log.error("Verify OTP failed", error);

    const message =
      error instanceof Error ? error.message : "Verification failed.";

    return errorResponse(message, 400);
  }
}
