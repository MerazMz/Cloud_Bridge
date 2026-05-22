import { UploadJobQueue } from "./queue/job-queue";
import { uploadWorkerPool } from "./queue/worker-pool";
import { writeWebStreamToDisk } from "./core/stream-pipeline";
import { prisma } from "@/lib/prisma";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { createLogger } from "@/lib/logger";

const log = createLogger("UploadService");

class UploadService {
  private tempDir = os.tmpdir();

  constructor() {
    // Automatically start background worker queue polling
    uploadWorkerPool.start();
  }

  /**
   * Initiate a streaming file upload: streams file directly to disk, registers the queue job,
   * and triggers the background worker pipeline.
   */
  async initiateUpload(
    userId: string,
    fileName: string,
    fileSize: number,
    fileStream: ReadableStream<Uint8Array>,
    parentId?: string,
    shouldCompress?: boolean
  ): Promise<string> {
    const isVideo = fileName.toLowerCase().match(/\.(mp4|mov|webm|mkv|avi)$/i);
    const compressMarker = (shouldCompress && isVideo) ? "compress_" : "";
    const safeFileName = `${Date.now()}_${compressMarker}${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const tempFilePath = path.join(this.tempDir, safeFileName);

    log.info("Initiating streaming upload pipeline to disk", { fileName, fileSize, tempFilePath, parentId });

    try {
      // 1. Zero-copy stream directly to server disk
      await writeWebStreamToDisk(fileStream, tempFilePath);
    } catch (err) {
      // Safely delete the partial file in case of stream abortion
      try {
        await fs.unlink(tempFilePath);
      } catch {}
      throw err;
    }

    log.debug("Zero-copy stream written to disk cache successfully", { tempFilePath });

    // 2. Create a background queue job record in database
    const job = await UploadJobQueue.createJob({
      userId,
      fileName,
      fileSize,
      tempFilePath,
      parentId,
    });

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
