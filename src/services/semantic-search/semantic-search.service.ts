import path from "path";
import fs from "fs/promises";
import os from "os";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";
import { getEnv } from "@/lib/env";
import { getClientForUser, downloadFileFromTelegram } from "@/services/telegram/telegram.service";

const log = createLogger("SemanticSearchService");

interface EmbedOptions {
  action: "image" | "video" | "text" | "file";
  filepath?: string;
  filename?: string;
  query?: string;
}

export class SemanticSearchService {
  /**
   * Generates a normalized CLIP embedding vector using the Hugging Face Space API.
   */
  /**
   * Generates a normalized CLIP embedding vector, optional BLIP caption, and extracts faces using the Hugging Face Space API.
   */
  static async generateEmbedding(options: EmbedOptions): Promise<{
    embedding: number[];
    caption?: string;
    faces?: Array<{ box: number[]; embedding: number[] }>;
  }> {
    const cliAction = options.action === "file" ? "text" : options.action;
    const query = options.action === "file" ? (options.filename || "") : (options.query || "");

    const env = getEnv();
    const searchUrl = env.SEMANTIC_SEARCH_URL || "https://bhawya12-clip-space-api.hf.space/embed";

    // Read the file and convert it to Base64 if a filepath is provided
    let fileData: string | undefined = undefined;
    if (options.filepath) {
      try {
        const buffer = await fs.readFile(options.filepath);
        fileData = buffer.toString("base64");
      } catch (err: any) {
        log.warn("Failed to read file for base64 encoding", { filepath: options.filepath, error: err.message });
      }
    }

    try {
      log.debug("Sending embedding request to server", { url: searchUrl, action: cliAction, filename: options.filename });
      const response = await fetch(searchUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: cliAction,
          filepath: options.filepath,
          filename: options.filename,
          fileData,
          query,
        }),
        signal: AbortSignal.timeout(30000), // Allow 30 seconds for remote Space API wakeup or video frame extraction
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        throw new Error(`HTTP error ${response.status}: ${errText}`);
      }

      const result = await response.json();
      if (!result.success || !result.embedding) {
        throw new Error(result.error || "No embedding in API response");
      }

      log.debug("Generated embedding successfully from server", { url: searchUrl, hasCaption: !!result.caption, faceCount: result.faces?.length || 0 });
      return {
        embedding: result.embedding,
        caption: result.caption,
        faces: result.faces,
      };
    } catch (err: any) {
      log.error("Failed to generate CLIP embedding", err, { url: searchUrl });
      throw err;
    }
  }

  /**
   * Saves or updates a file's embedding, optional BLIP caption, and any detected faces in PostgreSQL.
   */
  static async saveEmbedding(
    fileId: string,
    userId: string,
    embedding: number[],
    caption?: string,
    faces?: Array<{ box: number[]; embedding: number[] }>
  ): Promise<void> {
    await prisma.$transaction([
      prisma.fileEmbedding.upsert({
        where: { fileId },
        update: { embedding },
        create: { fileId, userId, embedding },
      }),
      ...(caption ? [
        prisma.file.update({
          where: { id: fileId },
          data: { caption },
        })
      ] : [])
    ]);

    // If faces are detected, cluster them and save them
    if (faces && faces.length > 0) {
      try {
        const { FaceClusteringService } = await import("@/services/face-clustering/face-clustering.service");
        for (const face of faces) {
          // Find or create a matching Person group for the face embedding
          const personId = await FaceClusteringService.clusterFace(userId, face.embedding);
          
          const createdFace = await prisma.fileFace.create({
            data: {
              fileId,
              userId,
              box: face.box,
              embedding: face.embedding,
              personId,
            }
          });

          // Proactively set this face as the Person group's cover image if they don't have one
          await FaceClusteringService.ensurePersonHasCover(personId, createdFace.id);
        }
        log.info(`Extracted and grouped ${faces.length} faces for file`, { fileId });
      } catch (err: any) {
        log.error("Failed to group/save faces for file", { fileId, error: err.message });
      }
    }
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
        log.error("Missing storage channel configuration for user", undefined, { userId });
        throw new Error("Missing storage channel configuration.");
      }

      let client;
      try {
        client = await getClientForUser(userId);
      } catch (clientErr: any) {
        log.error("Failed to get Telegram client for backfill", clientErr, { userId });
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
          const { embedding, caption, faces } = await this.generateEmbedding({
            action,
            filepath: tempFilePath,
            filename: file.fileName,
          });

          // 5. Save embedding
          await this.saveEmbedding(file.id, userId, embedding, caption, faces);
          processedCount++;
          log.info("Successfully backfilled embedding for file", { fileId: file.id });
        } catch (err: any) {
          failedCount++;
          log.error("Failed to backfill embedding for file", err, {
            fileId: file.id,
            fileName: file.fileName,
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
        log.error("Failed to disconnect client after backfill", discErr);
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
    const { embedding: queryEmbedding } = await this.generateEmbedding({
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

    const queryLower = query.trim().toLowerCase();
    // 3. Compute dot product similarity (equivalent to cosine similarity for normalized L2 vectors)
    const matches = userEmbeddings
      .filter((emb) => !emb.file.isDeleted)
      .map((emb) => {
        let similarity = 0;
        try {
          similarity = this.dotProduct(queryEmbedding, emb.embedding);

          // Hybrid Search: Apply a similarity boost (+0.15) if the query matches the BLIP caption
          if (emb.file.caption) {
            const captionLower = emb.file.caption.toLowerCase();
            if (captionLower.includes(queryLower)) {
              similarity = Math.min(1.0, similarity + 0.15);
            }
          }
        } catch (err: any) {
          log.error("Dot product calculation failed", err, { fileId: emb.fileId });
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
          caption: emb.file.caption,
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
