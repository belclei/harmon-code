import type { FastifyInstance } from "fastify";
// apps/api/src/plugins/redis.ts
import fp from "fastify-plugin";
import Redis from "ioredis";

declare module "fastify" {
  interface FastifyInstance {
    redis: Redis;
  }
}

export default fp(async (fastify: FastifyInstance) => {
  const redis = new Redis(fastify.env.REDIS_URL, { maxRetriesPerRequest: 3 });
  fastify.decorate("redis", redis);
  fastify.addHook("onClose", async (instance) => {
    await instance.redis.quit();
  });
});
