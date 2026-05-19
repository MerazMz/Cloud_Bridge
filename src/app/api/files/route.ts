import { successResponse, errorResponse } from "@/lib/api-response";
import { getCurrentUserId } from "@/services/auth/auth.service";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";

const log = createLogger("API:files");

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return errorResponse("Not authenticated.", 401);
    }

    const files = await prisma.file.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    // Map BigInt to standard JavaScript number for JSON serialization
    const serializedFiles = files.map((file) => ({
      id: file.id,
      fileName: file.fileName,
      fileSize: Number(file.fileSize),
      mimeType: file.mimeType,
      createdAt: file.createdAt.toISOString(),
    }));

    return successResponse(serializedFiles, "Files retrieved successfully.");
  } catch (error) {
    log.error("Failed to list files", error);
    return errorResponse("Failed to retrieve files.", 500);
  }
}
