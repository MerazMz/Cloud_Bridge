import { NextRequest } from "next/server";
import { getCurrentUserId } from "@/services/auth/auth.service";
import { uploadService } from "@/services/upload/upload.service";
import { createLogger } from "@/lib/logger";

const log = createLogger("API:files:upload:cancel");

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, message: "Not authenticated." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = await request.json();
    const { jobId } = body;

    if (!jobId) {
      return new Response(
        JSON.stringify({ success: false, message: "Missing jobId." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    log.info("Explicit cancellation request received", { jobId });
    await uploadService.cancelUpload(jobId);

    return new Response(
      JSON.stringify({ success: true, message: "Upload job cancelled successfully." }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    log.error("Failed to cancel upload job", error);
    return new Response(
      JSON.stringify({ success: false, message: error.message || "Failed to cancel job." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
