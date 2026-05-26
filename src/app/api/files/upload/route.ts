import { NextRequest } from "next/server";
import { getCurrentUserId } from "@/services/auth/auth.service";
import { prisma } from "@/lib/prisma";
import { getJSON, setWithTTL } from "@/lib/redis";
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

    // 3. Extract metadata and obtain stream handle
    let fileName = "unnamed_file";
    let fileSize = 0;
    let fileStream: ReadableStream<Uint8Array> | null = null;

    const fileNameHeader = request.headers.get("x-file-name");
    const fileSizeHeader = request.headers.get("x-file-size");

    if (fileNameHeader) {
      fileName = decodeURIComponent(fileNameHeader);
      fileSize = Number(fileSizeHeader || "0");
      fileStream = request.body;
    } else {
      // Fallback to standard form data parsing
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (file) {
        fileName = file.name || "unnamed_file";
        fileSize = file.size;
        fileStream = file.stream() as unknown as ReadableStream<Uint8Array>;
      }
    }

    const parentIdHeader = request.headers.get("x-parent-id");
    let parentId: string | null = parentIdHeader || null;
    if (parentId === "null" || parentId === "undefined" || !parentId) {
      parentId = null;
    }

    const isSecureHeader = request.headers.get("x-is-secure") === "true";
    let shouldBeSecure = isSecureHeader;

    if (parentId) {
      const parentFolder = await prisma.file.findUnique({
        where: { id: parentId },
      });
      if (parentFolder && parentFolder.isSecure) {
        shouldBeSecure = true;
      }
    }

    if (shouldBeSecure) {
      const isUnlocked = (await getJSON<string>(`secure_unlocked:${userId}`)) === "true";
      if (!isUnlocked) {
        return new Response(
          JSON.stringify({ success: false, message: "Secure folder is locked. Please unlock it first." }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    if (!fileStream) {
      return new Response(
        JSON.stringify({ success: false, message: "No file provided." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    log.info("Ingesting stream upload", { fileName, fileSize, parentId, method: fileNameHeader ? "raw-stream" : "form-data" });

    // 4. Stream to disk and queue background worker job
    const jobId = await uploadService.initiateUpload(
      userId,
      fileName,
      fileSize,
      fileStream,
      parentId || undefined
    );

    if (shouldBeSecure) {
      await setWithTTL(`secure_job:${jobId}`, "true", 3600 * 24); // 24 hours TTL
    }

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
