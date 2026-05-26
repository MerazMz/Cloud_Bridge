import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { getCurrentUserId } from "@/services/auth/auth.service";
import { prisma } from "@/lib/prisma";
import { getJSON, del, setWithTTL } from "@/lib/redis";
import { hash } from "bcryptjs";
import { createLogger } from "@/lib/logger";

const log = createLogger("API:secure-folder:setup");

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return errorResponse("Not authenticated.", 401);
    }

    const body = await request.json();
    const { otp, password } = body;

    if (!otp || !password) {
      return errorResponse("OTP and password are required.", 400);
    }

    // Verify OTP code
    const storedOtp = await getJSON<string>(`secure_otp:${userId}`);
    if (!storedOtp || storedOtp !== otp.trim()) {
      return errorResponse("Invalid or expired verification code.", 400);
    }

    // Hash password
    const hashedPassword = await hash(password, 10);

    // Save to user model
    await prisma.user.update({
      where: { id: userId },
      data: {
        securePasswordHash: hashedPassword,
      },
    });

    // Clean up OTP
    await del(`secure_otp:${userId}`);

    // Auto-unlock secure folder for 15 minutes (900 seconds)
    await setWithTTL(`secure_unlocked:${userId}`, "true", 900);

    log.info("Secure folder password set and folder unlocked", { userId });

    return successResponse(null, "Secure password configured and folder unlocked successfully.");
  } catch (error: any) {
    log.error("Failed to set up secure folder password", error);
    return errorResponse(error.message || "Failed to set up password.", 500);
  }
}
