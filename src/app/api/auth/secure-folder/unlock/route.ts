import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { getCurrentUserId } from "@/services/auth/auth.service";
import { prisma } from "@/lib/prisma";
import { setWithTTL } from "@/lib/redis";
import { compare } from "bcryptjs";
import { createLogger } from "@/lib/logger";

const log = createLogger("API:secure-folder:unlock");

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return errorResponse("Not authenticated.", 401);
    }

    const body = await request.json();
    const { password } = body;

    if (!password) {
      return errorResponse("Password is required.", 400);
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

    const isMatch = await compare(password, user.securePasswordHash);
    if (!isMatch) {
      return errorResponse("Incorrect secure password.", 400);
    }

    // Set unlock status in Redis for 15 minutes (900 seconds)
    await setWithTTL(`secure_unlocked:${userId}`, "true", 900);

    log.info("Secure folder unlocked successfully", { userId });

    return successResponse(null, "Secure folder unlocked successfully.");
  } catch (error: any) {
    log.error("Failed to unlock secure folder", error);
    return errorResponse(error.message || "Failed to unlock folder.", 500);
  }
}
