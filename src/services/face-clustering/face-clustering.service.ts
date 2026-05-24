import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";

const log = createLogger("FaceClusteringService");

export class FaceClusteringService {
  private static VECTOR_DIMENSION = 512;
  private static SIMILARITY_THRESHOLD = 0.62;

  /**
   * Calculates the dot product of two vectors.
   */
  private static dotProduct(a: number[], b: number[]): number {
    let sum = 0;
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
      sum += a[i] * b[i];
    }
    return sum;
  }

  /**
   * Calculates the magnitude (L2 norm) of a vector.
   */
  private static magnitude(a: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += a[i] * a[i];
    }
    return Math.sqrt(sum);
  }

  /**
   * Calculates the cosine similarity between two vectors.
   */
  private static cosineSimilarity(a: number[], b: number[]): number {
    const magA = this.magnitude(a);
    const magB = this.magnitude(b);
    if (magA === 0 || magB === 0) return 0;
    return this.dotProduct(a, b) / (magA * magB);
  }

  /**
   * Matches a new face embedding to an existing Person group or creates a new one.
   */
  static async clusterFace(userId: string, faceEmbedding: number[]): Promise<string> {
    try {
      // 1. Fetch all people groups for the user, including their face embeddings
      const people = await prisma.person.findMany({
        where: { userId },
        include: {
          faces: {
            select: {
              embedding: true,
            },
          },
        },
      });

      let bestPersonId: string | null = null;
      let highestScore = -1;

      // 2. Compare the face embedding with the centroid of each person group
      for (const person of people) {
        if (person.faces.length === 0) continue;

        // Calculate centroid of the person group (element-wise average of all face embeddings)
        // and find the maximum similarity to any single face in the group (single-linkage)
        const centroid = new Array(this.VECTOR_DIMENSION).fill(0);
        let maxSingleSimilarity = -1;

        for (const face of person.faces) {
          for (let i = 0; i < this.VECTOR_DIMENSION; i++) {
            centroid[i] += face.embedding[i] || 0;
          }
          
          const singleSim = this.cosineSimilarity(faceEmbedding, face.embedding);
          if (singleSim > maxSingleSimilarity) {
            maxSingleSimilarity = singleSim;
          }
        }
        
        for (let i = 0; i < this.VECTOR_DIMENSION; i++) {
          centroid[i] /= person.faces.length;
        }

        // Calculate similarity between the new face and this centroid (average-linkage)
        const centroidSim = this.cosineSimilarity(faceEmbedding, centroid);
        
        // Match score is the maximum of average (centroid) similarity and 90% of max single-face similarity
        const matchScore = Math.max(centroidSim, maxSingleSimilarity * 0.90);
        
        log.debug(
          `Comparing face with Person ${person.id} ("${person.name || "Unnamed"}"). ` +
          `Centroid Sim: ${centroidSim.toFixed(4)}, Max Single Sim: ${maxSingleSimilarity.toFixed(4)}, Match Score: ${matchScore.toFixed(4)}`
        );

        if (matchScore > highestScore) {
          highestScore = matchScore;
          bestPersonId = person.id;
        }
      }

      // 3. If highest score is above threshold, assign to the best match
      if (bestPersonId && highestScore >= this.SIMILARITY_THRESHOLD) {
        log.info(`Matched face to Person ${bestPersonId} with score ${highestScore.toFixed(4)}`);
        return bestPersonId;
      }

      // 4. Otherwise, create a new Person group
      log.info(`No matching person group found (highest similarity score: ${highestScore.toFixed(4)}). Creating a new Person group.`);
      const newPerson = await prisma.person.create({
        data: {
          userId,
          name: null, // Initialized as Unnamed Person
        },
      });
      return newPerson.id;
    } catch (err: any) {
      log.error("Failed to cluster face embedding", err);
      throw err;
    }
  }

  /**
   * Ensures a Person group has a cover face set.
   */
  static async ensurePersonHasCover(personId: string, faceId: string): Promise<void> {
    try {
      const person = await prisma.person.findUnique({
        where: { id: personId },
        select: { coverFaceId: true },
      });

      if (person && !person.coverFaceId) {
        await prisma.person.update({
          where: { id: personId },
          data: { coverFaceId: faceId },
        });
        log.info(`Set coverFaceId ${faceId} for Person ${personId}`);
      }
    } catch (err: any) {
      log.error(`Failed to set cover face for Person ${personId}`, err);
    }
  }

  /**
   * Merges a source Person group into a target Person group.
   * Useful when two groups are renamed to the same name.
   */
  static async mergePeople(targetPersonId: string, sourcePersonId: string): Promise<void> {
    if (targetPersonId === sourcePersonId) return;

    log.info(`Merging Person ${sourcePersonId} into Person ${targetPersonId}`);

    await prisma.$transaction(async (tx) => {
      // 1. Point all faces belonging to source to target
      await tx.fileFace.updateMany({
        where: { personId: sourcePersonId },
        data: { personId: targetPersonId },
      });

      // 2. Fetch the target to check if cover face needs updating
      const target = await tx.person.findUnique({
        where: { id: targetPersonId },
        select: { coverFaceId: true },
      });

      // If target doesn't have a cover face, check if we can assign one from the merged faces
      if (!target?.coverFaceId) {
        const firstFace = await tx.fileFace.findFirst({
          where: { personId: targetPersonId },
          select: { id: true },
        });
        if (firstFace) {
          await tx.person.update({
            where: { id: targetPersonId },
            data: { coverFaceId: firstFace.id },
          });
        }
      }

      // 3. Delete the source Person
      await tx.person.delete({
        where: { id: sourcePersonId },
      });
    });

    log.info(`Successfully merged Person ${sourcePersonId} into ${targetPersonId}`);
  }
}
