import { execFile, spawn } from "child_process";
import path from "path";
import fs from "fs/promises";
import os from "os";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";
import { getClientForUser, downloadFileFromTelegram } from "@/services/telegram/telegram.service";

const log = createLogger("SemanticSearchService");

interface EmbedOptions {
  action: "image" | "video" | "text" | "file";
  filepath?: string;
  filename?: string;
  query?: string;
}

export class SemanticSearchService {
  private static serverStarting = false;
  private static serverRunning = false;

  public static async ensureServerRunning(): Promise<void> {
    if (this.serverRunning || this.serverStarting) return;
    this.serverStarting = true;

    try {
      // Perform a quick health check to see if the server is already running
      const response = await fetch("http://127.0.0.1:5001/embed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "text",
          query: "ping",
        }),
        signal: AbortSignal.timeout(200), // Quick timeout
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          log.info("CLIP Python server is already running and responsive.");
          this.serverRunning = true;
          this.serverStarting = false;
          return;
        }
      }
    } catch (err: any) {
      log.debug("CLIP Python server not responding to ping, will attempt to spawn.", { message: err.message });
    }

    try {
      log.info("Attempting to start CLIP Python embedding server in the background...");
      const scriptPath = path.join(process.cwd(), "semantic_search", "server.py");
      
      // Spawn background detached server process
      const serverProcess = spawn("python3", [scriptPath, "--port", "5001"], {
        detached: true,
        stdio: "ignore",
      });
      serverProcess.unref();
      log.info("CLIP Python embedding server spawned in the background.");
    } catch (err: any) {
      log.error("Failed to spawn CLIP Python embedding server", { error: err.message });
    } finally {
      // Cooldown to prevent multiple spawn attempts in quick succession
      setTimeout(() => {
        this.serverStarting = false;
      }, 5000);
    }
  }

  /**
   * Spawns the python3 embed.py script to generate a normalized CLIP embedding vector.
   */
  static async generateEmbedding(options: EmbedOptions): Promise<number[]> {
    const cliAction = options.action === "file" ? "text" : options.action;
    const query = options.action === "file" ? (options.filename || "") : (options.query || "");

    // Preemptively ensure the server is running (non-blocking)
    this.ensureServerRunning().catch(() => {});

    // 1. Try querying the persistent local server
    try {
      const response = await fetch("http://127.0.0.1:5001/embed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: cliAction,
          filepath: options.filepath,
          filename: options.filename,
          query,
        }),
        signal: AbortSignal.timeout(1500), // Max 1.5 seconds wait time
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.embedding) {
          log.debug("Generated embedding using persistent server successfully.");
          this.serverRunning = true;
          return result.embedding;
        }
      }
    } catch (fetchErr: any) {
      log.debug("CLIP Python server not active or failed, falling back to CLI.", { message: fetchErr.message });
      this.serverRunning = false;
      // Self-heal: Start the background server so next query is fast
      this.ensureServerRunning().catch(() => {});
    }

    // 2. Fallback: Spawn CLI process if server is down/unresponsive
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(process.cwd(), "semantic_search", "embed.py");
      const args: string[] = [scriptPath, "--action", cliAction];

      if (options.filepath && options.action !== "file") {
        args.push("--filepath", options.filepath);
      }
      if (options.filename) {
        args.push("--filename", options.filename);
      }
      if (options.action === "file") {
        args.push("--query", options.filename || "");
      } else if (options.query) {
        args.push("--query", options.query);
      }

      log.warn("Spawning CLI backup for CLIP Python embedding generator", { args });

      // Max buffer size set to 10MB to handle large outputs if needed (though vector JSON is small)
      execFile("python3", args, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
        if (error) {
          log.error("CLIP CLI execution failed. Stderr:", { stderr });
          return reject(new Error(`CLIP Embedding generation failed: ${error.message}`));
        }

        try {
          const result = JSON.parse(stdout.trim());
          if (!result.success || !result.embedding) {
            return reject(new Error(result.error || "No embedding in CLI output"));
          }
          resolve(result.embedding);
        } catch (parseError) {
          log.error("Failed to parse CLIP CLI output", { stdout, stderr });
          reject(new Error(`Failed to parse CLIP CLI output: ${(parseError as Error).message}`));
        }
      });
    });
  }

  /**
   * Saves or updates a file's embedding in PostgreSQL.
   */
  static async saveEmbedding(fileId: string, userId: string, embedding: number[]): Promise<void> {
    await prisma.fileEmbedding.upsert({
      where: { fileId },
      update: { embedding },
      create: { fileId, userId, embedding },
    });
  }

  /**
   * Retrieves all file embeddings belonging to a specific user.
   */
  static async getUserEmbeddings(userId: string) {
    return prisma.fileEmbedding.findMany({
      where: { userId },
      include: {
        file: true,
      },
    });
  }
  private static activeBackfills = new Set<string>();

  /**
   * Identifies all existing files without embeddings for the user,
   * downloads them, generates their embeddings, and upserts them.
   */
  static async backfillEmbeddingsForUser(userId: string, force = false) {
    if (this.activeBackfills.has(userId)) {
      log.info("Backfill already in progress for user", { userId });
      return { success: true, processed: 0, failed: 0, status: "already_running" };
    }

    this.activeBackfills.add(userId);
    try {
      log.info("Starting background semantic search embedding backfill for user", { userId, force });

      const filesToBackfill = await prisma.file.findMany({
        where: {
          userId,
          mimeType: { not: "folder" },
          isDeleted: false,
          ...(force ? {} : { embedding: null }),
        },
      });

      if (filesToBackfill.length === 0) {
        log.info("No files need embedding backfill for user", { userId });
        return { success: true, processed: 0, failed: 0 };
      }

      log.info(`Found ${filesToBackfill.length} files requiring backfill for user`, { userId });

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          storageChannelId: true,
          storageChannelAccessHash: true,
        },
      });

      if (!user || !user.storageChannelId || !user.storageChannelAccessHash) {
        log.error("Missing storage channel configuration for user", { userId });
        throw new Error("Missing storage channel configuration.");
      }

      let client;
      try {
        client = await getClientForUser(userId);
      } catch (clientErr: any) {
        log.error("Failed to get Telegram client for backfill", { userId, error: clientErr.message });
        throw clientErr;
      }

      let processedCount = 0;
      let failedCount = 0;

      for (const file of filesToBackfill) {
        let tempFilePath = "";
        try {
          log.info("Backfilling file embedding", { fileId: file.id, fileName: file.fileName });

          // 1. Download file buffer from Telegram
          const buffer = await downloadFileFromTelegram(
            client,
            user.storageChannelId,
            user.storageChannelAccessHash,
            file.telegramMessageId
          );

          // 2. Write to a temporary file
          const safeName = `backfill_${file.id}_${file.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
          tempFilePath = path.join(os.tmpdir(), safeName);
          await fs.writeFile(tempFilePath, buffer);

          // 3. Determine action type
          let action: "image" | "video" | "file" = "file";
          if (file.mimeType.startsWith("image/")) {
            action = "image";
          } else if (file.mimeType.startsWith("video/")) {
            action = "video";
          }

          // 4. Generate embedding
          const embedding = await this.generateEmbedding({
            action,
            filepath: tempFilePath,
            filename: file.fileName,
          });

          // 5. Save embedding
          await this.saveEmbedding(file.id, userId, embedding);
          processedCount++;
          log.info("Successfully backfilled embedding for file", { fileId: file.id });
        } catch (err: any) {
          failedCount++;
          log.error("Failed to backfill embedding for file", {
            fileId: file.id,
            fileName: file.fileName,
            error: err.message,
          });
        } finally {
          if (tempFilePath) {
            await fs.unlink(tempFilePath).catch((unlinkErr) => {
              log.warn("Failed to delete temp file during backfill", {
                path: tempFilePath,
                error: unlinkErr.message,
              });
            });
          }
        }
      }

      // Disconnect client to release socket resources
      try {
        await client.disconnect();
      } catch (discErr: any) {
        log.error("Failed to disconnect client after backfill", { error: discErr.message });
      }

      return {
        success: true,
        processed: processedCount,
        failed: failedCount,
      };
    } finally {
      this.activeBackfills.delete(userId);
    }
  }

  static dotProduct(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
    }
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += a[i] * b[i];
    }
    return sum;
  }

  static getDynamicThreshold(matches: { similarity: number }[]): number {
    const FLOOR = 0.23;
    if (matches.length === 0) {
      return FLOOR;
    }

    const scores = matches.map((m) => m.similarity);
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);

    // 1. Absolute Exclude Floor: If the best match is extremely low, nothing matches
    if (maxScore < FLOOR) {
      return 0.35; // High threshold to filter out everything
    }

    // 2. Keep-All Rule: If even the worst match is a highly confident match (>= FLOOR),
    // then the entire database is related. Show everything.
    if (minScore >= FLOOR) {
      return FLOOR;
    }

    // 3. Small Range Rule: If all scores are clustered very tightly (range < 0.05)
    if (maxScore - minScore < 0.05) {
      return maxScore >= FLOOR ? FLOOR : 0.35;
    }

    // 4. 1D K-Means / Otsu's Split: Find the split that maximizes inter-class variance
    const sortedScores = [...scores].sort((a, b) => b - a);
    let bestThreshold = FLOOR;
    let maxVariance = -1;

    for (let i = 1; i < sortedScores.length; i++) {
      const left = sortedScores.slice(0, i);
      const right = sortedScores.slice(i);

      const wL = left.length / sortedScores.length;
      const wR = right.length / sortedScores.length;

      const meanL = left.reduce((a, b) => a + b, 0) / left.length;
      const meanR = right.reduce((a, b) => a + b, 0) / right.length;

      const variance = wL * wR * Math.pow(meanL - meanR, 2);
      if (variance > maxVariance) {
        maxVariance = variance;
        bestThreshold = (left[left.length - 1] + right[0]) / 2;
      }
    }

    // Enforce CLIP bounds for maximum safety and recall:
    bestThreshold = Math.max(FLOOR, bestThreshold);
    bestThreshold = Math.min(bestThreshold, maxScore - 0.04);
    bestThreshold = Math.max(FLOOR, bestThreshold);

    return bestThreshold;
  }

  static async searchImages(
    userId: string,
    query: string
  ): Promise<{ threshold: number; files: any[] }> {
    // 1. Generate text embedding for the search query
    log.info("Generating CLIP embedding for search query", { query });
    const queryEmbedding = await this.generateEmbedding({
      action: "text",
      query: query.trim(),
    });

    // 2. Fetch all file embeddings for the user from PostgreSQL, filtering for images only
    const userEmbeddings = await prisma.fileEmbedding.findMany({
      where: {
        userId,
        file: {
          mimeType: {
            startsWith: "image/",
          },
        },
      },
      include: {
        file: true,
      },
    });

    if (userEmbeddings.length === 0) {
      return { threshold: 0.23, files: [] };
    }

    // 3. Compute dot product similarity (equivalent to cosine similarity for normalized L2 vectors)
    const matches = userEmbeddings
      .filter((emb) => !emb.file.isDeleted)
      .map((emb) => {
        let similarity = 0;
        try {
          similarity = this.dotProduct(queryEmbedding, emb.embedding);
        } catch (err: any) {
          log.error("Dot product calculation failed", { fileId: emb.fileId, error: err.message });
        }
        return {
          id: emb.file.id,
          userId: emb.file.userId,
          telegramMessageId: Number(emb.file.telegramMessageId),
          fileName: emb.file.fileName,
          fileSize: Number(emb.file.fileSize),
          mimeType: emb.file.mimeType,
          isDeleted: emb.file.isDeleted,
          parentId: emb.file.parentId,
          createdAt: emb.file.createdAt.toISOString(),
          updatedAt: emb.file.updatedAt.toISOString(),
          similarity,
        };
      });

    // 4. Calculate dynamic threshold
    const threshold = this.getDynamicThreshold(matches);
    log.debug("Otsu dynamic threshold calculated", { threshold, totalFiles: matches.length });

    // 5. Filter and rank files based on threshold
    const rankedFiles = matches
      .filter((m) => m.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity);

    return {
      threshold,
      files: rankedFiles,
    };
  }
}
