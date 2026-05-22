const { PrismaClient } = require("../src/generated/prisma");
const prisma = new PrismaClient();

function dotProduct(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

function magnitude(a) {
  return Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
}

async function main() {
  try {
    console.log("Checking DB Connection and File Embeddings...");
    const embeddings = await prisma.fileEmbedding.findMany({
      include: { file: true }
    });

    console.log(`Total stored embeddings: ${embeddings.length}`);
    for (const emb of embeddings) {
      const vec = emb.embedding;
      const mag = magnitude(vec);
      console.log(`File ID: ${emb.fileId}`);
      console.log(`File Name: ${emb.file.fileName}`);
      console.log(`Vector Length: ${vec.length}`);
      console.log(`Vector Magnitude (Norm L2): ${mag}`);
      console.log(`First 5 values: ${vec.slice(0, 5)}`);
      console.log("-----------------------------------------");
    }
  } catch (err) {
    console.error("Error running check-db:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
