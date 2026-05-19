import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { verify2FASchema } from "@/validators/auth.validators";
import { signInWith2FA, ensureStorageChannel } from "@/services/telegram/telegram.service";
import { encryptSession } from "@/services/crypto/crypto.service";
import {
  getOtpState,
  clearOtpState,
  createAuthTokens,
  setAuthCookies,
} from "@/services/auth/auth.service";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";

const log = createLogger("API:verify-2fa");

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = verify2FASchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.flatten().fieldErrors;
      const firstError = Object.values(errors).flat()[0] || "Invalid input";
      return errorResponse(firstError, 400);
    }

    const { phoneNumber, password } = validation.data;

    // Retrieve OTP state from Redis
    const otpState = await getOtpState(phoneNumber);
    if (!otpState) {
      return errorResponse(
        "Session expired. Please restart the login process.",
        400
      );
    }

    // Verify we're in the 2FA step
    if (otpState.step !== "needs_2fa") {
      return errorResponse(
        "Invalid flow state. Please complete OTP verification first.",
        400
      );
    }

    // Verify 2FA password with Telegram
    const result = await signInWith2FA(otpState.tempSessionString, password);

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

    log.info("2FA login successful", {
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
    log.error("2FA verification failed", error);

    const message =
      error instanceof Error ? error.message : "2FA verification failed.";

    return errorResponse(message, 400);
  }
}
