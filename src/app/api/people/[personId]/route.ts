import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { getCurrentUserId } from "@/services/auth/auth.service";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";
import { FaceClusteringService } from "@/services/face-clustering/face-clustering.service";

const log = createLogger("API:people:detail");

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ personId: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return errorResponse("Not authenticated.", 401);
    }

    const { personId } = await params;

    const person = await prisma.person.findUnique({
      where: { id: personId },
      include: {
        faces: {
          include: {
            file: true,
          },
        },
      },
    });

    if (!person || person.userId !== userId) {
      return errorResponse("Person group not found.", 404);
    }

    // Get cover face information
    const coverFace =
      person.faces.find((f) => f.id === person.coverFaceId) ||
      person.faces[0] ||
      null;

    // Deduplicate files and gather associated face boxes
    const filesMap = new Map<string, any>();
    for (const face of person.faces) {
      if (!face.file || face.file.isDeleted) continue;
      if (!filesMap.has(face.fileId)) {
        filesMap.set(face.fileId, {
          id: face.file.id,
          fileName: face.file.fileName,
          fileSize: Number(face.file.fileSize),
          mimeType: face.file.mimeType,
          createdAt: face.file.createdAt.toISOString(),
          caption: face.file.caption,
          faceBox: face.box,
        });
      }
    }

    const files = Array.from(filesMap.values());

    return successResponse(
      {
        id: person.id,
        name: person.name,
        facesCount: person.faces.length,
        coverFace: coverFace
          ? {
              id: coverFace.id,
              fileId: coverFace.fileId,
              box: coverFace.box,
            }
          : null,
        files,
      },
      "Person details retrieved successfully."
    );
  } catch (error) {
    log.error("Failed to retrieve person details", error);
    return errorResponse("Failed to retrieve person details.", 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ personId: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return errorResponse("Not authenticated.", 401);
    }

    const { personId } = await params;
    const body = await request.json();
    const name = body.name?.trim();

    if (!name) {
      return errorResponse("Name is required.", 400);
    }

    // Verify current person belongs to user
    const person = await prisma.person.findUnique({
      where: { id: personId },
    });

    if (!person || person.userId !== userId) {
      return errorResponse("Person group not found.", 404);
    }

    // Check if another person group already has the same name
    const existingPerson = await prisma.person.findFirst({
      where: {
        userId,
        id: { not: personId },
        name: { equals: name, mode: "insensitive" },
      },
    });

    if (existingPerson) {
      // Merge current person group into the existing one
      log.info(`Name conflict: "${name}". Merging group ${personId} into ${existingPerson.id}.`);
      await FaceClusteringService.mergePeople(existingPerson.id, personId);

      return successResponse(
        { merged: true, targetId: existingPerson.id },
        `Group merged into "${name}" successfully.`
      );
    }

    // Rename
    await prisma.person.update({
      where: { id: personId },
      data: { name },
    });

    return successResponse(
      { merged: false },
      "Person renamed successfully."
    );
  } catch (error) {
    log.error("Failed to update person", error);
    return errorResponse("Failed to update person.", 500);
  }
}
