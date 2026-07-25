import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";
import { AUTH_RATE_LIMITED } from "../errors.js";

export async function registerAuthRateLimit(fastify: FastifyInstance): Promise<void> {
  await fastify.register(rateLimit, {
    global: false,
    redis: fastify.redis,
    max: 5,
    timeWindow: "15 minutes",
    // keyGenerator needs the parsed body (for email-based keying), but the
    // plugin's default hook is 'onRequest', which runs before Fastify parses
    // the body — request.body is always undefined there, silently degrading
    // the limiter to IP-only keying. 'preHandler' runs after body parsing.
    hook: "preHandler",
    keyGenerator: (request) => {
      const body = request.body as { email?: string } | undefined;
      return body?.email ? `auth:${body.email}` : request.ip;
    },
    // Must throw an AppError (not a plain object) — the plugin `throw`s
    // whatever this returns, and the server's setErrorHandler only maps
    // AppError instances to their intended statusCode/body. A plain
    // { code, message } object has no statusCode, so it fell through to a
    // generic 500 instead of 429.
    errorResponseBuilder: () => AUTH_RATE_LIMITED(),
  });
}
