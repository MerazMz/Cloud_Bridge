import { prisma } from "@/lib/prisma";
import { progressBroadcaster } from "../telemetry/progress-stream";
import { promises as fs } from "fs";
import { createLogger } from "@/lib/logger";

const log = createLogger("UploadJobQueue");

export interface CreateJobParams {
  userId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  tempFilePath: string;
}

export class UploadJobQueue {
  /**
   * Safe getter that dynamically recovers from stale Next.js in-memory cached Prisma client singletons.
   */
  private static get db() {
    let client = prisma;
    if (client && !(client as any).uploadJob) {
      log.warn("Stale cached database client detected. Dynamically purging cache and re-initializing...");
      const globalForPrisma = globalThis as any;
      if (globalForPrisma.prisma) {
        delete globalForPrisma.prisma;
      }
      try {
        const { prisma: freshPrisma } = require("@/lib/prisma");
        client = freshPrisma;
      } catch {}
    }
    return client.uploadJob;
  }

  /**
   * Register a new upload job in the queue database.
   */
  static async createJob(params: CreateJobParams) {
    const job = await this.db.create({
      data: {
        userId: params.userId,
        fileName: params.fileName,
        fileSize: BigInt(params.fileSize),
        tempFilePath: params.tempFilePath,
        mimeType: params.mimeType,
        status: "queued",
      },
    });

    log.info("Upload job registered in queue", { jobId: job.id, fileName: job.fileName });
    return job;
  }

  /**
   * Retrieve the next queued job available for processing.
   */
  static async getNextJob() {
    return this.db.findFirst({
      where: {
        status: "queued",
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  }

  /**
   * Update the live progress and status metrics of an active job.
   */
  static async updateJobProgress(jobId: string, percent: number, uploadedBytes: number, speed: string, eta: string) {
    await this.db.update({
      where: { id: jobId },
      data: {
        progress: percent,
        uploadedBytes: BigInt(uploadedBytes),
        status: "processing",
      },
    });

    // Broadcast live to SSE listeners
    progressBroadcaster.broadcast(jobId, {
      jobId,
      status: "processing",
      percent,
      uploadedBytes,
      totalBytes: 0,
      speed,
      eta,
    });
  }

  /**
   * Transition job to successfully completed. Removes the temporary disk file.
   */
  static async completeJob(jobId: string) {
    const job = await this.db.update({
      where: { id: jobId },
      data: {
        status: "completed",
        progress: 100,
      },
    });

    log.info("Upload job successfully completed", { jobId });

    await this.cleanupTempFile(job.tempFilePath);

    progressBroadcaster.broadcast(jobId, {
      jobId,
      status: "completed",
      percent: 100,
      uploadedBytes: Number(job.fileSize),
      totalBytes: Number(job.fileSize),
      speed: "0 KB/s",
      eta: "0s",
    });

    return job;
  }

  /**
   * Fail a job, incrementing retry counters or moving it to final failed status.
   */
  static async failJob(jobId: string, error: Error) {
    const job = await this.db.findUnique({
      where: { id: jobId },
    });

    if (!job) return;

    const nextRetry = job.retries + 1;
    const isFinalFailure = nextRetry >= job.maxRetries;
    const nextStatus = isFinalFailure ? "failed" : "queued";

    const updatedJob = await this.db.update({
      where: { id: jobId },
      data: {
        status: nextStatus,
        retries: nextRetry,
        errorMessage: error.message || "Unknown error",
      },
    });

    log.warn(`Job processing failed ${isFinalFailure ? "(Final)" : "(Queued for retry)"}`, {
      jobId,
      error: error.message,
      retries: nextRetry,
    });

    if (isFinalFailure) {
      await this.cleanupTempFile(job.tempFilePath);
    }

    progressBroadcaster.broadcast(jobId, {
      jobId,
      status: nextStatus,
      percent: job.progress,
      uploadedBytes: Number(job.uploadedBytes),
      totalBytes: Number(job.fileSize),
      speed: "0 KB/s",
      eta: "--",
      errorMessage: error.message,
    });

    return updatedJob;
  }

  /**
   * Cancel an active upload job, cleaning up temp disk footprint.
   */
  static async cancelJob(jobId: string) {
    const job = await this.db.findUnique({
      where: { id: jobId },
    });

    if (!job || job.status === "completed" || job.status === "cancelled") return;

    await this.db.update({
      where: { id: jobId },
      data: {
        status: "cancelled",
      },
    });

    log.info("Upload job cancelled by user", { jobId });
    await this.cleanupTempFile(job.tempFilePath);

    progressBroadcaster.broadcast(jobId, {
      jobId,
      status: "cancelled",
      percent: job.progress,
      uploadedBytes: Number(job.uploadedBytes),
      totalBytes: Number(job.fileSize),
      speed: "0 KB/s",
      eta: "--",
    });
  }

  /**
   * Clean up temporary file from the disk safely.
   */
  private static async cleanupTempFile(filePath: string) {
    try {
      await fs.unlink(filePath);
      log.debug("Temp file cleaned up safely", { filePath });
    } catch (err: any) {
      if (err.code !== "ENOENT") {
        log.error("Failed to delete temporary file", { filePath, err: err.message });
      }
    }
  }
}
