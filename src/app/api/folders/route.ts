import { NextRequest } from "next/server";
import { getCurrentUserId } from "@/services/auth/auth.service";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";

const log = createLogger("API:folders");

export const runtime = "nodejs";

/**
 * GET: Retrieve list of items (subfolders and files) scoped to a parent folder or Root.
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, message: "Not authenticated." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const { searchParams } = new URL(request.url);
    let parentId: string | null = searchParams.get("parentId");
    if (parentId === "null" || parentId === "undefined" || !parentId) {
      parentId = null;
    }

    // Fetch all folders and files inside the current parent directory scope
    const items = await prisma.file.findMany({
      where: {
        userId,
        parentId,
        isDeleted: false,
      },
      orderBy: [
        { mimeType: "asc" }, // This naturally brings "folder" before standard file MIME types if alphabetically sorted, but we will sort explicitly in JS
        { createdAt: "desc" },
      ],
    });

    // Explicit sorting: folders first alphabetically, then standard files by creation time
    const sortedItems = items.sort((a, b) => {
      const isAFolder = a.mimeType === "folder";
      const isBFolder = b.mimeType === "folder";

      if (isAFolder && !isBFolder) return -1;
      if (!isAFolder && isBFolder) return 1;

      if (isAFolder && isBFolder) {
        return a.fileName.localeCompare(b.fileName);
      }

      // If both are standard files, sort by newest creation date
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Format BigInt values to standard serializable numbers safely
    const formattedItems = sortedItems.map((item) => ({
      ...item,
      fileSize: Number(item.fileSize),
    }));

    return new Response(
      JSON.stringify({ success: true, items: formattedItems }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    log.error("Failed to query folder items", error);
    return new Response(
      JSON.stringify({ success: false, message: error.message || "Failed to fetch items." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * POST: Create a new virtual folder inside parent scope or Root.
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, message: "Not authenticated." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = await request.json();
    const { name, parentId } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return new Response(
        JSON.stringify({ success: false, message: "Folder name is required." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const cleanName = name.trim();
    let parentGuid: string | null = parentId || null;
    if (parentGuid === "null" || parentGuid === "undefined" || !parentGuid) {
      parentGuid = null;
    }

    // 1. If a parent directory ID is provided, verify its existence and ownership
    if (parentGuid) {
      const parentFolder = await prisma.file.findUnique({
        where: { id: parentGuid },
      });

      if (!parentFolder || parentFolder.userId !== userId || parentFolder.mimeType !== "folder") {
        return new Response(
          JSON.stringify({ success: false, message: "Invalid target parent folder directory." }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // 2. Prevent naming collisions inside the same directory scope
    const existingColl = await prisma.file.findFirst({
      where: {
        userId,
        parentId: parentGuid,
        fileName: cleanName,
        mimeType: "folder",
        isDeleted: false,
      },
    });

    if (existingColl) {
      return new Response(
        JSON.stringify({ success: false, message: "A folder with this name already exists at this location." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Create virtual Folder DB record
    const folderRecord = await prisma.file.create({
      data: {
        userId,
        telegramMessageId: 0, // Virtual directory placeholder
        fileName: cleanName,
        fileSize: BigInt(0),
        mimeType: "folder",
        parentId: parentGuid,
      },
    });

    log.info("New directory folder created successfully", { folderId: folderRecord.id, name: cleanName });

    return new Response(
      JSON.stringify({
        success: true,
        folder: {
          ...folderRecord,
          fileSize: Number(folderRecord.fileSize),
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    log.error("Failed to create new folder", error);
    return new Response(
      JSON.stringify({ success: false, message: error.message || "Failed to create folder." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
