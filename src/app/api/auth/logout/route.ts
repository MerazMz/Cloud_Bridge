import { successResponse, errorResponse } from "@/lib/api-response";
import {
  getCurrentUserId,
  deleteAllUserSessions,
  clearAuthCookies,
} from "@/services/auth/auth.service";
import { createLogger } from "@/lib/logger";

const log = createLogger("API:logout");

export async function POST() {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      // Still clear cookies even if token is invalid
      await clearAuthCookies();
      return successResponse(null, "Logged out.");
    }

    // Delete all sessions from database
    await deleteAllUserSessions(userId);

    // Clear auth cookies
    await clearAuthCookies();

    log.info("User logged out", { userId });

    return successResponse(null, "Logged out successfully.");
  } catch (error) {
    log.error("Logout failed", error);

    // Best-effort: still try to clear cookies
    try {
      await clearAuthCookies();
    } catch {
      // Ignore
    }

    return errorResponse("Logout failed.", 500);
  }
}
