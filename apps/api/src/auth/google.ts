// apps/api/src/auth/google.ts
import { OAuth2Client } from "google-auth-library";

export interface GoogleIdentity {
  googleId: string;
  email: string;
  name: string;
}

export type GoogleIdTokenVerifier = (idToken: string) => Promise<GoogleIdentity>;

export function createGoogleIdTokenVerifier(clientId: string): GoogleIdTokenVerifier {
  const client = new OAuth2Client(clientId);
  return async (idToken: string): Promise<GoogleIdentity> => {
    const ticket = await client.verifyIdToken({ idToken, audience: clientId });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email || !payload.name) {
      throw new Error("Google id_token missing required claims");
    }
    return { googleId: payload.sub, email: payload.email, name: payload.name };
  };
}
