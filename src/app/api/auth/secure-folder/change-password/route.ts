import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { getCurrentUserId } from "@/services/auth/auth.service";
import { prisma } from "@/lib/prisma";
import { setWithTTL } from "@/lib/redis";
import { hash, compare } from "bcryptjs";
import { createLogger } from "@/lib/logger";

const log = createLogger("API:secure-folder:change-password");

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return errorResponse("Not authenticated.", 401);
    }

    const body = await request.json();
    const { oldPassword, newPassword } = body;

    if (!oldPassword || !newPassword) {
      return errorResponse("Old password and new password are required.", 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        securePasswordHash: true,
      },
    });

    if (!user || !user.securePasswordHash) {
      return errorResponse("Secure folder password is not set up.", 400);
    }

    const isMatch = await compare(oldPassword, user.securePasswordHash);
    if (!isMatch) {
      return errorResponse("Incorrect current password.", 400);
    }

    // Hash the new password
    const hashedPassword = await hash(newPassword, 10);

    // Save to user model
    await prisma.user.update({
      where: { id: userId },
      data: {
        securePasswordHash: hashedPassword,
      },
    });

    // Auto-unlock secure folder for 15 minutes (900 seconds)
    await setWithTTL(`secure_unlocked:${userId}`, "true", 900);

    log.info("Secure folder password changed successfully", { userId });

    return successResponse(null, "Secure folder password changed successfully.");
  } catch (error: any) {
    log.error("Failed to change secure folder password", error);
    return errorResponse(error.message || "Failed to change password.", 500);
  }
}
