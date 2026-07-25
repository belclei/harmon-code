// apps/api/src/auth/routes.ts
import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { verifyPassword } from "./password.js";
import { signAccessToken } from "./jwt.js";
import { issueRefreshTokenFamily } from "./refresh-tokens.js";
import { registerAuthRateLimit } from "./rate-limit.js";
import { AUTH_INVALID_CREDENTIALS } from "../errors.js";

const REFRESH_COOKIE_NAME = "refreshToken";
const REFRESH_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

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
}
