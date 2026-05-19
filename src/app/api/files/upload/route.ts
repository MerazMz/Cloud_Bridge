import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { getCurrentUserId } from "@/services/auth/auth.service";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";
import {
  getClientForUser,
  uploadFileToTelegram,
} from "@/services/telegram/telegram.service";
import type { TelegramClient } from "telegram";

const log = createLogger("API:files:upload");

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let client: TelegramClient | null = null;

  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return errorResponse("Not authenticated.", 401);
    }

    // Get user storage channel information
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        storageChannelId: true,
        storageChannelAccessHash: true,
      },
    });

    if (!user || !user.storageChannelId || !user.storageChannelAccessHash) {
      return errorResponse(
        "Storage channel is not set up. Please refresh your dashboard.",
        400
      );
    }

    // Parse the uploaded file from the request
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return errorResponse("No file provided in request.", 400);
    }

    const fileName = file.name || "unnamed_file";
    const fileSize = file.size;
    const mimeType = file.type || "application/octet-stream";

    log.info("Processing file upload", { fileName, fileSize, mimeType });

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Get Telegram client
    client = await getClientForUser(userId);

    // Upload to Telegram channel
    const messageId = await uploadFileToTelegram(
      client,
      user.storageChannelId,
      user.storageChannelAccessHash,
      fileBuffer,
      fileName
    );

    // Store in DB
    const dbFile = await prisma.file.create({
      data: {
        userId,
        telegramMessageId: messageId,
        fileName,
        fileSize: BigInt(fileSize),
        mimeType,
      },
    });

    log.info("File successfully registered in database", { fileId: dbFile.id });

    return successResponse(
      {
        id: dbFile.id,
        fileName: dbFile.fileName,
        fileSize: Number(dbFile.fileSize),
        mimeType: dbFile.mimeType,
        createdAt: dbFile.createdAt.toISOString(),
      },
      "File uploaded successfully."
    );
  } catch (error) {
    log.error("Failed to upload file", error);
    const message = error instanceof Error ? error.message : "Failed to upload file.";
    return errorResponse(message, 500);
  } finally {
    if (client) {
      try {
        await client.disconnect();
      } catch {
        // Ignore disconnect errors
      }
    }
  }
}
