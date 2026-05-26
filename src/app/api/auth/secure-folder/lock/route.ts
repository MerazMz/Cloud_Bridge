import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { getCurrentUserId } from "@/services/auth/auth.service";
import { del } from "@/lib/redis";
import { createLogger } from "@/lib/logger";

const log = createLogger("API:secure-folder:lock");

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return errorResponse("Not authenticated.", 401);
    }

    // Invalidate active session in Redis
    await del(`secure_unlocked:${userId}`);

    log.info("Secure folder locked successfully", { userId });

    return successResponse(null, "Secure folder locked successfully.");
  } catch (error: any) {
    log.error("Failed to lock secure folder", error);
    return errorResponse(error.message || "Failed to lock folder.", 500);
  }
}
