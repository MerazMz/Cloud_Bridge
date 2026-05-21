import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { getCurrentUserId } from "@/services/auth/auth.service";
import { createLogger } from "@/lib/logger";
import { SemanticSearchService } from "@/services/semantic-search/semantic-search.service";

const log = createLogger("API:files:backfill");

async function triggerBackfill(userId: string, force = false) {
  log.info("Triggering background embedding backfill for user", { userId, force });

  // Execute the backfill asynchronously in a non-blocking way
  Promise.resolve()
    .then(async () => {
      try {
        const result = await SemanticSearchService.backfillEmbeddingsForUser(userId, force);
        log.info("Background backfill completed", { userId, result });
      } catch (err: any) {
        log.error("Background backfill failed", { userId, error: err.message });
      }
    });
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return errorResponse("Not authenticated.", 401);
    }

    let force = false;
    try {
      const body = await req.json();
      force = body.force === true;
    } catch {
      // Body may not be JSON or present, check searchParams too
      const { searchParams } = new URL(req.url);
      force = searchParams.get("force") === "true";
    }

    await triggerBackfill(userId, force);

    return successResponse(
      { status: "started", force },
      "Embedding backfill started in background."
    );
  } catch (error: any) {
    log.error("Failed to start backfill via POST", error);
    return errorResponse(`Failed to start backfill: ${error.message}`, 500);
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return errorResponse("Not authenticated.", 401);
    }

    const { searchParams } = new URL(req.url);
    const force = searchParams.get("force") === "true";

    await triggerBackfill(userId, force);

    return successResponse(
      { status: "started", force },
      "Embedding backfill started in background."
    );
  } catch (error: any) {
    log.error("Failed to start backfill via GET", error);
    return errorResponse(`Failed to start backfill: ${error.message}`, 500);
  }
}
