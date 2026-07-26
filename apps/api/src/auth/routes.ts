import type { FastifyInstance, FastifyReply } from "fastify";
// apps/api/src/auth/routes.ts
import { z } from "zod";
import { AUTH_INVALID_CREDENTIALS, AUTH_TOKEN_INVALID } from "../errors.js";
import { resolveFlags } from "../flags/resolve.js";
import { isUserActive } from "./active-user.js";
import { requireUser } from "./authenticate.js";
import {
  type AccessTokenPayload,
  signAccessToken,
  verifyAccessToken,
} from "./jwt.js";
import { verifyPassword } from "./password.js";
import { registerAuthRateLimit } from "./rate-limit.js";
import {
  hashToken,
  issueRefreshTokenFamily,
  revokeRefreshFamily,
  rotateRefreshToken,
} from "./refresh-tokens.js";

const REFRESH_COOKIE_NAME = "refreshToken";
const REFRESH_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

function setRefreshCookie(reply: FastifyReply, token: string): void {
  reply.setCookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/v1/auth",
    maxAge: REFRESH_COOKIE_MAX_AGE_SECONDS,
  });
}

const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const GoogleAuthBody = z.object({ idToken: z.string().min(1) });

export async function registerAuthRoutes(
  fastify: FastifyInstance,
): Promise<void> {
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
      // A disabled/soft-deleted user must get the exact same response as a
      // wrong password — never reveal that the account exists but is
      // disabled.
      if (!isUserActive(user)) {
        throw AUTH_INVALID_CREDENTIALS();
      }

      const validPassword = await verifyPassword(user.passwordHash, password);
      if (!validPassword) {
        throw AUTH_INVALID_CREDENTIALS();
      }

      const accessToken = await signAccessToken(
        { sub: user.id, role: user.role },
        fastify.env.JWT_SECRET,
      );
      const { token: refreshToken } = await issueRefreshTokenFamily(
        fastify.prisma,
        user.id,
      );

      await fastify.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      setRefreshCookie(reply, refreshToken);
      return { accessToken };
    },
  );

  fastify.post("/v1/auth/refresh", async (request, reply) => {
    const rawToken = request.cookies[REFRESH_COOKIE_NAME];
    if (!rawToken) {
      throw AUTH_TOKEN_INVALID();
    }

    // Narrowly scoped: only rotateRefreshToken's own failures (bad/expired
    // token, or reuse-detected — rotateRefreshToken doesn't distinguish the
    // two in its thrown error, and neither does the client-facing response
    // below) should map to auth.token_invalid (400). Everything after this
    // block is intentionally outside the try, so a transient DB/JWT failure
    // there falls through to the global error handler's `internal` (500)
    // instead of being mislabeled as an invalid token.
    let newRefreshToken: string;
    let userId: string;
    try {
      const rotated = await rotateRefreshToken(fastify.prisma, rawToken);
      newRefreshToken = rotated.token;
      userId = rotated.userId;
    } catch {
      throw AUTH_TOKEN_INVALID();
    }

    const user = await fastify.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    // A user disabled/soft-deleted after their last login must not be able
    // to keep refreshing — their session dies the same way an invalid
    // token would.
    if (!isUserActive(user)) {
      throw AUTH_TOKEN_INVALID();
    }
    const accessToken = await signAccessToken(
      { sub: user.id, role: user.role },
      fastify.env.JWT_SECRET,
    );

    setRefreshCookie(reply, newRefreshToken);
    return { accessToken };
  });

  fastify.post("/v1/auth/logout", async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw AUTH_TOKEN_INVALID();
    }
    let payload: AccessTokenPayload;
    try {
      payload = await verifyAccessToken(
        authHeader.slice("Bearer ".length),
        fastify.env.JWT_SECRET,
      );
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

  fastify.post(
    "/v1/auth/google",
    {
      schema: { body: GoogleAuthBody },
      // Same rate-limit opt-in mechanism as /v1/auth/login (Task 5) — there's
      // no email in the request body to key on the way login does, so this
      // falls back to the keyGenerator's `request.ip` branch (rate-limit.ts).
      config: { rateLimit: {} },
    },
    async (request, reply) => {
      const { idToken } = request.body as z.infer<typeof GoogleAuthBody>;
      const identity = await fastify.googleVerifier(idToken);

      // SECURITY (Épico 8): this upsert auto-links an existing password-based
      // account to a Google identity via matching email, with no user
      // confirmation step. Defensible today because no password-registration
      // route exists yet (unreachable) — but re-evaluate before Épico 8's
      // registration flow ships and makes this reachable. See BACKLOG.md
      // Sprint 2 closure note.
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
      // Same opacity as login: a disabled/soft-deleted account must not be
      // able to authenticate via Google either.
      if (!isUserActive(user)) {
        throw AUTH_INVALID_CREDENTIALS();
      }

      const accessToken = await signAccessToken(
        { sub: user.id, role: user.role },
        fastify.env.JWT_SECRET,
      );
      const { token: refreshToken } = await issueRefreshTokenFamily(
        fastify.prisma,
        user.id,
      );
      setRefreshCookie(reply, refreshToken);
      return { accessToken };
    },
  );

  fastify.get(
    "/v1/me",
    { preHandler: requireUser(fastify) },
    async (request) => {
      // requireUser() preHandler above always sets request.userId (or throws
      // before this handler runs), but the module augmentation in
      // authenticate.ts declares it optional since it's not set on
      // unauthenticated routes.
      // biome-ignore lint/style/noNonNullAssertion: set by requireUser() preHandler, which runs before this handler and throws if auth fails
      const userId = request.userId!;
      const user = await fastify.prisma.user.findUniqueOrThrow({
        where: { id: userId },
      });
      // A user disabled/soft-deleted after their access token was issued
      // must not be able to keep using it — matches refresh's treatment
      // since it's the same "your session is no longer valid" situation.
      if (!isUserActive(user)) {
        throw AUTH_TOKEN_INVALID();
      }
      const flags = await resolveFlags(fastify.prisma, user.id);
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        birthDate: user.birthDate.toISOString().slice(0, 10),
        hasPassword: user.passwordHash !== null,
        role: user.role,
        isBetaTester: user.isBetaTester,
        avatarMode: user.avatarMode,
        themePref: user.themePref,
        flags,
      };
    },
  );
}
