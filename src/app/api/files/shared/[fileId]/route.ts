import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";
import {
  getClientForUser,
  downloadFileFromTelegram,
} from "@/services/telegram/telegram.service";
import type { TelegramClient } from "telegram";

const log = createLogger("API:files:shared");

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  let client: TelegramClient | null = null;

  try {
    const { fileId } = await params;

    // Retrieve file metadata from DB
    const file = await prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      return errorResponse("Shared file not found.", 404);
    }

    if (!file.isShared) {
      return errorResponse("Access to this shared file has been revoked.", 403);
    }

    // Get the file owner's storage channel information
    const owner = await prisma.user.findUnique({
      where: { id: file.userId },
      select: {
        storageChannelId: true,
        storageChannelAccessHash: true,
      },
    });

    if (!owner || !owner.storageChannelId || !owner.storageChannelAccessHash) {
      return errorResponse("Shared storage configuration is missing.", 400);
    }

    // Restore Telegram Client for the file owner
    client = await getClientForUser(file.userId);

    // Download file buffer from Telegram
    log.info(`Downloading shared file: ${file.fileName} (${fileId})`);
    const fileBuffer = await downloadFileFromTelegram(
      client,
      owner.storageChannelId,
      owner.storageChannelAccessHash,
      file.telegramMessageId
    );

    // Return the file content with inline or attachment disposition
    // Since shared links can be opened directly, use inline if possible for images/videos/PDFs,
    // otherwise attachment to force download.
    const isInlineType =
      file.mimeType.startsWith("image/") ||
      file.mimeType.startsWith("video/") ||
      file.mimeType.startsWith("audio/") ||
      file.mimeType === "application/pdf";

    const disposition = isInlineType ? "inline" : "attachment";

    return new NextResponse(fileBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": file.mimeType,
        "Content-Length": fileBuffer.length.toString(),
        "Content-Disposition": `${disposition}; filename="${encodeURIComponent(
          file.fileName
        )}"`,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    log.error("Failed to download shared file", error);
    const message =
      error instanceof Error ? error.message : "Failed to download shared file.";
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
