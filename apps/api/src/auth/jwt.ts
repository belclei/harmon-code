import { SignJWT, jwtVerify } from "jose";

export interface AccessTokenPayload {
  sub: string;
  role: "user" | "admin";
}

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

export async function signAccessToken(
  payload: AccessTokenPayload,
  secret: string,
  opts: { nowSeconds?: number } = {},
): Promise<string> {
  const now = opts.nowSeconds ?? Math.floor(Date.now() / 1000);
  return new SignJWT({ role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt(now)
    .setExpirationTime(now + ACCESS_TOKEN_TTL_SECONDS)
    .sign(new TextEncoder().encode(secret));
}

export async function verifyAccessToken(
  token: string,
  secret: string,
): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
  if (
    typeof payload.sub !== "string" ||
    (payload.role !== "user" && payload.role !== "admin")
  ) {
    throw new Error("Malformed access token payload");
  }
  return { sub: payload.sub, role: payload.role };
}
