// apps/api/src/email/webhook.ts
import { createHmac, timingSafeEqual } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AUTH_TOKEN_INVALID } from "../errors.js";

const ResendWebhookBody = z.object({
  type: z.string(),
  // zod v4 requires an explicit key schema for z.record (v3's single-arg
  // form used in the brief no longer typechecks against the installed
  // zod@4.4.3 — this is the only change from the brief's literal code).
  data: z.record(z.string(), z.unknown()),
});

// Resend signs webhooks Svix-style: base64(HMAC-SHA256(`${svixId}.${svixTimestamp}.${rawBody}`, secret)).
export function verifyResendSignature(
  rawBody: string,
  headers: {
    "svix-id"?: string;
    "svix-timestamp"?: string;
    "svix-signature"?: string;
  },
  secret: string,
): boolean {
  const {
    "svix-id": id,
    "svix-timestamp": timestamp,
    "svix-signature": signature,
  } = headers;
  if (!id || !timestamp || !signature) {
    return false;
  }
  const expected = createHmac("sha256", Buffer.from(secret, "utf8"))
    .update(`${id}.${timestamp}.${rawBody}`)
    .digest("base64");
  const provided = signature.split(" ").map((s) => s.split(",")[1] ?? "");
  return provided.some((candidate) => {
    const a = Buffer.from(candidate, "base64");
    const b = Buffer.from(expected, "base64");
    return a.length === b.length && timingSafeEqual(a, b);
  });
}

export async function registerResendWebhook(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.post(
    "/v1/webhooks/resend",
    { config: { rawBody: true } },
    async (request, reply) => {
      const rawBody =
        typeof request.body === "string"
          ? request.body
          : JSON.stringify(request.body);
      const valid = verifyResendSignature(
        rawBody,
        request.headers as Record<string, string>,
        fastify.env.RESEND_WEBHOOK_SECRET,
      );
      if (!valid) {
        throw AUTH_TOKEN_INVALID();
      }
      const event = ResendWebhookBody.parse(JSON.parse(rawBody));
      fastify.log.info({ type: event.type }, "resend webhook received");
      return reply.code(200).send({ ok: true });
    },
  );
}
