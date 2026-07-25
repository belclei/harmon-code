// apps/api/src/auth/authenticate.ts
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { AUTH_TOKEN_INVALID } from "../errors.js";
import { verifyAccessToken } from "./jwt.js";

declare module "fastify" {
  interface FastifyRequest {
    userId?: string;
    userRole?: "user" | "admin";
  }
}

export function requireUser(fastify: FastifyInstance) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw AUTH_TOKEN_INVALID();
    }
    // Mirrors the try/catch already established in /v1/auth/logout (Task 7):
    // verifyAccessToken throws a raw jose error on a malformed/expired/
    // tampered token, which — left uncaught — would fall through to the
    // global error handler's generic 500, not the 400 this route contract
    // promises for "invalid token". Catch and translate explicitly.
    try {
      const payload = await verifyAccessToken(
        authHeader.slice("Bearer ".length),
        fastify.env.JWT_SECRET,
      );
      request.userId = payload.sub;
      request.userRole = payload.role;
    } catch {
      throw AUTH_TOKEN_INVALID();
    }
  };
}
