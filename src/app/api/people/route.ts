import { successResponse, errorResponse } from "@/lib/api-response";
import { getCurrentUserId } from "@/services/auth/auth.service";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";

const log = createLogger("API:people");

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return errorResponse("Not authenticated.", 401);
    }

    // Retrieve all person groups for this user and their associated faces
    const people = await prisma.person.findMany({
      where: { userId },
      include: {
        faces: {
          select: {
            id: true,
            fileId: true,
            box: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const formattedPeople = people
      .map((person) => {
        const facesCount = person.faces.length;
        // Find the cover face or fall back to the first face
        const coverFace =
          person.faces.find((f) => f.id === person.coverFaceId) ||
          person.faces[0] ||
          null;

        return {
          id: person.id,
          name: person.name,
          facesCount,
          coverFace: coverFace
            ? {
                id: coverFace.id,
                fileId: coverFace.fileId,
                box: coverFace.box,
              }
            : null,
          createdAt: person.createdAt.toISOString(),
          updatedAt: person.updatedAt.toISOString(),
        };
      })
      .filter((p) => p.facesCount > 0); // Only return groups with at least one face

    return successResponse(formattedPeople, "People retrieved successfully.");
  } catch (error) {
    log.error("Failed to retrieve people groups", error);
    return errorResponse("Failed to retrieve people groups.", 500);
  }
}
