import { PrismaClient } from "@prisma/client";
import { isDatabaseConfigured } from "@/lib/env";

// Prevent creating a new PrismaClient on every hot-reload in development.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  // Logs a clear, one-time developer warning if DATABASE_URL is missing, but
  // deliberately does NOT throw here: constructing the client must never
  // crash module import for routes/pages that don't touch the database
  // (e.g. the landing page). Prisma will raise its own connection error the
  // first time a query actually runs, which `handleApiError` safely converts
  // into a generic DATABASE_ERROR response for the client.
  isDatabaseConfigured();

  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
