import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { getCurrentUserId } from "@/services/auth/auth.service";
import { createLogger } from "@/lib/logger";
import { SemanticSearchService } from "@/services/semantic-search/semantic-search.service";

const log = createLogger("API:files:search");

export async function GET(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return errorResponse("Not authenticated.", 401);
    }
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");
    if (!query || !query.trim()) {
      return errorResponse("Search query parameter 'q' is required.", 400);
    }

    const { threshold, files } = await SemanticSearchService.searchImages(userId, query);

    log.info("Semantic search completed successfully via service", {
      query,
      resultsCount: files.length,
      threshold,
    });

    return successResponse(
      {
        threshold,
        files,
      },
      "Semantic search completed successfully."
    );
  } catch (error: any) {
    log.error("Failed to perform semantic search via API route", error);
    return errorResponse(`Failed to perform semantic search: ${error.message}`, 500);
  }
}
