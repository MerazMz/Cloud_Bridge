import { prisma } from "../src/lib/prisma";
import { SemanticSearchService } from "../src/services/semantic-search/semantic-search.service";

function dotProduct(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

function getDynamicThreshold(matches: { similarity: number }[]): number {
  if (matches.length === 0) {
    return 0.22;
  }

  const scores = matches.map((m) => m.similarity);
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);

  console.log(`Max Score: ${maxScore}, Min Score: ${minScore}`);

  // 1. Absolute Exclude Floor: If the best match is extremely low, nothing matches
  if (maxScore < 0.18) {
    return 0.25; // High threshold to filter out everything
  }

  // 2. Keep-All Rule: If even the worst match is a highly confident match (>= 0.21),
  // then the entire database is related. Show everything.
  if (minScore >= 0.21) {
    return 0.18;
  }

  // 3. Small Range Rule: If all scores are clustered very tightly (range < 0.05)
  if (maxScore - minScore < 0.05) {
    return maxScore >= 0.21 ? 0.18 : 0.25;
  }

  // 4. 1D K-Means / Otsu's Split: Find the split that maximizes inter-class variance
  const sortedScores = [...scores].sort((a, b) => b - a);
  let bestThreshold = 0.20;
  let maxVariance = -1;

  for (let i = 1; i < sortedScores.length; i++) {
    const left = sortedScores.slice(0, i);
    const right = sortedScores.slice(i);

    const wL = left.length / sortedScores.length;
    const wR = right.length / sortedScores.length;

    const meanL = left.reduce((a, b) => a + b, 0) / left.length;
    const meanR = right.reduce((a, b) => a + b, 0) / right.length;

    const variance = wL * wR * Math.pow(meanL - meanR, 2);
    if (variance > maxVariance) {
      maxVariance = variance;
      bestThreshold = (left[left.length - 1] + right[0]) / 2;
    }
  }

  // Enforce CLIP bounds for maximum safety and recall:
  bestThreshold = Math.max(0.18, bestThreshold);
  bestThreshold = Math.min(bestThreshold, maxScore - 0.04);
  bestThreshold = Math.max(0.18, bestThreshold);

  return bestThreshold;
}

async function testSearch() {
  const query = process.argv[2] || "rice";
  console.log(`Testing search for query: "${query}"`);

  try {
    const queryEmbedding = await SemanticSearchService.generateEmbedding({
      action: "text",
      query: query,
    });

    const userEmbeddings = await prisma.fileEmbedding.findMany({
      where: {
        file: {
          mimeType: {
            startsWith: "image/",
          },
        },
      },
      include: {
        file: true,
      },
    });

    console.log(`Found ${userEmbeddings.length} image embeddings in DB.`);

    const matches = userEmbeddings
      .filter((emb) => !emb.file.isDeleted)
      .map((emb) => {
        const similarity = dotProduct(queryEmbedding, emb.embedding);
        return {
          fileName: emb.file.fileName,
          mimeType: emb.file.mimeType,
          similarity,
        };
      });

    const threshold = getDynamicThreshold(matches);
    console.log(`Calculated Threshold: ${threshold}`);

    console.log("\nResults (All images sorted by similarity):");
    const sorted = [...matches].sort((a, b) => b.similarity - a.similarity);
    sorted.forEach((m) => {
      const status = m.similarity >= threshold ? "PASS" : "FAIL";
      console.log(`- [${status}] Name: ${m.fileName}, Sim: ${m.similarity.toFixed(4)}`);
    });

  } catch (err) {
    console.error("Error during test search:", err);
  } finally {
    await prisma.$disconnect();
  }
}

testSearch();
