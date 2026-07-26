// apps/api/src/institutions/routes.ts
// BACKLOG.md US-3.1 — GET /v1/institutions: catálogo curado (nome, COMPE, logoAsset).
import type { FastifyInstance } from "fastify";
import { requireUser } from "../auth/authenticate.js";
import { institutionLogoUrl } from "./logo-url.js";

export async function registerInstitutionRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.get(
    "/v1/institutions",
    { preHandler: requireUser(fastify) },
    async () => {
      const institutions = await fastify.prisma.institution.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      });
      return institutions.map((institution) => ({
        id: institution.id,
        name: institution.name,
        compeCode: institution.compeCode,
        logoAsset: institution.logoAsset,
        logoUrl: institutionLogoUrl(institution),
      }));
    },
  );
}
