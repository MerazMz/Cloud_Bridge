import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { getCurrentUserId } from "@/services/auth/auth.service";
import { getClientForUser } from "@/services/telegram/telegram.service";
import { setWithTTL } from "@/lib/redis";
import { createLogger } from "@/lib/logger";
import { Api } from "telegram";
import bigInt from "big-integer";

const log = createLogger("API:secure-folder:send-otp");

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let client: any = null;
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return errorResponse("Not authenticated.", 401);
    }

    // Generate random 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in Redis (5 minutes TTL)
    await setWithTTL(`secure_otp:${userId}`, otpCode, 300);

    log.info("Sending Secure Folder OTP to Telegram user", { userId });

    // Retrieve active Telegram client
    client = await getClientForUser(userId);

    // Send code to their private Saved Messages
    await client.invoke(
      new Api.messages.SendMessage({
        peer: new Api.InputPeerSelf(),
        message: `🛡️ CloudBridge Secure Folder Setup\n\nYour verification code is: ${otpCode}\n\nDo not share this code. If you did not request this, please ignore.`,
        randomId: bigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)),
      })
    );

    log.info("Secure Folder OTP sent successfully via Telegram");
    return successResponse(null, "Verification code sent to your Telegram Saved Messages.");
  } catch (error: any) {
    log.error("Failed to send Secure Folder OTP", error);
    return errorResponse(error.message || "Failed to send verification code.", 500);
  } finally {
    if (client) {
      try {
        await client.disconnect();
      } catch (discErr: any) {
        log.warn("Failed to disconnect client cleanly", discErr);
      }
    }
  }
}
