import { prisma } from "@/lib/prisma";
import { progressBroadcaster } from "../telemetry/progress-stream";
import { promises as fs } from "fs";
import { createLogger } from "@/lib/logger";

const log = createLogger("UploadJobQueue");

export interface CreateJobParams {
  userId: string;
  fileName: string;
  fileSize: number;
  tempFilePath: string;
  parentId?: string;
}

export class UploadJobQueue {
  static cancelledJobs = new Set<string>();

  /**
   * Register a new upload job in the queue database.
   */
  static async createJob(params: CreateJobParams) {
    const job = await prisma.uploadJob.create({
      data: {
        userId: params.userId,
        fileName: params.fileName,
        fileSize: BigInt(params.fileSize),
        tempFilePath: params.tempFilePath,
        status: "queued",
        parentId: params.parentId || null,
      },
    });

    log.info("Upload job registered in queue", { jobId: job.id, fileName: job.fileName, parentId: job.parentId });
    return job;
  }

  /**
   * Retrieve the next queued job available for processing.
   */
  static async getNextJob() {
    return prisma.uploadJob.findFirst({
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
   * Offloads blocking database writes during in-flight chunk streams to ensure maximum network throughput.
   */
  static async updateJobProgress(jobId: string, percent: number, uploadedBytes: number, speed: string, eta: string) {
    // Broadcast live to SSE listeners in-memory instantly (zero DB bottleneck!)
    progressBroadcaster.broadcast(jobId, {
      jobId,
      status: "processing",
      percent,
      uploadedBytes,
      totalBytes: 0, // Injected downstream based on file size
      speed,
      eta,
    });
  }

  /**
   * Transition job to successfully completed. Removes the temporary disk file.
   */
  static async completeJob(jobId: string) {
    this.cancelledJobs.delete(jobId);

    const job = await prisma.uploadJob.update({
      where: { id: jobId },
      data: {
        status: "completed",
        progress: 100,
      },
    });

    log.info("Upload job successfully completed", { jobId });

    // Clean up temporary file safely
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
    const job = await prisma.uploadJob.findUnique({
      where: { id: jobId },
    });

    if (!job) return;

    this.cancelledJobs.delete(jobId);

    // If already cancelled or requested cancel, make sure it stays cancelled
    if (job.status === "cancelled" || error.message === "Upload cancelled") {
      const updatedJob = await prisma.uploadJob.update({
        where: { id: jobId },
        data: {
          status: "cancelled",
          errorMessage: error.message || "Upload cancelled",
        },
      });
      await this.cleanupTempFile(job.tempFilePath);

      progressBroadcaster.broadcast(jobId, {
        jobId,
        status: "cancelled",
        percent: job.progress,
        uploadedBytes: Number(job.uploadedBytes),
        totalBytes: Number(job.fileSize),
        speed: "0 KB/s",
        eta: "--",
        errorMessage: error.message,
      });

      return updatedJob;
    }

    const nextRetry = job.retries + 1;
    const isFinalFailure = nextRetry >= job.maxRetries;
    const nextStatus = isFinalFailure ? "failed" : "queued";

    const updatedJob = await prisma.uploadJob.update({
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
    this.cancelledJobs.add(jobId);

    const job = await prisma.uploadJob.findUnique({
      where: { id: jobId },
    });

    if (!job || job.status === "completed" || job.status === "cancelled") return;

    await prisma.uploadJob.update({
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
