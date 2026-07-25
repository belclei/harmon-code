// apps/api/src/auth/routes.ts
import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { verifyPassword } from "./password.js";
import { signAccessToken, verifyAccessToken } from "./jwt.js";
import {
  issueRefreshTokenFamily,
  rotateRefreshToken,
  revokeRefreshFamily,
  hashToken,
  RefreshTokenReuseError,
} from "./refresh-tokens.js";
import { registerAuthRateLimit } from "./rate-limit.js";
import { AUTH_INVALID_CREDENTIALS, AUTH_TOKEN_INVALID } from "../errors.js";

const REFRESH_COOKIE_NAME = "refreshToken";
const REFRESH_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const GoogleAuthBody = z.object({ idToken: z.string().min(1) });

export async function registerAuthRoutes(fastify: FastifyInstance): Promise<void> {
  await registerAuthRateLimit(fastify);

  fastify.post(
    "/v1/auth/login",
    {
      schema: { body: LoginBody },
      // @fastify/rate-limit is registered with `global: false` (Task 5), so
      // each route that wants limiting must opt in explicitly here — an
      // empty object means "use the plugin's registration-time defaults"
      // (max: 5, timeWindow: 15 minutes, keyed by e-mail).
      config: { rateLimit: {} },
    },
    async (request, reply) => {
      // `fastify` here is typed as the plain `FastifyInstance` (per this
      // function's public signature), not the `ZodTypeProvider`-augmented
      // instance from server.ts, so TS can't auto-infer `request.body`'s
      // shape from the route schema. The runtime validation still runs
      // (server.ts wires the Zod validator/serializer compilers globally)
      // — this cast only restores the static type to match that guarantee.
      const { email, password } = request.body as z.infer<typeof LoginBody>;

      const user = await fastify.prisma.user.findUnique({ where: { email } });
      if (!user || !user.passwordHash) {
        throw AUTH_INVALID_CREDENTIALS();
      }

      const validPassword = await verifyPassword(user.passwordHash, password);
      if (!validPassword) {
        throw AUTH_INVALID_CREDENTIALS();
      }

      const accessToken = await signAccessToken({ sub: user.id, role: user.role }, fastify.env.JWT_SECRET);
      const { token: refreshToken } = await issueRefreshTokenFamily(fastify.prisma, user.id);

      await fastify.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

      reply.setCookie(REFRESH_COOKIE_NAME, refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/v1/auth",
        maxAge: REFRESH_COOKIE_MAX_AGE_SECONDS,
      });
      return { accessToken };
    },
  );

  fastify.post("/v1/auth/refresh", async (request, reply) => {
    const rawToken = request.cookies[REFRESH_COOKIE_NAME];
    if (!rawToken) {
      throw AUTH_TOKEN_INVALID();
    }
    try {
      const { token: newRefreshToken, userId } = await rotateRefreshToken(fastify.prisma, rawToken);
      const user = await fastify.prisma.user.findUniqueOrThrow({ where: { id: userId } });
      const accessToken = await signAccessToken({ sub: user.id, role: user.role }, fastify.env.JWT_SECRET);

      reply.setCookie(REFRESH_COOKIE_NAME, newRefreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/v1/auth",
        maxAge: REFRESH_COOKIE_MAX_AGE_SECONDS,
      });
      return { accessToken };
    } catch (error) {
      if (error instanceof RefreshTokenReuseError) {
        throw AUTH_TOKEN_INVALID();
      }
      throw AUTH_TOKEN_INVALID();
    }
  });

  fastify.post("/v1/auth/logout", async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw AUTH_TOKEN_INVALID();
    }
    let payload;
    try {
      payload = await verifyAccessToken(authHeader.slice("Bearer ".length), fastify.env.JWT_SECRET);
    } catch {
      throw AUTH_TOKEN_INVALID();
    }

    const rawToken = request.cookies[REFRESH_COOKIE_NAME];
    if (rawToken) {
      const tokenRow = await fastify.prisma.refreshToken.findUnique({
        where: { tokenHash: hashToken(rawToken) },
      });
      // Defense-in-depth: only revoke the family if the presented cookie's
      // row actually belongs to the authenticated user. If it doesn't (or
      // no row is found at all), there's nothing valid to log out — don't
      // leak whether the token belongs to someone else.
      if (tokenRow && tokenRow.userId === payload.sub) {
        await revokeRefreshFamily(fastify.prisma, tokenRow.familyId);
      }
    }
    reply.clearCookie(REFRESH_COOKIE_NAME, { path: "/v1/auth" });
    return { ok: true };
  });

  fastify.post("/v1/auth/google", { schema: { body: GoogleAuthBody } }, async (request, reply) => {
    const { idToken } = request.body as z.infer<typeof GoogleAuthBody>;
    const identity = await fastify.googleVerifier(idToken);

    const user = await fastify.prisma.user.upsert({
      where: { email: identity.email },
      update: { googleId: identity.googleId, lastLoginAt: new Date() },
      create: {
        email: identity.email,
        name: identity.name,
        googleId: identity.googleId,
        birthDate: new Date(0), // placeholder — real birthDate collection is a registration-flow concern (Épico 8, out of scope here); Google login for an already-seeded user (belclei) never hits `create`.
      },
    });

    const accessToken = await signAccessToken({ sub: user.id, role: user.role }, fastify.env.JWT_SECRET);
    const { token: refreshToken } = await issueRefreshTokenFamily(fastify.prisma, user.id);
    reply.setCookie(REFRESH_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/v1/auth",
      maxAge: REFRESH_COOKIE_MAX_AGE_SECONDS,
    });
    return { accessToken };
  });
}
