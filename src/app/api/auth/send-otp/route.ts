import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { sendOtpSchema } from "@/validators/auth.validators";
import { sendCode } from "@/services/telegram/telegram.service";
import {
  isRateLimited,
  setRateLimit,
  storeOtpState,
} from "@/services/auth/auth.service";
import { createLogger } from "@/lib/logger";

const log = createLogger("API:send-otp");

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = sendOtpSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.flatten().fieldErrors;
      const firstError = Object.values(errors).flat()[0] || "Invalid input";
      return errorResponse(firstError, 400);
    }

    const { phoneNumber } = validation.data;

    // Check rate limit
    const rateLimited = await isRateLimited(phoneNumber);
    if (rateLimited) {
      return errorResponse(
        "Please wait 60 seconds before requesting another code.",
        429
      );
    }

    // Send OTP via Telegram MTProto
    const result = await sendCode(phoneNumber);

    // Store OTP state in Redis
    await storeOtpState(phoneNumber, {
      phoneNumber,
      phoneCodeHash: result.phoneCodeHash,
      tempSessionString: result.tempSessionString,
      step: "otp_sent",
      attempts: 0,
    });

    // Set rate limit
    await setRateLimit(phoneNumber);

    log.info("OTP sent successfully", {
      phone: phoneNumber.slice(0, 4) + "****",
    });

    return successResponse(
      { phoneNumber },
      "Verification code sent to your Telegram app."
    );
  } catch (error) {
    log.error("Send OTP failed", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to send verification code.";

    // Determine status code based on error type
    const status = message.includes("Too many attempts") ? 429 : 500;

    return errorResponse(message, status);
  }
}
