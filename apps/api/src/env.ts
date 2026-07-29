// apps/api/src/env.ts
import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  GOOGLE_CLIENT_ID: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  RESEND_WEBHOOK_SECRET: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(3001),
  // Origin of the web app — used to build the /register?token=... link sent
  // in approval e-mails (BACKLOG.md §13 "E-mail de aprovação"). Defaulted so
  // every existing test's hand-rolled env object keeps working unchanged.
  APP_BASE_URL: z.string().url().default("http://localhost:5173"),
});

export type Env = z.infer<typeof EnvSchema>;
// Pre-parse shape (defaulted keys optional) — lets buildServer's test
// override omit APP_BASE_URL/PORT without every existing *.test.ts hand-
// rolled env object needing an update.
export type EnvInput = z.input<typeof EnvSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  return EnvSchema.parse(source);
}

export function parseEnv(source: EnvInput): Env {
  return EnvSchema.parse(source);
}
