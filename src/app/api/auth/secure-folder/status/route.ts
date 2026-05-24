import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { getCurrentUserId } from "@/services/auth/auth.service";
import { prisma } from "@/lib/prisma";
import { getJSON } from "@/lib/redis";
import { createLogger } from "@/lib/logger";

const log = createLogger("API:secure-folder:status");

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return errorResponse("Not authenticated.", 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        securePasswordHash: true,
      },
    });

    if (!user) {
      return errorResponse("User not found.", 404);
    }

    const isUnlocked = (await getJSON<string>(`secure_unlocked:${userId}`)) === "true";

    return successResponse({
      hasPassword: !!user.securePasswordHash,
      isUnlocked,
    }, "Secure folder status retrieved successfully.");
  } catch (error: any) {
    log.error("Failed to fetch secure folder status", error);
    return errorResponse(error.message || "Failed to fetch status.", 500);
  }
}
