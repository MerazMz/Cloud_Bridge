import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { getCurrentUserId } from "@/services/auth/auth.service";
import { prisma } from "@/lib/prisma";
import { getJSON } from "@/lib/redis";
import { createLogger } from "@/lib/logger";
import {
  getClientForUser,
  deleteMultipleFilesFromTelegram,
} from "@/services/telegram/telegram.service";
import type { TelegramClient } from "telegram";

const log = createLogger("API:files:batch");

export const runtime = "nodejs";

// Helper to recursively retrieve all nested files for message deletion
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

// Helper to recursively restore folder and all nested child records
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

// Helper to recursively soft delete folder and all nested child records
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

async function recursivelySetSecure(folderId: string, isSecure: boolean) {
  await prisma.file.update({
    where: { id: folderId },
    data: { isSecure },
  });

  const children = await prisma.file.findMany({
    where: { parentId: folderId },
  });

  for (const child of children) {
    if (child.mimeType === "folder") {
      await recursivelySetSecure(child.id, isSecure);
    } else {
      await prisma.file.update({
        where: { id: child.id },
        data: { isSecure },
      });
    }
  }
}

/**
 * DELETE: Bulk permanently delete files and folders from database and Telegram
 */
export async function DELETE(request: NextRequest) {
  let client: TelegramClient | null = null;

  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return errorResponse("Not authenticated.", 401);
    }

    const { fileIds } = await request.json();
    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return errorResponse("Invalid or empty fileIds list.", 400);
    }

    // Retrieve the target items owned by the authenticated user
    const filesToDelete = await prisma.file.findMany({
      where: {
        id: { in: fileIds },
        userId,
      },
    });

    if (filesToDelete.length === 0) {
      return successResponse(null, "No files found to delete.");
    }

    const hasSecure = filesToDelete.some((f) => f.isSecure);
    if (hasSecure) {
      const isUnlocked = (await getJSON<string>(`secure_unlocked:${userId}`)) === "true";
      if (!isUnlocked) {
        return errorResponse("Secure folder is locked. Please unlock it first.", 403);
      }
    }

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

    // Connect to Telegram Client once
    try {
      client = await getClientForUser(userId);
    } catch (clientErr) {
      log.error("Failed to restore Telegram client for batch deletion", clientErr);
    }

    const messageIdsToDelete: number[] = [];

    for (const file of filesToDelete) {
      if (file.mimeType === "folder") {
        // Retrieve all sub-files recursively to delete their messages from Telegram
        const nestedFiles = await getNestedFiles(file.id);
        for (const f of nestedFiles) {
          if (f.telegramMessageId > 0) {
            messageIdsToDelete.push(f.telegramMessageId);
          }
        }
      } else {
        if (file.telegramMessageId > 0) {
          messageIdsToDelete.push(file.telegramMessageId);
        }
      }
    }

    // Perform bulk deletion from Telegram in one single RPC request (or chunk if it exceeds limit)
    if (client && messageIdsToDelete.length > 0) {
      try {
        await deleteMultipleFilesFromTelegram(
          client,
          user.storageChannelId,
          user.storageChannelAccessHash,
          messageIdsToDelete
        );
      } catch (tgErr: any) {
        log.warn("Telegram batch deletion failed, continuing with DB cleanup", tgErr);
      }
    }

    // Delete records from database
    // Prisma cascade deletes will handle sub-files and subfolders automatically
    const deleteResult = await prisma.file.deleteMany({
      where: {
        id: { in: filesToDelete.map((f) => f.id) },
        userId,
      },
    });

    log.info("Batch permanently deleted files/folders", {
      requestedCount: filesToDelete.length,
      deletedDbRecords: deleteResult.count,
      telegramMessageCount: messageIdsToDelete.length,
    });

    return successResponse(null, "Selected items permanently deleted.");
  } catch (error: any) {
    log.error("Failed to batch delete files", error);
    return errorResponse(error.message || "Failed to batch delete files.", 500);
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

/**
 * PATCH: Bulk restore files and folders from Trash
 */
export async function PATCH(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return errorResponse("Not authenticated.", 401);
    }

    const { fileIds, isDeleted, isSecure, parentId } = await request.json();
    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return errorResponse("Invalid or empty fileIds list.", 400);
    }

    // Fetch the targets to ensure they belong to the user
    const filesToUpdate = await prisma.file.findMany({
      where: {
        id: { in: fileIds },
        userId,
      },
    });

    if (filesToUpdate.length === 0) {
      return successResponse(null, "No files found to restore.");
    }

    const hasSecure = filesToUpdate.some((f) => f.isSecure) || isSecure === true;
    if (hasSecure) {
      const isUnlocked = (await getJSON<string>(`secure_unlocked:${userId}`)) === "true";
      if (!isUnlocked) {
        return errorResponse("Secure folder is locked. Please unlock it first.", 403);
      }
    }

    // Perform DB updates
    for (const file of filesToUpdate) {
      if (typeof isSecure === "boolean") {
        if (file.mimeType === "folder") {
          await recursivelySetSecure(file.id, isSecure);
        } else {
          await prisma.file.update({
            where: { id: file.id },
            data: { isSecure },
          });
        }
      }

      if (typeof isDeleted === "boolean") {
        if (file.mimeType === "folder") {
          if (isDeleted === false) {
            await recursivelyRestore(file.id);
          } else {
            await recursivelySoftDelete(file.id);
          }
        } else {
          await prisma.file.update({
            where: { id: file.id },
            data: { isDeleted },
          });
        }
      }
    }

    if (parentId !== undefined) {
      await prisma.file.updateMany({
        where: {
          id: { in: fileIds },
          userId,
        },
        data: {
          parentId,
        },
      });
    }

    log.info("Batch updated files/folders properties", {
      count: filesToUpdate.length,
      isDeleted,
      isSecure,
      parentId,
    });

    return successResponse(null, "Selected items updated successfully.");
  } catch (error: any) {
    log.error("Failed to batch update files", error);
    return errorResponse(error.message || "Failed to batch update files.", 500);
  }
}
