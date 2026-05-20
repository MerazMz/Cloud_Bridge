import { UploadJobQueue } from "./job-queue";
import { uploadToTelegramStream } from "../core/mtproto-uploader";
import { getClientForUser } from "@/services/telegram/telegram.service";
import { prisma } from "@/lib/prisma";
import { Api } from "telegram";
import bigInt from "big-integer";
import { createLogger } from "@/lib/logger";

const log = createLogger("UploadWorkerPool");

class UploadWorkerPool {
  private activeJobs = 0;
  private maxActiveJobs = 2; // Default queue concurrency limit
  private isRunning = false;

  /**
   * Start the background worker system.
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    log.info("Upload background worker pool started.");

    // Perform an initial startup check to pick up any left-over queued/retry jobs!
    this.triggerCheck();
  }

  /**
   * Stop the background worker system.
   */
  stop() {
    this.isRunning = false;
    log.info("Upload background worker pool stopped.");
  }

  /**
   * Public trigger to execute a queue check immediately and asynchronously.
   * Completely replaces high-frequency setInterval polling.
   */
  triggerCheck() {
    if (!this.isRunning) return;
    setTimeout(() => {
      this.processQueue().catch((err) => {
        log.error("Error in triggerCheck processing queue", { err: err.message });
      });
    }, 0);
  }

  /**
   * Process pending jobs in the queue up to concurrency limit.
   */
  private async processQueue() {
    if (!this.isRunning) return;
    if (this.activeJobs >= this.maxActiveJobs) return;

    const job = await UploadJobQueue.getNextJob();
    if (!job) return;

    this.activeJobs++;
    
    // Set status to processing immediately so no other worker picks it up
    await prisma.uploadJob.update({
      where: { id: job.id },
      data: { status: "processing" },
    });

    log.info("Picked up job for processing", { jobId: job.id, file: job.fileName });

    // Process asynchronously to avoid blocking the queue loop
    this.processJob(job).finally(() => {
      this.activeJobs--;
      // Immediately trigger next check to process consecutive queued tasks
      this.triggerCheck();
    });
  }

  /**
   * Coordinates the actual file stream to Telegram and database persistence.
   */
  private async processJob(job: any) {
    let client: any = null;

    try {
      // 1. Fetch user data and storage channel credentials
      const user = await prisma.user.findUnique({
        where: { id: job.userId },
        select: {
          storageChannelId: true,
          storageChannelAccessHash: true,
        },
      });

      if (!user || !user.storageChannelId || !user.storageChannelAccessHash) {
        throw new Error("User does not have an active Telegram storage channel configured.");
      }

      // 2. Connect client and instantiate stream upload
      client = await getClientForUser(job.userId);

      const channelPeer = new Api.InputPeerChannel({
        channelId: bigInt(user.storageChannelId.toString()),
        accessHash: bigInt(user.storageChannelAccessHash),
      });

      log.debug("Uploading stream with concurrent sliding-window workers", {
        jobId: job.id,
        file: job.fileName,
      });

      // 3. Upload parts concurrently
      const inputFile = await uploadToTelegramStream({
        client,
        jobId: job.id,
        filePath: job.tempFilePath,
        fileName: job.fileName,
        fileSize: Number(job.fileSize),
        workers: 8, // Aggressive 8-worker parallel pipeline
        onProgress: async (percent, uploadedBytes, speed, eta) => {
          await UploadJobQueue.updateJobProgress(job.id, percent, uploadedBytes, speed, eta);
        },
      });

      // 4. Send document message to Telegram channel
      const message = await client.sendFile(channelPeer, {
        file: inputFile,
        forceDocument: true,
      });

      if (!message || !message.id) {
        throw new Error("Telegram failed to register file message.");
      }

      // 5. Register file details in the main File table
      await prisma.file.create({
        data: {
          userId: job.userId,
          telegramMessageId: message.id,
          fileName: job.fileName,
          fileSize: job.fileSize,
          mimeType: job.mimeType || "application/octet-stream",
        },
      });

      // 6. Complete job and clean up temp files
      await UploadJobQueue.completeJob(job.id);
    } catch (err: any) {
      log.error("Failed to process upload job", { jobId: job.id, error: err.message });
      await UploadJobQueue.failJob(job.id, err);
    } finally {
      // Clean up Telegram Client socket resources
      if (client) {
        try {
          await client.disconnect();
          log.debug("Telegram client disconnected to release resource buffers.", { userId: job.userId });
        } catch (discErr: any) {
          log.error("Failed to disconnect client safely", { discErr: discErr.message });
        }
      }
    }
  }
}

// Global Singleton worker pool
export const uploadWorkerPool = new UploadWorkerPool();
