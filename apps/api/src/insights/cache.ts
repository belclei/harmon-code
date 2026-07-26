// apps/api/src/insights/cache.ts
// Cache de insights (§5.6/§7.8): TTL 60s + invalidação por escrita.
//
// Estratégia (decisão da Sprint 6): contador de geração por usuário. A chave
// do card embute a geração corrente; qualquer escrita autenticada incrementa
// `insights:gen:{userId}` (via hook onResponse em server.ts), o que "aposenta"
// de uma vez TODAS as variantes de `asOf` daquele usuário — sem SCAN/KEYS.
// As chaves antigas expiram sozinhas pelo próprio TTL.
import type Redis from "ioredis";

const TTL_SECONDS = 60;

function genKey(userId: string): string {
  return `insights:gen:${userId}`;
}

/** Geração corrente do usuário (0 se nunca escreveu). */
export async function insightsGen(
  redis: Redis,
  userId: string,
): Promise<number> {
  const value = await redis.get(genKey(userId));
  return value ? Number(value) : 0;
}

/** Incrementa a geração — invalida todo o cache de insights do usuário. */
export async function bumpInsightsGen(
  redis: Redis,
  userId: string,
): Promise<void> {
  await redis.incr(genKey(userId));
}

function dashboardKey(userId: string, gen: number, asOf: string): string {
  return `insights:dash:${userId}:${gen}:${asOf}`;
}

/** Lê o payload em cache; `null` no miss. */
export async function readDashboardCache(
  redis: Redis,
  userId: string,
  gen: number,
  asOf: string,
): Promise<string | null> {
  return redis.get(dashboardKey(userId, gen, asOf));
}

/** Grava o payload com TTL de 60s. */
export async function writeDashboardCache(
  redis: Redis,
  userId: string,
  gen: number,
  asOf: string,
  payload: string,
): Promise<void> {
  await redis.set(dashboardKey(userId, gen, asOf), payload, "EX", TTL_SECONDS);
}
