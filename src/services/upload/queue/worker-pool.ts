import { UploadJobQueue } from "./job-queue";
import { uploadToTelegramStream } from "../core/mtproto-uploader";
import { getClientForUser } from "@/services/telegram/telegram.service";
import { createTelegramClient } from "@/services/telegram/client";
import { decryptSession } from "@/services/crypto/crypto.service";
import { prisma } from "@/lib/prisma";
import { Api } from "telegram";
import bigInt from "big-integer";
import { createLogger } from "@/lib/logger";
// @ts-ignore
import ffmpegPath from "ffmpeg-static";
import { execFile } from "child_process";
import { promisify } from "util";
import { promises as fs } from "fs";
import path from "path";
import { SemanticSearchService } from "@/services/semantic-search/semantic-search.service";

const log = createLogger("UploadWorkerPool");
const execFilePromise = promisify(execFile);

async function compressVideoFile(inputPath: string): Promise<{ outputPath: string; finalSize: number }> {
  const outputPath = inputPath.replace("_compress_", "_compressed_");
  
  // Resolve ffmpeg binary path safely handling any Webpack CJS/ESM double default wrapping
  let resolvedFfmpegPath: any = null;
  try {
    resolvedFfmpegPath = require("ffmpeg-static");
  } catch {
    resolvedFfmpegPath = ffmpegPath;
  }

  let finalFfmpegPath = "";
  if (typeof resolvedFfmpegPath === "string") {
    finalFfmpegPath = resolvedFfmpegPath;
  } else if (resolvedFfmpegPath && typeof resolvedFfmpegPath === "object") {
    if (typeof resolvedFfmpegPath.default === "string") {
      finalFfmpegPath = resolvedFfmpegPath.default;
    } else if (resolvedFfmpegPath.default && typeof resolvedFfmpegPath.default.default === "string") {
      finalFfmpegPath = resolvedFfmpegPath.default.default;
    }
  }

  if (!finalFfmpegPath) {
    log.error("Failed to resolve valid FFmpeg static path", { rawValue: resolvedFfmpegPath });
    throw new Error("FFmpeg static binary path could not be resolved.");
  }

  log.info("Running video compression using resolved FFmpeg static binary", {
    binaryPath: finalFfmpegPath,
    input: inputPath,
    output: outputPath
  });

  // Run FFmpeg to compress the video. CRF 23 provides excellent size reduction with zero visible loss.
  // -preset medium provides a fast encoding speed with good compression. Preserves original audio quality.
  await execFilePromise(finalFfmpegPath, [
    "-i", inputPath,
    "-vcodec", "libx264",
    "-crf", "23",
    "-preset", "medium",
    "-acodec", "copy",
    "-y",
    outputPath
  ]);

  // Read the compressed file size
  const stat = await fs.stat(outputPath);
  const finalSize = stat.size;

  // Safely delete the original uncompressed file to preserve disk space
  try {
    await fs.unlink(inputPath);
  } catch {}

  return { outputPath, finalSize };
}

class UploadWorkerPool {
  private activeJobs = 0;
  private maxActiveJobs = 2; // Default queue concurrency limit
  private isPolling = false;
  private intervalId: NodeJS.Timeout | null = null;

  /**
   * Start the background polling system.
   */
  start() {
    if (this.isPolling) return;
    this.isPolling = true;
    log.info("Upload background worker pool started.");

    // Poll every 1 second
    this.intervalId = setInterval(() => {
      this.processQueue();
    }, 1000);
  }

  /**
   * Stop the background polling system.
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isPolling = false;
    log.info("Upload background worker pool stopped.");
  }

  /**
   * Process pending jobs in the queue up to concurrency limit.
   */
  private async processQueue() {
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

    // Process asynchronously to avoid blocking the queue poll loop
    this.processJob(job).finally(() => {
      this.activeJobs--;
      // Immediately trigger loop in case more jobs are ready
      this.processQueue();
    });
  }

  /**
   * Coordinates the actual file stream to Telegram and database persistence.
   */
  private async processJob(job: any) {
    let client: any = null;
    const clientPool: any[] = [];

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

      // 2. Connect primary client and instantiate multipath stream upload pool
      client = await getClientForUser(job.userId);
      clientPool.push(client);

      try {
        const userWithSession = await prisma.user.findUnique({
          where: { id: job.userId },
          select: {
            telegramSessionEncrypted: true,
            telegramSessionIv: true,
            telegramSessionAuthTag: true,
          },
        });
        if (
          userWithSession &&
          userWithSession.telegramSessionEncrypted &&
          userWithSession.telegramSessionIv &&
          userWithSession.telegramSessionAuthTag
        ) {
          const sessionString = decryptSession(
            userWithSession.telegramSessionEncrypted,
            userWithSession.telegramSessionIv,
            userWithSession.telegramSessionAuthTag
          );
          // Spawn 3 extra concurrent socket connections (total 4 parallel TCP pipes)
          const poolPromises = [];
          for (let i = 0; i < 3; i++) {
            const extraClient = createTelegramClient(sessionString);
            poolPromises.push(extraClient.connect().then(() => extraClient));
          }
          const extraConnected = await Promise.all(poolPromises);
          clientPool.push(...extraConnected);
          log.info("Initialized multipath TCP client pool successfully", { size: clientPool.length });
        }
      } catch (poolErr: any) {
        log.error("Failed to build parallel upload client pool, falling back to single client stream", poolErr);
      }

      const channelPeer = new Api.InputPeerChannel({
        channelId: bigInt(user.storageChannelId.toString()),
        accessHash: bigInt(user.storageChannelAccessHash),
      });

      // 2.5 Optional Video Compression stage
      let uploadFilePath = job.tempFilePath;
      let uploadFileSize = Number(job.fileSize);
      const isVideo = job.fileName.toLowerCase().match(/\.(mp4|mov|webm|mkv|avi)$/i);
      const hasCompressMarker = path.basename(job.tempFilePath).includes("_compress_");

      if (isVideo && hasCompressMarker) {
        log.info("Compressing video file to optimize size...", { jobId: job.id, file: job.fileName });
        
        // Update progress state in DB to let the user know we are compressing
        await prisma.uploadJob.update({
          where: { id: job.id },
          data: {
            errorMessage: "Compressing video...", // Reuse errorMessage temporarily as status description
          },
        });
        
        // Broadcast custom "compressing" status to SSE subscribers
        await UploadJobQueue.updateJobProgress(job.id, 0, 0, "Compressing...", "Calculating...");

        try {
          const { outputPath, finalSize } = await compressVideoFile(job.tempFilePath);
          
          // Double-check if the job got cancelled during the compression time window
          const checkCancelledJob = await prisma.uploadJob.findUnique({
            where: { id: job.id },
            select: { status: true },
          });

          if (checkCancelledJob && checkCancelledJob.status === "cancelled") {
            log.info("Job was cancelled during compression, cleaning up output file.", { jobId: job.id });
            try {
              await fs.unlink(outputPath);
            } catch {}
            throw new Error("Upload cancelled");
          }

          uploadFilePath = outputPath;
          uploadFileSize = finalSize;

          // Update the job record in database with the new compressed size!
          await prisma.uploadJob.update({
            where: { id: job.id },
            data: {
              fileSize: finalSize,
              errorMessage: null, // Clear compression status text
            },
          });
          
          log.info("Video compression completed successfully", {
            jobId: job.id,
            originalSize: job.fileSize,
            compressedSize: finalSize,
            savingPercent: `${Math.round((1 - finalSize / Number(job.fileSize)) * 100)}%`
          });
        } catch (compressErr: any) {
          if (compressErr.message === "Upload cancelled") {
            throw compressErr;
          }
          log.error("Video compression failed, falling back to original quality raw file", {
            jobId: job.id,
            error: compressErr.message,
            stack: compressErr.stack
          });
          // Restore errorMessage text if it was set
          await prisma.uploadJob.update({
            where: { id: job.id },
            data: { errorMessage: null },
          });
        }
      }

      log.debug("Uploading stream with concurrent sliding-window workers", {
        jobId: job.id,
        file: job.fileName,
      });

      // 3. Upload parts concurrently using the client TCP stream pool
      const inputFile = await uploadToTelegramStream({
        client: clientPool,
        jobId: job.id,
        filePath: uploadFilePath,
        fileName: job.fileName,
        fileSize: uploadFileSize,
        workers: 16, // High-performance 16-worker parallel pipeline saturating dual TCP connections
        checkCancelled: async () => {
          const currentJob = await prisma.uploadJob.findUnique({
            where: { id: job.id },
            select: { status: true },
          });
          return currentJob ? currentJob.status === "cancelled" : false;
        },
        onProgress: async (percent, uploadedBytes, speed, eta) => {
          await UploadJobQueue.updateJobProgress(job.id, percent, uploadedBytes, speed, eta);
        },
        checkCancelled: () => {
          return UploadJobQueue.cancelledJobs.has(job.id);
        },
      });

      // 4. Send document message to Telegram channel
      let mimeType = "application/octet-stream";
      const ext = job.fileName.split(".").pop()?.toLowerCase();
      if (ext === "png") mimeType = "image/png";
      else if (ext === "jpg" || ext === "jpeg") mimeType = "image/jpeg";
      else if (ext === "gif") mimeType = "image/gif";
      else if (ext === "webp") mimeType = "image/webp";
      else if (ext === "svg") mimeType = "image/svg+xml";
      else if (ext === "mp4") mimeType = "video/mp4";
      else if (ext === "webm") mimeType = "video/webm";
      else if (ext === "ogg") mimeType = "video/ogg";
      else if (ext === "mp3") mimeType = "audio/mpeg";
      else if (ext === "wav") mimeType = "audio/wav";
      else if (ext === "pdf") mimeType = "application/pdf";
      else if (ext === "zip") mimeType = "application/zip";
      else if (ext === "tar") mimeType = "application/x-tar";
      else if (ext === "rar") mimeType = "application/vnd.rar";
      else if (ext === "7z") mimeType = "application/x-7z-compressed";
      else if (ext === "txt") mimeType = "text/plain";
      else if (ext === "html") mimeType = "text/html";
      else if (ext === "css") mimeType = "text/css";
      else if (ext === "js") mimeType = "text/javascript";
      else if (ext === "json") mimeType = "application/json";

      // Always use the primary client for message registration to preserve message handlers
      const message = await client.sendFile(channelPeer, {
        file: inputFile,
        forceDocument: true,
      });

      if (!message || !message.id) {
        throw new Error("Telegram failed to register file message.");
      }

      // 5. Register file details in the main File table scoped to parent directory if applicable
      const fileRecord = await prisma.file.create({
        data: {
          userId: job.userId,
          telegramMessageId: message.id,
          fileName: job.fileName,
          fileSize: uploadFileSize,
          mimeType,
          parentId: job.parentId || null,
        },
      });

      // Generate and save semantic search embedding
      try {
        log.info("Generating semantic embedding for file", { fileId: fileRecord.id, fileName: job.fileName });
        let action: "image" | "video" | "file" = "file";
        if (mimeType.startsWith("image/")) {
          action = "image";
        } else if (mimeType.startsWith("video/")) {
          action = "video";
        }

        const embedding = await SemanticSearchService.generateEmbedding({
          action,
          filepath: job.tempFilePath,
          filename: job.fileName,
        });

        await SemanticSearchService.saveEmbedding(fileRecord.id, job.userId, embedding);
        log.info("Semantic embedding generated and saved successfully", { fileId: fileRecord.id });
      } catch (embedErr: any) {
        log.error("Failed to generate/save semantic embedding for file during upload", {
          fileId: fileRecord.id,
          error: embedErr.message,
        });
      }

      // 6. Complete job and clean up temp files
      await UploadJobQueue.completeJob(job.id, uploadFilePath);
    } catch (err: any) {
      log.error("Failed to process upload job", { jobId: job.id, error: err.message });
      await UploadJobQueue.failJob(job.id, err);
    } finally {
      // Clean up all Telegram Client socket resources in the pool safely
      for (const c of clientPool) {
        if (c) {
          try {
            await c.disconnect();
          } catch (discErr: any) {
            log.error("Failed to disconnect client from pool safely", { error: discErr.message });
          }
        }
      }
      log.debug("Telegram client pool fully disconnected to release socket resources.");
    }
  }
}

// Define global interface for typescript
declare global {
  var uploadWorkerPool: UploadWorkerPool | undefined;
}

// Global Singleton worker pool using globalThis pattern to avoid duplication in Next.js dev server
export const uploadWorkerPool = globalThis.uploadWorkerPool || new UploadWorkerPool();

if (process.env.NODE_ENV !== "production") {
  globalThis.uploadWorkerPool = uploadWorkerPool;
}
