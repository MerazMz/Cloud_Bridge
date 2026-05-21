import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { SemanticSearchService } from "../src/services/semantic-search/semantic-search.service";

async function run() {
  console.log("Starting semantic embedding backfill with force=true...");
  try {
    const user = await prisma.user.findFirst();
    if (!user) {
      console.error("No user found in database!");
      return;
    }
    console.log(`Found user: ${user.displayName || user.username || user.id} (ID: ${user.id})`);
    
    console.log("Calling SemanticSearchService.backfillEmbeddingsForUser with force = true...");
    const result = await SemanticSearchService.backfillEmbeddingsForUser(user.id, true);
    console.log("Backfill result:", result);
  } catch (err: any) {
    console.error("Failed to run backfill:", err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
