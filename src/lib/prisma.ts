import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

// Cache the Prisma client globally to prevent connection pool exhaustion
// This is critical for production stability - without this, each request
// creates a new connection which can exhaust the database connection pool
globalForPrisma.prisma = prisma;

