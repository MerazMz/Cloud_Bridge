import { prisma } from "../src/lib/prisma";

async function check() {
  try {
    const totalFiles = await prisma.file.count();
    const totalEmbeddings = await prisma.fileEmbedding.count();
    console.log("====================================");
    console.log(`Total files in DB: ${totalFiles}`);
    console.log(`Total embeddings in DB: ${totalEmbeddings}`);
    
    if (totalFiles > 0) {
      const sampleFiles = await prisma.file.findMany({
        take: 5,
        orderBy: { createdAt: "desc" }
      });
      console.log("Last 5 files:");
      sampleFiles.forEach(f => {
        console.log(`- ID: ${f.id}, Name: ${f.fileName}, mimeType: ${f.mimeType}, isDeleted: ${f.isDeleted}`);
      });

      const filesWithEmbedding = await prisma.file.findMany({
        where: {
          embedding: { isNot: null }
        },
        take: 5
      });
      console.log(`Files with embeddings: ${filesWithEmbedding.length} found`);
    }
    console.log("====================================");
  } catch (err) {
    console.error("Error checking database:", err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
