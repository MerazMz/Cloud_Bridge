import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

/**
 * Prisma Client singleton with pg adapter (Prisma 7).
 * In development, Next.js hot-reloads modules which would create
 * multiple PrismaClient instances. We cache it on `globalThis` to avoid that.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString =
    process.env.DATABASE_URL ||
    "postgresql://dummy:dummy@localhost:5432/dummy";

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

export const prisma = (() => {
  let client = globalForPrisma.prisma ?? createPrismaClient();
  // Safe runtime check: if client is cached but lacks the new uploadJob model (e.g., from pre-generation dev server caching), force re-instantiation!
  if (client && !(client as any).uploadJob) {
    client = createPrismaClient();
  }
  return client;
})();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
