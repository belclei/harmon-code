import cookie from "@fastify/cookie";
import {
  type ZodTypeProvider,
  serializerCompiler,
  validatorCompiler,
} from "@fastify/type-provider-zod";
// apps/api/src/server.ts
import Fastify, { type FastifyError, type FastifyInstance } from "fastify";
import { registerAccountRoutes } from "./accounts/routes.js";
import {
  type GoogleIdTokenVerifier,
  createGoogleIdTokenVerifier,
} from "./auth/google.js";
import { registerAuthRoutes } from "./auth/routes.js";
import { registerCardRoutes } from "./cards/routes.js";
import { registerCategoryRoutes } from "./categories/routes.js";
import { registerResendWebhook } from "./email/webhook.js";
import { type Env, loadEnv } from "./env.js";
import { AppError, INTERNAL, VALIDATION_FAILED } from "./errors.js";
import { registerInstitutionRoutes } from "./institutions/routes.js";
import prismaPlugin from "./plugins/prisma.js";
import redisPlugin from "./plugins/redis.js";
import { registerRecurringTransactionRoutes } from "./recurring-transactions/routes.js";
import { registerTransactionRoutes } from "./transactions/routes.js";

declare module "fastify" {
  interface FastifyInstance {
    env: Env;
    googleVerifier: GoogleIdTokenVerifier;
  }
}

export async function buildServer(envOverride?: Env): Promise<FastifyInstance> {
  const fastify = Fastify({ logger: true }).withTypeProvider<ZodTypeProvider>();
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);

  const env = envOverride ?? loadEnv();
  fastify.decorate("env", env);
  fastify.decorate(
    "googleVerifier",
    createGoogleIdTokenVerifier(env.GOOGLE_CLIENT_ID),
  );

  await fastify.register(prismaPlugin);
  await fastify.register(redisPlugin);
  await fastify.register(cookie);
  await registerAuthRoutes(fastify);
  await registerResendWebhook(fastify);
  await registerInstitutionRoutes(fastify);
  await registerAccountRoutes(fastify);
  await registerCardRoutes(fastify);
  await registerCategoryRoutes(fastify);
  await registerTransactionRoutes(fastify);
  await registerRecurringTransactionRoutes(fastify);

  fastify.get("/health", async () => ({ status: "ok" }));
  fastify.get("/ready", async (_request, reply) => {
    try {
      await fastify.prisma.$queryRaw`SELECT 1`;
      await fastify.redis.ping();
      return { status: "ready" };
    } catch {
      return reply.code(503).send({ status: "not_ready" });
    }
  });

  fastify.setErrorHandler((error: FastifyError, _request, reply) => {
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
        ...(error.data ? { data: error.data } : {}),
      });
    }
    if (error.validation) {
      const details = error.validation.map((v) => ({
        field:
          v.instancePath.replace(/^\//, "") ||
          (typeof v.params?.missingProperty === "string"
            ? v.params.missingProperty
            : "unknown"),
        message: v.message ?? "Campo inválido.",
      }));
      const validationError = VALIDATION_FAILED(details);
      return reply.code(validationError.statusCode).send({
        code: validationError.code,
        message: validationError.message,
        details: validationError.details,
      });
    }
    fastify.log.error(error);
    const internal = INTERNAL();
    return reply
      .code(internal.statusCode)
      .send({ code: internal.code, message: internal.message });
  });

  return fastify;
}
