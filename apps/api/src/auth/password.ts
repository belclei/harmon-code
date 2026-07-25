import { hash, verify } from "@node-rs/argon2";

export async function hashPassword(plain: string): Promise<string> {
  // Algorithm.Argon2id = 2 (using literal to avoid isolatedModules const enum issue)
  return hash(plain, { algorithm: 2 });
}

export async function verifyPassword(
  hashValue: string,
  plain: string,
): Promise<boolean> {
  return verify(hashValue, plain);
}
