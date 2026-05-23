import { successResponse, errorResponse } from "@/lib/api-response";
import { getCurrentUserId } from "@/services/auth/auth.service";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";
import type { UserProfile } from "@/types/auth.types";

const log = createLogger("API:me");

export async function GET() {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return errorResponse("Not authenticated.", 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phoneNumber: true,
        telegramUserId: true,
        displayName: true,
        username: true,
        profilePhotoUrl: true,
        storageChannelId: true,
        createdAt: true,
      },
    });

    if (!user) {
      return errorResponse("User not found.", 404);
    }

    const profile: UserProfile = {
      id: user.id,
      phoneNumber: user.phoneNumber,
      telegramUserId: user.telegramUserId.toString(),
      displayName: user.displayName,
      username: user.username,
      profilePhotoUrl: user.profilePhotoUrl,
      storageChannelId: user.storageChannelId?.toString() || null,
      storageChannelStatus: user.storageChannelId ? "active" : "pending",
      createdAt: user.createdAt.toISOString(),
    };

    return successResponse(profile, "User profile retrieved.");
  } catch (error) {
    log.error("Get user profile failed", error);
    return errorResponse("Failed to retrieve profile.", 500);
  }
}
