import { PrismaClient } from "@prisma/client";

// A single shared Prisma client for the whole app.
//
// In development, Next.js hot-reloads modules, which would normally create a
// new PrismaClient on every reload and exhaust the connection pool. Storing
// the client on `globalThis` means the SAME instance is reused across reloads.
// In production there is only one instance anyway, so no singleton is needed.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}