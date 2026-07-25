// apps/api/src/email/webhook.ts
import { createHmac, timingSafeEqual } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AUTH_TOKEN_INVALID } from "../errors.js";

declare module "fastify" {
  interface FastifyRequest {
    // Set only by the buffer-mode content-type parser scoped to the
    // /v1/webhooks/resend route below — the exact wire bytes of the
    // request body, before JSON.parse. Signatures must be verified
    // against these bytes, never against a re-serialization of
    // request.body (see registerResendWebhook for why).
    rawBody?: string;
  }
}

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
  // Registered inside a child plugin context (fastify.register) rather than
  // directly on `fastify`, so the buffer-mode content-type parser below is
  // scoped to only this route via Fastify's plugin encapsulation — every
  // other route in the app keeps the default JSON parser untouched.
  await fastify.register(async (instance) => {
    // Resend/Svix signs the *exact bytes* it sends on the wire:
    // HMAC-SHA256(`${svixId}.${svixTimestamp}.${rawBody}`, secret).
    // Fastify's built-in JSON parser would otherwise parse the body into
    // an object before the handler runs, and JSON.stringify(request.body)
    // is a re-serialization, NOT the original bytes — e.g. `1.50` becomes
    // `1.5`, and key order/whitespace/unicode escaping can all change.
    // That re-serialized string would fail this HMAC check for genuine,
    // untampered Resend deliveries. Capturing the raw buffer here keeps
    // the true bytes on request.rawBody while still handing Fastify a
    // parsed object for request.body.
    instance.addContentTypeParser(
      "application/json",
      { parseAs: "buffer" },
      (request, body, done) => {
        try {
          const raw = body.toString("utf8");
          const json = JSON.parse(raw);
          request.rawBody = raw;
          done(null, json);
        } catch (err) {
          done(err as Error, undefined);
        }
      },
    );

    // No `config: { rawBody: true }` route option here — that only has
    // meaning to plugins like `@fastify/raw-body` that read it, which this
    // route doesn't use. The scoped content-type parser above is what
    // actually captures the raw bytes; a route config flag with no plugin
    // reading it is exactly the kind of silently-inert code that caused
    // this bug in the first place.
    instance.post("/v1/webhooks/resend", async (request, reply) => {
      const rawBody = request.rawBody;
      if (typeof rawBody !== "string") {
        throw AUTH_TOKEN_INVALID();
      }
      const valid = verifyResendSignature(
        rawBody,
        request.headers as Record<string, string>,
        fastify.env.RESEND_WEBHOOK_SECRET,
      );
      if (!valid) {
        throw AUTH_TOKEN_INVALID();
      }
      const event = ResendWebhookBody.parse(request.body);
      fastify.log.info({ type: event.type }, "resend webhook received");
      return reply.code(200).send({ ok: true });
    });
  });
}
