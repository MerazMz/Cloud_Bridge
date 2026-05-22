import { NextRequest } from "next/server";
import { successResponse } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { SemanticSearchService } from "@/services/semantic-search/semantic-search.service";

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

function magnitude(a: number[]): number {
  return Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "rice";

    // 1. Generate query embedding
    const queryEmbedding = await SemanticSearchService.generateEmbedding({
      action: "text",
      query: query,
    });

    // 2. Fetch all file embeddings
    const embeddings = await prisma.fileEmbedding.findMany({
      include: {
        file: true,
      },
    });

    const results = embeddings.map((emb) => {
      const sim = dotProduct(queryEmbedding, emb.embedding);
      return {
        fileId: emb.fileId,
        fileName: emb.file.fileName,
        mimeType: emb.file.mimeType,
        vectorLength: emb.embedding.length,
        magnitude: magnitude(emb.embedding),
        similarity: sim,
        first5Values: emb.embedding.slice(0, 5),
      };
    });

    return successResponse({
      query,
      queryVectorLength: queryEmbedding.length,
      queryMagnitude: magnitude(queryEmbedding),
      queryFirst5: queryEmbedding.slice(0, 5),
      files: results,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
