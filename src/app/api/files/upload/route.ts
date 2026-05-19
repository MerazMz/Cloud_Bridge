import { NextRequest } from "next/server";
import { getCurrentUserId } from "@/services/auth/auth.service";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";
import { uploadService } from "@/services/upload/upload.service";

const log = createLogger("API:files:upload");

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const userId = await getCurrentUserId();
    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, message: "Not authenticated." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Check storage channel exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        storageChannelId: true,
        storageChannelAccessHash: true,
      },
    });

    if (!user || !user.storageChannelId || !user.storageChannelAccessHash) {
      return new Response(
        JSON.stringify({ success: false, message: "Storage channel is not set up." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Parse request Form Data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return new Response(
        JSON.stringify({ success: false, message: "No file provided." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const fileName = file.name || "unnamed_file";
    const fileSize = file.size;
    const mimeType = file.type || "application/octet-stream";

    log.info("Ingesting stream upload", { fileName, fileSize, mimeType });

    // 4. Stream to disk and queue background worker job
    const jobId = await uploadService.initiateUpload(
      userId,
      fileName,
      fileSize,
      mimeType,
      file.stream() as unknown as ReadableStream<Uint8Array>
    );

    return new Response(
      JSON.stringify({ success: true, jobId }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    log.error("Failed to ingest streaming file upload", error);
    return new Response(
      JSON.stringify({ success: false, message: error.message || "Upload ingestion failed." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
