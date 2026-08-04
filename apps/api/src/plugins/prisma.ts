import { PrismaClient } from "@lurem/db";
import type { FastifyInstance } from "fastify";
// apps/api/src/plugins/prisma.ts
import fp from "fastify-plugin";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

export default fp(async (fastify: FastifyInstance) => {
  const prisma = new PrismaClient();
  await prisma.$connect();
  fastify.decorate("prisma", prisma);
  fastify.addHook("onClose", async (instance) => {
    await instance.prisma.$disconnect();
  });
});
