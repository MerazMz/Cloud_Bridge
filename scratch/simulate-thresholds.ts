import { prisma } from "../src/lib/prisma";
import { SemanticSearchService } from "../src/services/semantic-search/semantic-search.service";

function dotProduct(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch`);
  }
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

function getDynamicThreshold(matches: { similarity: number }[], floor: number): number {
  if (matches.length === 0) {
    return floor;
  }

  const scores = matches.map((m) => m.similarity);
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);

  // 1. Absolute Exclude Floor
  if (maxScore < floor) {
    return 0.99; // Filter out everything
  }

  // 2. Keep-All Rule
  if (minScore >= floor) {
    return floor;
  }

  // 3. Small Range Rule
  if (maxScore - minScore < 0.05) {
    return maxScore >= floor ? floor : 0.99;
  }

  // 4. Otsu's Split
  const sortedScores = [...scores].sort((a, b) => b - a);
  let bestThreshold = floor;
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

  bestThreshold = Math.max(floor, bestThreshold);
  bestThreshold = Math.min(bestThreshold, maxScore - 0.04);
  bestThreshold = Math.max(floor, bestThreshold);

  return bestThreshold;
}

async function simulate() {
  const queries = ["rice", "car", "elephant", "profile", "flowchart"];
  const floors = [0.18, 0.22, 0.23, 0.235, 0.24, 0.25];

  try {
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

    console.log(`Loaded ${userEmbeddings.length} images from DB.\n`);

    for (const query of queries) {
      console.log(`========================================`);
      console.log(`QUERY: "${query}"`);
      console.log(`========================================`);

      const { embedding: queryEmbedding } = await SemanticSearchService.generateEmbedding({
        action: "text",
        query: query,
      });

      const matches = userEmbeddings
        .filter((emb) => !emb.file.isDeleted)
        .map((emb) => ({
          fileName: emb.file.fileName,
          similarity: dotProduct(queryEmbedding, emb.embedding),
        }));

      for (const floor of floors) {
        const threshold = getDynamicThreshold(matches, floor);
        const passed = matches.filter((m) => m.similarity >= threshold).sort((a, b) => b.similarity - a.similarity);
        console.log(`Floor: ${floor.toFixed(3)} -> Threshold: ${threshold.toFixed(4)} -> Passed Count: ${passed.length}`);
        if (passed.length > 0) {
          console.log(`  Passed files: ${passed.map(p => `${p.fileName} (${p.similarity.toFixed(3)})`).join(", ")}`);
        }
      }
      console.log();
    }
  } catch (err) {
    console.error("Simulation failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

simulate();
