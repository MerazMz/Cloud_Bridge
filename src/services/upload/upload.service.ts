import { UploadJobQueue } from "./queue/job-queue";
import { uploadWorkerPool } from "./queue/worker-pool";
import { writeWebStreamToDisk } from "./core/stream-pipeline";
import { prisma } from "@/lib/prisma";
import { promises as fs } from "fs";
import path from "path";
import { createLogger } from "@/lib/logger";

const log = createLogger("UploadService");

class UploadService {
  private tempDir = path.join(process.cwd(), "temp_uploads");

  constructor() {
    // Automatically start background worker queue polling
    uploadWorkerPool.start();
    this.ensureTempDir();
  }

  /**
   * Helper to ensure temp directory exists on initialization.
   */
  private async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
      log.debug("Temp uploads directory verified", { path: this.tempDir });
    } catch (err: any) {
      log.error("Failed to create temp directory", { err: err.message });
    }
  }

  /**
   * Initiate a streaming file upload: streams file directly to disk, registers the queue job,
   * and triggers the background worker pipeline.
   */
  async initiateUpload(
    userId: string,
    fileName: string,
    fileSize: number,
    mimeType: string,
    fileStream: ReadableStream<Uint8Array>
  ): Promise<string> {
    const safeFileName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const tempFilePath = path.join(this.tempDir, safeFileName);

    log.info("Initiating streaming upload pipeline to disk", { fileName, fileSize, tempFilePath });

    // 1. Zero-copy stream directly to server disk
    await writeWebStreamToDisk(fileStream, tempFilePath);

    log.debug("Zero-copy stream written to disk cache successfully", { tempFilePath });

    // 2. Create a background queue job record in database
    const job = await UploadJobQueue.createJob({
      userId,
      fileName,
      fileSize,
      mimeType,
      tempFilePath,
    });

    // 3. Immediately trigger background queue uploader checks asynchronously!
    uploadWorkerPool.triggerCheck();

    return job.id;
  }

  /**
   * Cancel an active or pending upload job.
   */
  async cancelUpload(jobId: string): Promise<void> {
    log.info("Requesting job cancellation", { jobId });
    await UploadJobQueue.cancelJob(jobId);
  }

  /**
   * Query the current metadata and progress of an upload job.
   */
  async getJobStatus(jobId: string) {
    return prisma.uploadJob.findUnique({
      where: { id: jobId },
    });
  }
}

// Global Singleton Upload Service
export const uploadService = new UploadService();
