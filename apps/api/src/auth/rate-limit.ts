import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";

export async function registerAuthRateLimit(fastify: FastifyInstance): Promise<void> {
  await fastify.register(rateLimit, {
    global: false,
    redis: fastify.redis,
    max: 5,
    timeWindow: "15 minutes",
    keyGenerator: (request) => {
      const body = request.body as { email?: string } | undefined;
      return body?.email ? `auth:${body.email}` : request.ip;
    },
    errorResponseBuilder: () => ({
      code: "auth.rate_limited",
      message: "Muitas tentativas. Tente de novo em alguns minutos.",
    }),
  });
}
