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
import { Api } from "telegram";
import bigInt from "big-integer";

const log = createLogger("API:files:detail");

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  let client: TelegramClient | null = null;
  let isStreaming = false;

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

    // Fetch the media message location object from Telegram
    const channelPeer = new Api.InputPeerChannel({
      channelId: bigInt(user.storageChannelId.toString()),
      accessHash: bigInt(user.storageChannelAccessHash),
    });

    const messages = await client.getMessages(channelPeer, {
      ids: [file.telegramMessageId],
    });

    const message = messages[0];
    if (!message || !message.media) {
      return errorResponse("File media not found on Telegram.", 404);
    }

    // Resolve specific media location references and Datacenter IDs to bypass DC restrictions
    let fileLocation: any = null;
    let mediaDcId: number | undefined = undefined;

    if (message.media) {
      if ("document" in message.media && message.media.document) {
        const doc = message.media.document as any;
        fileLocation = new Api.InputDocumentFileLocation({
          id: doc.id,
          accessHash: doc.accessHash,
          fileReference: doc.fileReference,
          thumbSize: "",
        });
        mediaDcId = doc.dcId;
      } else if ("photo" in message.media && message.media.photo) {
        const photo = message.media.photo as any;
        fileLocation = new Api.InputPhotoFileLocation({
          id: photo.id,
          accessHash: photo.accessHash,
          fileReference: photo.fileReference,
          thumbSize: "y",
        });
        mediaDcId = photo.dcId;
      }
    }

    if (!fileLocation) {
      return errorResponse("Unsupported media format or empty media on Telegram.", 400);
    }

    const fileSize = Number(file.fileSize);

    // Parse HTTP Range Header
    const rangeHeader = request.headers.get("range");
    let startByte = 0;
    let endByte = fileSize - 1;
    let isRange = false;

    if (rangeHeader) {
      const parts = rangeHeader.replace(/bytes=/, "").split("-");
      const startStr = parts[0];
      const endStr = parts[1];
      
      if (startStr) {
        startByte = parseInt(startStr, 10);
      }
      if (endStr) {
        endByte = parseInt(endStr, 10);
      }
      isRange = true;
    }

    // Guard range bounds
    if (startByte < 0) startByte = 0;
    if (endByte >= fileSize) endByte = fileSize - 1;
    if (startByte > endByte) {
      startByte = 0;
      endByte = fileSize - 1;
      isRange = false;
    }

    const chunkSize = (endByte - startByte) + 1;

    // Disconnect helper to release client safely once stream closes
    let clientToDisconnect: TelegramClient | null = client;
    const disconnectClient = async () => {
      if (clientToDisconnect) {
        try {
          await clientToDisconnect.disconnect();
          log.info("Telegram client disconnected cleanly after stream lifecycle closed.", { fileId });
        } catch (disconnectErr) {
          log.warn("Failed to cleanly disconnect Telegram client during stream lifecycle closed", { error: disconnectErr });
        }
        clientToDisconnect = null;
      }
    };

    const activeClient = client;

    // Construct high-performance progressive chunked stream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          if (!activeClient) {
            throw new Error("Telegram client was not properly initialized.");
          }
          for await (const chunk of activeClient.iterDownload({
            file: fileLocation,
            offset: bigInt(startByte),
            limit: chunkSize, // Limit takes standard number in GramJS iterDownload options
            requestSize: 512 * 1024, // 512KB chunks for dynamic loading responsiveness
            dcId: mediaDcId, // Route download directly to correct Data Center
          })) {
            controller.enqueue(chunk);
          }
          controller.close();
          await disconnectClient();
        } catch (err) {
          log.error("Error occurred while feeding download stream from Telegram", err);
          controller.error(err);
          await disconnectClient();
        }
      },
      async cancel(reason) {
        log.info("Download stream canceled by browser request context", { fileId, reason });
        await disconnectClient();
      }
    });

    isStreaming = true;

    if (isRange) {
      return new NextResponse(stream as any, {
        status: 206,
        headers: {
          "Content-Type": resolvedMime,
          "Content-Length": chunkSize.toString(),
          "Content-Range": `bytes ${startByte}-${endByte}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Disposition": disposition,
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    } else {
      return new NextResponse(stream as any, {
        status: 200,
        headers: {
          "Content-Type": resolvedMime,
          "Content-Length": fileSize.toString(),
          "Accept-Ranges": "bytes",
          "Content-Disposition": disposition,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

  } catch (error) {
    log.error("Failed to stream/download file", error);
    const message =
      error instanceof Error ? error.message : "Failed to download file.";
    return errorResponse(message, 500);
  } finally {
    // Only disconnect client in this synchronous block if the stream was NOT successfully created
    if (!isStreaming && client) {
      try {
        await client.disconnect();
      } catch (disconnectErr) {
        log.warn("Failed to disconnect client in API fallback execution", { error: disconnectErr });
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
    const data: any = {};

    if (typeof body.isDeleted === "boolean") {
      data.isDeleted = body.isDeleted;
    }

    if (typeof body.isShared === "boolean") {
      data.isShared = body.isShared;
    }

    if (typeof body.fileName === "string") {
      const cleanName = body.fileName.trim();
      if (!cleanName) {
        return errorResponse("File name cannot be empty.", 400);
      }
      data.fileName = cleanName;
    }

    if (Object.keys(data).length === 0) {
      return errorResponse("No fields to update.", 400);
    }

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
    const updatedFile = await prisma.file.update({
      where: { id: fileId },
      data,
    });

    const formattedFile = {
      ...updatedFile,
      fileSize: Number(updatedFile.fileSize),
    };

    log.info("File updated", { fileId, ...data });
    return successResponse(formattedFile, "File updated successfully.");
  } catch (error) {
    log.error("Failed to update file", error);
    return errorResponse("Failed to update file.", 500);
  }
}
