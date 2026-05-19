import { NextRequest, NextResponse } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { getCurrentUserId } from "@/services/auth/auth.service";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";
import {
  getClientForUser,
  downloadFileFromTelegram,
  deleteFileFromTelegram,
} from "@/services/telegram/telegram.service";
import type { TelegramClient } from "telegram";

const log = createLogger("API:files:detail");

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  let client: TelegramClient | null = null;

  try {
    const { fileId } = await params;
    const userId = await getCurrentUserId();
    if (!userId) {
      return errorResponse("Not authenticated.", 401);
    }

    // Retrieve file metadata from DB
    const file = await prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      return errorResponse("File not found.", 404);
    }

    if (file.userId !== userId) {
      return errorResponse("Unauthorized.", 403);
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
      return errorResponse("Storage channel configuration is missing.", 400);
    }

    // Restore Telegram Client
    client = await getClientForUser(userId);

    // Download file buffer
    const fileBuffer = await downloadFileFromTelegram(
      client,
      user.storageChannelId,
      user.storageChannelAccessHash,
      file.telegramMessageId
    );

    // Return the file content with standard download headers
    return new NextResponse(fileBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": file.mimeType,
        "Content-Length": fileBuffer.length.toString(),
        "Content-Disposition": `attachment; filename="${encodeURIComponent(
          file.fileName
        )}"`,
      },
    });
  } catch (error) {
    log.error("Failed to download file", error);
    const message =
      error instanceof Error ? error.message : "Failed to download file.";
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  let client: TelegramClient | null = null;

  try {
    const { fileId } = await params;
    const userId = await getCurrentUserId();
    if (!userId) {
      return errorResponse("Not authenticated.", 401);
    }

    // Retrieve file metadata from DB
    const file = await prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      return errorResponse("File not found.", 404);
    }

    if (file.userId !== userId) {
      return errorResponse("Unauthorized.", 403);
    }

    // Get user storage channel info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        storageChannelId: true,
        storageChannelAccessHash: true,
      },
    });

    if (!user || !user.storageChannelId || !user.storageChannelAccessHash) {
      return errorResponse("Storage channel configuration is missing.", 400);
    }

    // Restore Telegram client
    client = await getClientForUser(userId);

    // Delete message from Telegram
    try {
      await deleteFileFromTelegram(
        client,
        user.storageChannelId,
        user.storageChannelAccessHash,
        file.telegramMessageId
      );
    } catch (telegramError) {
      // Log the error but proceed with DB deletion so the UI stays in sync if the message was already deleted manually
      log.warn("Telegram file deletion failed or file already deleted, cleaning up from DB", {
        error: telegramError,
      });
    }

    // Delete metadata from DB
    await prisma.file.delete({
      where: { id: fileId },
    });

    log.info("File successfully deleted from database", { fileId });

    return successResponse(null, "File deleted successfully.");
  } catch (error) {
    log.error("Failed to delete file", error);
    const message =
      error instanceof Error ? error.message : "Failed to delete file.";
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
