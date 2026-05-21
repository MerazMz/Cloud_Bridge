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

    // Resolve dynamic Content-Type and Content-Disposition to enable inline browser rendering
    let resolvedMime = file.mimeType;
    if (resolvedMime === "application/octet-stream" || !resolvedMime) {
      const ext = file.fileName.split(".").pop()?.toLowerCase();
      if (ext === "png") resolvedMime = "image/png";
      else if (ext === "jpg" || ext === "jpeg") resolvedMime = "image/jpeg";
      else if (ext === "gif") resolvedMime = "image/gif";
      else if (ext === "webp") resolvedMime = "image/webp";
      else if (ext === "svg") resolvedMime = "image/svg+xml";
      else if (ext === "mp4") resolvedMime = "video/mp4";
      else if (ext === "webm") resolvedMime = "video/webm";
      else if (ext === "ogg") resolvedMime = "video/ogg";
      else if (ext === "mp3") resolvedMime = "audio/mpeg";
      else if (ext === "wav") resolvedMime = "audio/wav";
      else if (ext === "pdf") resolvedMime = "application/pdf";
      else if (ext === "zip") resolvedMime = "application/zip";
      else if (ext === "tar") resolvedMime = "application/x-tar";
      else if (ext === "rar") resolvedMime = "application/vnd.rar";
      else if (ext === "7z") resolvedMime = "application/x-7z-compressed";
      else if (ext === "txt") resolvedMime = "text/plain";
      else if (ext === "html") resolvedMime = "text/html";
      else if (ext === "css") resolvedMime = "text/css";
      else if (ext === "js") resolvedMime = "text/javascript";
      else if (ext === "json") resolvedMime = "application/json";
    }

    const isPreviewable = 
      resolvedMime.startsWith("image/") || 
      resolvedMime.startsWith("video/") || 
      resolvedMime.startsWith("audio/") || 
      resolvedMime === "application/pdf";

    const disposition = isPreviewable 
      ? "inline" 
      : `attachment; filename="${encodeURIComponent(file.fileName)}"`;

    // Return the file content with standard download headers
    return new NextResponse(fileBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": resolvedMime,
        "Content-Length": fileBuffer.length.toString(),
        "Content-Disposition": disposition,
        "Cache-Control": "public, max-age=31536000, immutable",
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

async function getNestedFiles(folderId: string): Promise<any[]> {
  let results: any[] = [];
  const children = await prisma.file.findMany({
    where: { parentId: folderId },
  });
  for (const child of children) {
    if (child.mimeType === "folder") {
      const nested = await getNestedFiles(child.id);
      results = [...results, ...nested];
    } else {
      results.push(child);
    }
  }
  return results;
}

async function recursivelySoftDelete(folderId: string) {
  await prisma.file.update({
    where: { id: folderId },
    data: { isDeleted: true },
  });

  const children = await prisma.file.findMany({
    where: { parentId: folderId },
  });

  for (const child of children) {
    if (child.mimeType === "folder") {
      await recursivelySoftDelete(child.id);
    } else {
      await prisma.file.update({
        where: { id: child.id },
        data: { isDeleted: true },
      });
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
      if (file.mimeType === "folder") {
        // Find all nested files to delete from Telegram first
        const nestedFiles = await getNestedFiles(fileId);

        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            storageChannelId: true,
            storageChannelAccessHash: true,
          },
        });

        if (user && user.storageChannelId && user.storageChannelAccessHash && nestedFiles.length > 0) {
          try {
            client = await getClientForUser(userId);
            for (const nestedFile of nestedFiles) {
              try {
                await deleteFileFromTelegram(
                  client,
                  user.storageChannelId,
                  user.storageChannelAccessHash,
                  nestedFile.telegramMessageId
                );
              } catch (telegramError) {
                log.warn("Telegram file deletion failed for nested file", {
                  fileId: nestedFile.id,
                  error: telegramError,
                });
              }
            }
          } catch (clientErr) {
            log.error("Failed to restore Telegram client for nested files deletion", clientErr);
          }
        }

        // Direct database deletion for virtual folders (cascades sub-files automatically in DB)
        await prisma.file.delete({
          where: { id: fileId },
        });
        log.info("Folder and its children permanently deleted from database and Telegram.", { fileId });
        return successResponse(null, "Folder permanently deleted.");
      }

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
      if (file.mimeType === "folder") {
        await recursivelySoftDelete(fileId);
        log.info("Folder and its children soft deleted (moved to trash)", { fileId });
      } else {
        // Soft Delete: just update database isDeleted flag
        await prisma.file.update({
          where: { id: fileId },
          data: { isDeleted: true },
        });
        log.info("File soft deleted (moved to trash)", { fileId });
      }

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

async function recursivelyRestore(folderId: string) {
  await prisma.file.update({
    where: { id: folderId },
    data: { isDeleted: false },
  });

  const children = await prisma.file.findMany({
    where: { parentId: folderId },
  });

  for (const child of children) {
    if (child.mimeType === "folder") {
      await recursivelyRestore(child.id);
    } else {
      await prisma.file.update({
        where: { id: child.id },
        data: { isDeleted: false },
      });
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

    let updatedFile;
    if (!isDeleted && file.mimeType === "folder") {
      await recursivelyRestore(fileId);
      updatedFile = await prisma.file.findUnique({
        where: { id: fileId },
      });
    } else {
      updatedFile = await prisma.file.update({
        where: { id: fileId },
        data: { isDeleted },
      });
    }

    log.info("File status updated", { fileId, isDeleted });
    return successResponse(updatedFile, "File updated successfully.");
  } catch (error) {
    log.error("Failed to update file", error);
    return errorResponse("Failed to update file.", 500);
  }
}
