// apps/api/src/categories/routes.ts
// BACKLOG.md US-3.4 — GET/POST /v1/categories, DELETE /v1/categories/:id.
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireUser } from "../auth/authenticate.js";
import { NOT_FOUND } from "../errors.js";

const CategoryKind = z.enum(["income", "expense", "transfer"]);

const CreateCategoryBody = z.object({
  name: z.string().min(1),
  kind: CategoryKind,
  icon: z.string().min(1),
  colorToken: z.string().min(1),
});

export async function registerCategoryRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.get(
    "/v1/categories",
    { preHandler: requireUser(fastify) },
    async (request) => {
      // biome-ignore lint/style/noNonNullAssertion: set by requireUser() preHandler, which runs before this handler and throws if auth fails
      const userId = request.userId!;
      // Categorias de sistema (userId nulo) + as minhas, sem hierarquia (§6.5).
      const categories = await fastify.prisma.category.findMany({
        where: { OR: [{ userId: null }, { userId }] },
        orderBy: { name: "asc" },
      });
      return categories;
    },
  );

  fastify.post(
    "/v1/categories",
    { schema: { body: CreateCategoryBody }, preHandler: requireUser(fastify) },
    async (request, reply) => {
      // biome-ignore lint/style/noNonNullAssertion: set by requireUser() preHandler, which runs before this handler and throws if auth fails
      const userId = request.userId!;
      const body = request.body as z.infer<typeof CreateCategoryBody>;

      const category = await fastify.prisma.category.create({
        data: {
          userId,
          name: body.name,
          kind: body.kind,
          icon: body.icon,
          colorToken: body.colorToken,
          isSystem: false,
        },
      });
      reply.code(201);
      return category;
    },
  );

  fastify.delete(
    "/v1/categories/:id",
    { preHandler: requireUser(fastify) },
    async (request) => {
      // biome-ignore lint/style/noNonNullAssertion: set by requireUser() preHandler, which runs before this handler and throws if auth fails
      const userId = request.userId!;
      const { id } = request.params as { id: string };

      // Only the user's own categories can be deleted — system categories
      // (userId null) are read-only (§6.5) and must 404 here, same as any
      // other user's category, never revealing which case it was.
      const existing = await fastify.prisma.category.findFirst({
        where: { id, userId },
      });
      if (!existing) {
        throw NOT_FOUND();
      }

      // Exclusão nunca é cascata (§6.5): transações da categoria ficam "sem
      // categoria", numa única transação de banco para não deixar um estado
      // parcial se a segunda escrita falhar.
      await fastify.prisma.$transaction([
        fastify.prisma.transaction.updateMany({
          where: { categoryId: id },
          data: { categoryId: null },
        }),
        fastify.prisma.category.delete({ where: { id } }),
      ]);
      return { ok: true };
    },
  );
}
