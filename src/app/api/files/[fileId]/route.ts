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

    // Read query parameters
    const urlParams = new URL(request.url);
    const isPreview = urlParams.searchParams.get("preview") === "true";

    const contentDisposition = isPreview
      ? "inline"
      : `attachment; filename="${encodeURIComponent(file.fileName)}"`;

    // Return the file content with standard headers
    return new NextResponse(fileBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": file.mimeType,
        "Content-Length": fileBuffer.length.toString(),
        "Content-Disposition": contentDisposition,
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

    // Read query parameters
    const url = new URL(request.url);
    const permanent = url.searchParams.get("permanent") === "true";

    if (permanent) {
      // Permanent Delete: remove from Telegram and database
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
        log.warn("Telegram file deletion failed or file already deleted, cleaning up from DB", {
          error: telegramError,
        });
      }

      // Delete metadata from DB
      await prisma.file.delete({
        where: { id: fileId },
      });

      log.info("File permanently deleted from Telegram and database", { fileId });
      return successResponse(null, "File permanently deleted.");
    } else {
      // Soft Delete: just update database isDeleted flag
      await prisma.file.update({
        where: { id: fileId },
        data: { isDeleted: true },
      });

      log.info("File soft deleted (moved to trash)", { fileId });
      return successResponse(null, "File moved to trash successfully.");
    }
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;
    const userId = await getCurrentUserId();
    if (!userId) {
      return errorResponse("Not authenticated.", 401);
    }

    const file = await prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      return errorResponse("File not found.", 404);
    }

    if (file.userId !== userId) {
      return errorResponse("Unauthorized.", 403);
    }

    const body = await request.json();
    const isDeleted = typeof body.isDeleted === "boolean" ? body.isDeleted : false;

    const updatedFile = await prisma.file.update({
      where: { id: fileId },
      data: { isDeleted },
    });

    log.info("File status updated", { fileId, isDeleted });

    return successResponse(
      {
        id: updatedFile.id,
        fileName: updatedFile.fileName,
        fileSize: Number(updatedFile.fileSize),
        mimeType: updatedFile.mimeType,
        isDeleted: updatedFile.isDeleted,
        createdAt: updatedFile.createdAt.toISOString(),
      },
      "File updated successfully."
    );
  } catch (error) {
    log.error("Failed to update file", error);
    return errorResponse("Failed to update file.", 500);
  }
}
