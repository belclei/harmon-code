# Excluir/Reenviar Convites e Conexões — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the person who sent a pending `Invite` (signup invite) or `UserConnection` (connect request) — or any admin — delete or resend it, and wire the real invite email that `admin/routes.ts` had deferred.

**Architecture:** Two new routes per model (`DELETE /v1/invites/:id`, `POST /v1/invites/:id/resend`, and the equivalent pair on `/v1/connections`), authorized inline (`ownerId === userId || role === "admin"`) inside the existing self-service route files — no separate `/v1/admin/*` routes. Two new transactional emails (`sendInviteEmail`, `sendConnectionRequestEmail`) render static HTML/txt template files (already moved into the repo from the design handoff) through a tiny regex-based `{{var}}` substitution helper — no template-engine dependency.

**Tech Stack:** Fastify 5, Zod, Prisma (`@harmon/db`), `resend` SDK, Vitest, React + TanStack Query (frontend).

**Spec:** `docs/superpowers/specs/2026-07-28-invite-connection-cancel-resend-design.md`

## Global Constraints

- No Prisma schema migration — deletions are hard deletes, no new enum values (spec §Modelo de dados).
- `Invite`/`UserConnection` token TTL stays 7 days (`TOKEN_TTL_MS`) — do not change to 14 despite the design handoff's email copy.
- No new npm dependency for email templating — use the regex `{{var}}` substitution helper already decided in the spec.
- Authorization on every new route: `ownerId === request.userId || request.userRole === "admin"`; unauthorized/not-found both return 404 (`NOT_FOUND()`), never 403 — matches the existing "don't leak existence" pattern in `connections/routes.ts`.
- Ad-hoc `VALIDATION_FAILED([{ field: "id", message: "..." }])` for state errors, not new named constructors in `errors.ts` — matches `connections/routes.ts`'s existing style for "already responded" errors.
- Every new backend behavior needs a Vitest test in the same file/pattern as its neighbors (`server.inject`, `TEST_ENV`, `resetTestDb` in `afterEach`).
- pt-BR copy everywhere user-facing, matching the existing terse/direct tone already in `errors.ts` and `ConnectionsPage.tsx`.

---

## Already done (this session, before this plan)

The 6 email template assets referenced below already exist on disk and are staged in git — created directly from the approved spec, byte-identical to what Task 3 below would produce. Task 3 is included for completeness/reproducibility but its file-creation steps can be treated as already satisfied; only run its test step.

- `apps/api/src/email/templates/harmon-convite.html` / `.txt`
- `apps/api/src/email/templates/harmon-conexao.html` / `.txt`
- `apps/api/src/email/templates/harmon-confirmacao.html` (moved as-is, unused by code)
- `apps/api/src/email/templates/harmon-reset-senha.html` (moved as-is, unused by code)

---

### Task 1: `WEB_APP_URL` env var + shared `TOKEN_TTL_MS`

**Files:**
- Modify: `apps/api/src/env.ts`
- Modify: `apps/api/src/access/tokens.ts`
- Modify: `apps/api/src/admin/routes.ts:1-21` (import `TOKEN_TTL_MS` instead of defining it locally)
- Modify: `docker-compose.prod.yml` (api service `environment:` block, around line 58-67)

**Interfaces:**
- Produces: `Env.WEB_APP_URL: string` (from `loadEnv()`), `TOKEN_TTL_MS: number` exported from `apps/api/src/access/tokens.ts`.

- [ ] **Step 1: Add `WEB_APP_URL` to the env schema**

Edit `apps/api/src/env.ts`:

```ts
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
  WEB_APP_URL: z.string().url().default("http://localhost:5173"),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  return EnvSchema.parse(source);
}
```

- [ ] **Step 2: Move `TOKEN_TTL_MS` into `access/tokens.ts`**

Edit `apps/api/src/access/tokens.ts` — add the export at the top, above `findByToken`:

```ts
import type { FastifyInstance } from "fastify";
import { hashToken } from "../auth/refresh-tokens.js";
import { AUTH_TOKEN_EXPIRED, AUTH_TOKEN_INVALID } from "../errors.js";

// §6.1 — convite e fila de acesso usam o mesmo TTL de 7 dias pro link de
// registro. Compartilhado aqui porque admin/routes.ts (approve) e
// invites/routes.ts (resend) precisam do mesmo valor.
export const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function findByToken(fastify: FastifyInstance, token: string) {
  const tokenHash = hashToken(token);
  const waitlist = await fastify.prisma.waitlistEntry.findFirst({
    where: { registrationTokenHash: tokenHash },
  });
  if (waitlist) return { kind: "waitlist" as const, entry: waitlist };
  const invite = await fastify.prisma.invite.findFirst({
    where: { registrationTokenHash: tokenHash },
  });
  if (invite) return { kind: "invite" as const, entry: invite };
  return null;
}

export function assertUsable(
  found: NonNullable<Awaited<ReturnType<typeof findByToken>>>,
): void {
  if (found.entry.status !== "approved") {
    throw AUTH_TOKEN_INVALID();
  }
  if (!found.entry.tokenExpiresAt || found.entry.tokenExpiresAt < new Date()) {
    throw AUTH_TOKEN_EXPIRED();
  }
}
```

- [ ] **Step 3: Update `admin/routes.ts` to import the shared constant**

In `apps/api/src/admin/routes.ts`, remove the local `const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;` (currently line 21) and add an import instead. The top of the file becomes:

```ts
// apps/api/src/admin/routes.ts
// ... (existing header comment unchanged) ...
import { randomBytes } from "node:crypto";
import type { Prisma } from "@harmon/db";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { TOKEN_TTL_MS } from "../access/tokens.js";
import { hashToken } from "../auth/refresh-tokens.js";
import { ADMIN_LAST_ADMIN, NOT_FOUND } from "../errors.js";
import { requireAdmin } from "./require-admin.js";

const RoleBody = z.object({ role: z.enum(["user", "admin"]) }).strict();
const BetaBody = z.object({ isBetaTester: z.boolean() }).strict();
const DisableBody = z.object({ disabled: z.boolean() }).strict();
```

(Delete the old `const TOKEN_TTL_MS = ...` line that used to sit right after those three `Body` schemas — everything else in the file is unchanged.)

- [ ] **Step 4: Run typecheck to confirm the refactor is wired correctly**

Run: `npm run typecheck --workspace=@harmon/api`
Expected: no errors.

- [ ] **Step 5: Wire `WEB_APP_URL` into the prod Docker Compose**

Edit `docker-compose.prod.yml`, in the `api:` service `environment:` block (currently ends with `PORT: "3001"`):

```yaml
  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    environment:
      DATABASE_URL: postgresql://harmon:${POSTGRES_PASSWORD}@postgres:5432/harmon?schema=public
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
      RESEND_API_KEY: ${RESEND_API_KEY}
      RESEND_WEBHOOK_SECRET: ${RESEND_WEBHOOK_SECRET}
      PORT: "3001"
      WEB_APP_URL: https://${DOMAIN}
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/env.ts apps/api/src/access/tokens.ts apps/api/src/admin/routes.ts docker-compose.prod.yml
git commit -m "feat(api): add WEB_APP_URL env var, share TOKEN_TTL_MS"
```

---

### Task 2: `render-template.ts` — `{{var}}` substitution helper

**Files:**
- Create: `apps/api/src/email/render-template.ts`
- Test: `apps/api/src/email/render-template.test.ts`

**Interfaces:**
- Produces: `substituteVars(template: string, vars: Record<string, string>): string`, `renderTemplate(fileName: string, vars: Record<string, string>): string` — both exported from `apps/api/src/email/render-template.ts`. Task 4 (`templates.ts`) consumes `renderTemplate`.

- [ ] **Step 1: Write the failing tests**

Create `apps/api/src/email/render-template.test.ts`:

```ts
// apps/api/src/email/render-template.test.ts
import { describe, expect, it } from "vitest";
import { renderTemplate, substituteVars } from "./render-template.js";

describe("substituteVars", () => {
  it("replaces every occurrence of a known variable", () => {
    const result = substituteVars("Olá {{name}}, seu link é {{name}}.pdf", {
      name: "Fulano",
    });
    expect(result).toBe("Olá Fulano, seu link é Fulano.pdf");
  });

  it("replaces an unknown key with an empty string", () => {
    const result = substituteVars("valor: {{missing}}", {});
    expect(result).toBe("valor: ");
  });

  it("leaves text with no placeholders untouched", () => {
    expect(substituteVars("sem variáveis aqui", {})).toBe(
      "sem variáveis aqui",
    );
  });
});

describe("renderTemplate", () => {
  it("reads a real template file from templates/ and substitutes vars", () => {
    const result = renderTemplate("harmon-convite.txt", {
      link: "https://harmon.fasolo.tech/register?token=abc",
    });
    expect(result).toContain("https://harmon.fasolo.tech/register?token=abc");
    expect(result).not.toContain("{{link}}");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/email/render-template.test.ts --workspace=@harmon/api` (or `cd apps/api && npx vitest run src/email/render-template.test.ts`)
Expected: FAIL — `render-template.ts` doesn't exist yet (`Cannot find module './render-template.js'`).

- [ ] **Step 3: Implement `render-template.ts`**

Create `apps/api/src/email/render-template.ts`:

```ts
// apps/api/src/email/render-template.ts
// Nenhum motor de template existe no projeto — 2 e-mails não justificam
// trazer Handlebars/EJS/etc (YAGNI). Substituição por regex é suficiente:
// sem loops/condicionais nos templates.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const TEMPLATES_DIR = join(dirname(fileURLToPath(import.meta.url)), "templates");

export function substituteVars(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => vars[key] ?? "");
}

export function renderTemplate(
  fileName: string,
  vars: Record<string, string>,
): string {
  const raw = readFileSync(join(TEMPLATES_DIR, fileName), "utf-8");
  return substituteVars(raw, vars);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd apps/api && npx vitest run src/email/render-template.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/email/render-template.ts apps/api/src/email/render-template.test.ts
git commit -m "feat(api): add regex-based email template substitution helper"
```

---

### Task 3: Email template assets (already created — verify only)

**Files:**
- Verify exists: `apps/api/src/email/templates/harmon-convite.html`
- Verify exists: `apps/api/src/email/templates/harmon-convite.txt`
- Verify exists: `apps/api/src/email/templates/harmon-conexao.html`
- Verify exists: `apps/api/src/email/templates/harmon-conexao.txt`
- Verify exists: `apps/api/src/email/templates/harmon-confirmacao.html`
- Verify exists: `apps/api/src/email/templates/harmon-reset-senha.html`

**Interfaces:**
- Produces: static template files consumed by `renderTemplate()` (Task 2) via `sendInviteEmail`/`sendConnectionRequestEmail` (Task 4). `harmon-convite.*` use `{{link}}`. `harmon-conexao.*` use `{{link}}` and `{{requesterName}}`.

- [ ] **Step 1: Confirm the files exist and contain the expected placeholders**

Run: `grep -o '{{[a-zA-Z]*}}' apps/api/src/email/templates/harmon-convite.html apps/api/src/email/templates/harmon-convite.txt apps/api/src/email/templates/harmon-conexao.html apps/api/src/email/templates/harmon-conexao.txt | sort -u`
Expected output includes `harmon-conexao.html:{{link}}`, `harmon-conexao.html:{{requesterName}}`, `harmon-conexao.txt:{{link}}`, `harmon-conexao.txt:{{requesterName}}`, `harmon-convite.html:{{link}}`, `harmon-convite.txt:{{link}}`.

If any file is missing, recreate it from `docs/superpowers/specs/2026-07-28-invite-connection-cancel-resend-design.md` §E-mails and the original handoff at `design_handoff_harmon_2/emails/` (convite/confirmacao/reset-senha only — conexao has no source template, it was hand-authored to match the same visual chassis).

- [ ] **Step 2: Confirm no fabricated postal address or dead unsubscribe link remain**

Run: `grep -n "Rua Example\|unsubscribe_url" apps/api/src/email/templates/harmon-convite.html apps/api/src/email/templates/harmon-conexao.html`
Expected: no output (both were removed per spec decision; `harmon-confirmacao.html`/`harmon-reset-senha.html` still have the placeholder address since they're inert until their own feature exists — that's expected, not a bug).

- [ ] **Step 3: Commit (if not already committed)**

```bash
git add apps/api/src/email/templates/
git commit -m "feat(api): add invite/connection email templates (html+txt)" || true
```

(The `|| true` is because this may already be committed from the design/spec session — a clean `git status` on this path means nothing to do.)

---

### Task 4: `templates.ts` — `sendInviteEmail` / `sendConnectionRequestEmail`

**Files:**
- Create: `apps/api/src/email/templates.ts`
- Test: `apps/api/src/email/templates.test.ts`

**Interfaces:**
- Consumes: `renderTemplate` from `./render-template.js` (Task 2).
- Produces: `sendInviteEmail(resend: Resend, params: { to: string; link: string }): Promise<{ id: string }>` and `sendConnectionRequestEmail(resend: Resend, params: { to: string; requesterName: string; link: string }): Promise<{ id: string }>`, both exported from `apps/api/src/email/templates.ts`. Tasks 6-8 (route handlers) call these with `fastify.resend` (Task 5).

- [ ] **Step 1: Write the failing tests**

Create `apps/api/src/email/templates.test.ts`:

```ts
// apps/api/src/email/templates.test.ts
import type { Resend } from "resend";
import { describe, expect, it, vi } from "vitest";
import { sendConnectionRequestEmail, sendInviteEmail } from "./templates.js";

// Same dependency-injection pattern as resend-client.test.ts — a fake
// object shaped like the one SDK method we call, no live API key needed.
function fakeResend(send: (...args: unknown[]) => unknown): Resend {
  return { emails: { send } } as unknown as Resend;
}

describe("sendInviteEmail", () => {
  it("sends html+text with the invite link substituted", async () => {
    const send = vi
      .fn()
      .mockResolvedValue({ data: { id: "email_1" }, error: null });
    const resend = fakeResend(send);

    const result = await sendInviteEmail(resend, {
      to: "convidado@example.com",
      link: "https://harmon.fasolo.tech/register?token=xyz",
    });

    expect(result).toEqual({ id: "email_1" });
    const call = send.mock.calls[0][0] as {
      to: string;
      subject: string;
      html: string;
      text: string;
    };
    expect(call.to).toBe("convidado@example.com");
    expect(call.subject).toBe("Seu convite para o Harmon chegou");
    expect(call.html).toContain(
      "https://harmon.fasolo.tech/register?token=xyz",
    );
    expect(call.text).toContain(
      "https://harmon.fasolo.tech/register?token=xyz",
    );
  });

  it("throws with the failure reason when Resend returns an error", async () => {
    const send = vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: "boom" } });
    const resend = fakeResend(send);

    await expect(
      sendInviteEmail(resend, { to: "x@example.com", link: "https://x" }),
    ).rejects.toThrow(/boom/);
  });
});

describe("sendConnectionRequestEmail", () => {
  it("sends html+text with requesterName and link substituted", async () => {
    const send = vi
      .fn()
      .mockResolvedValue({ data: { id: "email_2" }, error: null });
    const resend = fakeResend(send);

    const result = await sendConnectionRequestEmail(resend, {
      to: "addressee@example.com",
      requesterName: "Maria",
      link: "https://harmon.fasolo.tech/connections",
    });

    expect(result).toEqual({ id: "email_2" });
    const call = send.mock.calls[0][0] as {
      to: string;
      subject: string;
      html: string;
      text: string;
    };
    expect(call.to).toBe("addressee@example.com");
    expect(call.subject).toBe("Pedido de conexão no Harmon");
    expect(call.html).toContain("Maria");
    expect(call.text).toContain("https://harmon.fasolo.tech/connections");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd apps/api && npx vitest run src/email/templates.test.ts`
Expected: FAIL — `templates.ts` doesn't exist yet.

- [ ] **Step 3: Implement `templates.ts`**

Create `apps/api/src/email/templates.ts`:

```ts
// apps/api/src/email/templates.ts
import type { Resend } from "resend";
import { renderTemplate } from "./render-template.js";

async function send(
  resend: Resend,
  params: { to: string; subject: string; html: string; text: string },
): Promise<{ id: string }> {
  const { data, error } = await resend.emails.send({
    from: "Harmon <onboarding@harmon.fasolo.tech>",
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
  });
  if (error || !data) {
    throw new Error(`Resend send failed: ${error?.message ?? "unknown error"}`);
  }
  return { id: data.id };
}

export function sendInviteEmail(
  resend: Resend,
  params: { to: string; link: string },
): Promise<{ id: string }> {
  return send(resend, {
    to: params.to,
    subject: "Seu convite para o Harmon chegou",
    html: renderTemplate("harmon-convite.html", { link: params.link }),
    text: renderTemplate("harmon-convite.txt", { link: params.link }),
  });
}

export function sendConnectionRequestEmail(
  resend: Resend,
  params: { to: string; requesterName: string; link: string },
): Promise<{ id: string }> {
  const vars = { requesterName: params.requesterName, link: params.link };
  return send(resend, {
    to: params.to,
    subject: "Pedido de conexão no Harmon",
    html: renderTemplate("harmon-conexao.html", vars),
    text: renderTemplate("harmon-conexao.txt", vars),
  });
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd apps/api && npx vitest run src/email/templates.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/email/templates.ts apps/api/src/email/templates.test.ts
git commit -m "feat(api): add sendInviteEmail/sendConnectionRequestEmail"
```

---

### Task 5: Wire `fastify.resend` decorator

**Files:**
- Modify: `apps/api/src/server.ts`

**Interfaces:**
- Consumes: `createResendClient` from `./email/resend-client.js` (already exists).
- Produces: `fastify.resend: Resend`, available to every route registered after this decoration. Tasks 6-8 use `fastify.resend`.

- [ ] **Step 1: Add the import and type augmentation**

In `apps/api/src/server.ts`, add to the imports (alphabetical, near the other `./email/...` import):

```ts
import { createResendClient } from "./email/resend-client.js";
```

Update the `declare module "fastify"` block (currently around line 35-40):

```ts
declare module "fastify" {
  interface FastifyInstance {
    env: Env;
    googleVerifier: GoogleIdTokenVerifier;
    resend: Resend;
  }
}
```

This needs `import type { Resend } from "resend";` added to the imports too.

- [ ] **Step 2: Decorate the instance**

In `buildServer`, right after the existing `fastify.decorate("googleVerifier", ...)` call:

```ts
  fastify.decorate("env", env);
  fastify.decorate(
    "googleVerifier",
    createGoogleIdTokenVerifier(env.GOOGLE_CLIENT_ID),
  );
  fastify.decorate("resend", createResendClient(env.RESEND_API_KEY));
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck --workspace=@harmon/api`
Expected: no errors.

- [ ] **Step 4: Run the full existing test suite to confirm nothing broke**

Run: `cd apps/api && npx vitest run`
Expected: all currently-passing tests still pass (this task adds no new routes, so no new test file yet).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/server.ts
git commit -m "feat(api): decorate fastify instance with a Resend client"
```

---

### Task 6: Admin approve sends the real invite email

**Files:**
- Modify: `apps/api/src/admin/routes.ts` (the `POST /v1/admin/access/invites/:id/approve` handler, currently lines 153-187)
- Modify: `apps/api/src/admin/routes.test.ts`

**Interfaces:**
- Consumes: `sendInviteEmail` from `../email/templates.js` (Task 4), `fastify.resend` (Task 5), `fastify.env.WEB_APP_URL` (Task 1).

- [ ] **Step 1: Write the failing test**

Add to `apps/api/src/admin/routes.test.ts`. First, add the Resend mock near the top of the file (after the `vitest` import, before `TEST_ENV`):

```ts
import type { FastifyInstance } from "fastify";
// apps/api/src/admin/routes.test.ts
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { resetTestDb } from "../../test/db.js";
import { signAccessToken } from "../auth/jwt.js";
import { buildServer } from "../server.js";

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));
vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({ emails: { send: sendMock } })),
}));
```

(Only the `import` line and the two blocks right after it change — everything else in the file's setup is untouched.)

Then add a new describe block, after the existing `describe("POST /v1/admin/access/waitlist/:id/approve", ...)` block:

```ts
describe("POST /v1/admin/access/invites/:id/approve", () => {
  it("generates a 7-day token, sends the invite email, and moves status to approved", async () => {
    sendMock.mockResolvedValue({ data: { id: "email_test" }, error: null });
    const admin = await createUser("admin");
    const requester = await createUser("user", "inviter@harmon.dev");
    const invite = await server.prisma.invite.create({
      data: {
        inviterUserId: requester.userId,
        inviteeName: "Ciclana",
        inviteeEmail: "ciclana@example.com",
      },
    });

    const response = await server.inject({
      method: "POST",
      url: `/v1/admin/access/invites/${invite.id}/approve`,
      headers: { authorization: `Bearer ${admin.accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    const stored = await server.prisma.invite.findUniqueOrThrow({
      where: { id: invite.id },
    });
    expect(stored.status).toBe("approved");
    expect(stored.registrationTokenHash).not.toBeNull();
    expect(stored.tokenExpiresAt?.getTime()).toBeGreaterThan(Date.now());

    expect(sendMock).toHaveBeenCalledTimes(1);
    const call = sendMock.mock.calls[0][0] as { to: string; html: string };
    expect(call.to).toBe("ciclana@example.com");
    expect(call.html).toContain("/register?token=");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/api && npx vitest run src/admin/routes.test.ts -t "approve"`
Expected: FAIL — `sendMock` was never called (approve doesn't send an email yet).

- [ ] **Step 3: Edit the approve handler**

In `apps/api/src/admin/routes.ts`, add the import:

```ts
import { sendInviteEmail } from "../email/templates.js";
```

Change the `POST /v1/admin/access/invites/:id/approve` handler body from:

```ts
      const rawToken = randomBytes(24).toString("hex");
      await fastify.prisma.invite.update({
        where: { id },
        data: {
          status: "approved",
          registrationTokenHash: hashToken(rawToken),
          tokenExpiresAt: new Date(Date.now() + TOKEN_TTL_MS),
          approvedByUserId: adminId,
          approvedAt: new Date(),
        },
      });
      await fireAdminEvent(
```

to:

```ts
      const rawToken = randomBytes(24).toString("hex");
      const updated = await fastify.prisma.invite.update({
        where: { id },
        data: {
          status: "approved",
          registrationTokenHash: hashToken(rawToken),
          tokenExpiresAt: new Date(Date.now() + TOKEN_TTL_MS),
          approvedByUserId: adminId,
          approvedAt: new Date(),
        },
      });
      await sendInviteEmail(fastify.resend, {
        to: updated.inviteeEmail,
        link: `${fastify.env.WEB_APP_URL}/register?token=${rawToken}`,
      });
      await fireAdminEvent(
```

(The rest of the handler — the `fireAdminEvent` call and `return` — is unchanged.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/api && npx vitest run src/admin/routes.test.ts`
Expected: PASS (all tests in the file, including the new one).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/admin/routes.ts apps/api/src/admin/routes.test.ts
git commit -m "feat(api): send the real invite email on admin approval"
```

---

### Task 7: `test/auth-helper.ts` gains an optional `role` override

**Files:**
- Modify: `apps/api/test/auth-helper.ts`

**Interfaces:**
- Produces: `createAuthedUser(prisma, jwtSecret, overrides?: { email?: string; name?: string; role?: "user" | "admin" })` — backward compatible (role defaults to `"user"`). Tasks 8-9 use `role: "admin"` to test the admin-bypass branch of the new routes.

- [ ] **Step 1: Edit `createAuthedUser`**

Replace the contents of `apps/api/test/auth-helper.ts`:

```ts
// apps/api/test/auth-helper.ts
// Shared test helper: create a user and sign a valid access token for it,
// bypassing the full login flow (auth itself is covered by auth/routes.test.ts).
import type { PrismaClient } from "@harmon/db";
import { signAccessToken } from "../src/auth/jwt.js";

export async function createAuthedUser(
  prisma: PrismaClient,
  jwtSecret: string,
  overrides: Partial<{ email: string; name: string; role: "user" | "admin" }> = {},
): Promise<{ userId: string; accessToken: string }> {
  const role = overrides.role ?? "user";
  const user = await prisma.user.create({
    data: {
      email:
        overrides.email ??
        `user-${Math.random().toString(36).slice(2)}@harmon.dev`,
      name: overrides.name ?? "Test User",
      birthDate: new Date("1990-01-01"),
      role,
    },
  });
  const accessToken = await signAccessToken({ sub: user.id, role }, jwtSecret);
  return { userId: user.id, accessToken };
}
```

- [ ] **Step 2: Run the existing test suites that use this helper to confirm nothing broke**

Run: `cd apps/api && npx vitest run src/connections/routes.test.ts src/invites/routes.test.ts`
Expected: PASS — every existing call site omits `role`, so behavior is unchanged.

- [ ] **Step 3: Commit**

```bash
git add apps/api/test/auth-helper.ts
git commit -m "test(api): let createAuthedUser create admin users"
```

---

### Task 8: `DELETE /v1/invites/:id` + `POST /v1/invites/:id/resend`

**Files:**
- Modify: `apps/api/src/invites/routes.ts`
- Modify: `apps/api/src/invites/routes.test.ts`

**Interfaces:**
- Consumes: `TOKEN_TTL_MS` (Task 1), `sendInviteEmail` (Task 4), `fastify.resend`/`fastify.env.WEB_APP_URL` (Tasks 1, 5), `createAuthedUser(..., { role })` (Task 7).
- Produces: `DELETE /v1/invites/:id` → `{ ok: true }`; `POST /v1/invites/:id/resend` → `{ id: string, status: "approved" }`.

- [ ] **Step 1: Write the failing tests**

Add the Resend mock to the top of `apps/api/src/invites/routes.test.ts` (same pattern as Task 6):

```ts
import type { FastifyInstance } from "fastify";
// apps/api/src/invites/routes.test.ts
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createAuthedUser } from "../../test/auth-helper.js";
import { resetTestDb } from "../../test/db.js";
import { buildServer } from "../server.js";

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));
vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({ emails: { send: sendMock } })),
}));
```

Add a helper right after the existing `authedUser()` function:

```ts
async function authedAdmin() {
  return createAuthedUser(server.prisma, TEST_ENV.JWT_SECRET, { role: "admin" });
}
```

Append these new describe blocks at the end of the file:

```ts
describe("DELETE /v1/invites/:id", () => {
  it("lets the inviter delete their own pending invite", async () => {
    const { userId, accessToken } = await authedUser();
    const invite = await server.prisma.invite.create({
      data: { inviterUserId: userId, inviteeName: "X", inviteeEmail: "x@example.com" },
    });

    const response = await server.inject({
      method: "DELETE",
      url: `/v1/invites/${invite.id}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    expect(await server.prisma.invite.findUnique({ where: { id: invite.id } })).toBeNull();
  });

  it("lets an admin delete someone else's invite", async () => {
    const { userId } = await authedUser();
    const admin = await authedAdmin();
    const invite = await server.prisma.invite.create({
      data: { inviterUserId: userId, inviteeName: "X", inviteeEmail: "x@example.com" },
    });

    const response = await server.inject({
      method: "DELETE",
      url: `/v1/invites/${invite.id}`,
      headers: { authorization: `Bearer ${admin.accessToken}` },
    });

    expect(response.statusCode).toBe(200);
  });

  it("404s for a stranger who is neither the inviter nor an admin", async () => {
    const { userId } = await authedUser();
    const stranger = await authedUser();
    const invite = await server.prisma.invite.create({
      data: { inviterUserId: userId, inviteeName: "X", inviteeEmail: "x@example.com" },
    });

    const response = await server.inject({
      method: "DELETE",
      url: `/v1/invites/${invite.id}`,
      headers: { authorization: `Bearer ${stranger.accessToken}` },
    });

    expect(response.statusCode).toBe(404);
  });

  it("blocks deleting an invite that already resulted in a registered account", async () => {
    const { userId, accessToken } = await authedUser();
    const invite = await server.prisma.invite.create({
      data: {
        inviterUserId: userId,
        inviteeName: "X",
        inviteeEmail: "x@example.com",
        status: "registered",
      },
    });

    const response = await server.inject({
      method: "DELETE",
      url: `/v1/invites/${invite.id}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(400);
  });
});

describe("POST /v1/invites/:id/resend", () => {
  it("regenerates the token and sends the invite email for an approved invite", async () => {
    sendMock.mockResolvedValue({ data: { id: "email_test" }, error: null });
    const { userId, accessToken } = await authedUser();
    const invite = await server.prisma.invite.create({
      data: {
        inviterUserId: userId,
        inviteeName: "X",
        inviteeEmail: "x@example.com",
        status: "approved",
        registrationTokenHash: "old-hash",
        tokenExpiresAt: new Date(Date.now() - 1000),
      },
    });

    const response = await server.inject({
      method: "POST",
      url: `/v1/invites/${invite.id}/resend`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    const stored = await server.prisma.invite.findUniqueOrThrow({ where: { id: invite.id } });
    expect(stored.registrationTokenHash).not.toBe("old-hash");
    expect(stored.tokenExpiresAt?.getTime()).toBeGreaterThan(Date.now());
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect((sendMock.mock.calls[0][0] as { to: string }).to).toBe("x@example.com");
  });

  it("blocks resending an invite that was never approved", async () => {
    const { userId, accessToken } = await authedUser();
    const invite = await server.prisma.invite.create({
      data: { inviterUserId: userId, inviteeName: "X", inviteeEmail: "x@example.com" },
    });

    const response = await server.inject({
      method: "POST",
      url: `/v1/invites/${invite.id}/resend`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(400);
  });

  it("lets an admin resend someone else's approved invite", async () => {
    sendMock.mockResolvedValue({ data: { id: "email_test" }, error: null });
    const { userId } = await authedUser();
    const admin = await authedAdmin();
    const invite = await server.prisma.invite.create({
      data: {
        inviterUserId: userId,
        inviteeName: "X",
        inviteeEmail: "x@example.com",
        status: "approved",
        registrationTokenHash: "old-hash",
        tokenExpiresAt: new Date(Date.now() + 1000),
      },
    });

    const response = await server.inject({
      method: "POST",
      url: `/v1/invites/${invite.id}/resend`,
      headers: { authorization: `Bearer ${admin.accessToken}` },
    });

    expect(response.statusCode).toBe(200);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd apps/api && npx vitest run src/invites/routes.test.ts`
Expected: FAIL — the two routes don't exist yet (404s from Fastify's default not-found handler, not the assertions above).

- [ ] **Step 3: Implement the two routes**

Replace the full contents of `apps/api/src/invites/routes.ts`:

```ts
// apps/api/src/invites/routes.ts
// BACKLOG.md US-8.2 — convites usuário-a-usuário. Nasce awaiting_approval;
// o mesmo painel Acessos do Épico 7 (apps/api/src/admin/routes.ts) já sabe
// aprovar/rejeitar — esta rota só cria o pedido e lista o status pro convidante.
//
// Excluir/reenviar (sprint 15): autorização inline — dono (inviterUserId)
// OU admin, na mesma rota de auto-serviço, em vez de uma família de rotas
// /v1/admin/* separada (ver docs/superpowers/specs/2026-07-28-invite-
// connection-cancel-resend-design.md). Excluir é hard delete, bloqueado só
// quando status já é "registered". Reenviar só quando status é "approved"
// (nada foi aprovado/enviado antes disso).
import { randomBytes } from "node:crypto";
import type { Prisma } from "@harmon/db";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { TOKEN_TTL_MS } from "../access/tokens.js";
import { requireUser } from "../auth/authenticate.js";
import { hashToken } from "../auth/refresh-tokens.js";
import { sendInviteEmail } from "../email/templates.js";
import { NOT_FOUND, VALIDATION_FAILED } from "../errors.js";

const CreateInviteBody = z
  .object({
    inviteeName: z.string().min(1),
    inviteeEmail: z.string().email(),
  })
  .strict();

async function fireEvent(
  fastify: FastifyInstance,
  userId: string,
  type: string,
  aggregateId: string,
  payload: Prisma.InputJsonValue,
): Promise<void> {
  await fastify.prisma.domainEvent.create({
    data: { userId, type, aggregateType: "Invite", aggregateId, payload },
  });
}

export async function registerInviteRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.get(
    "/v1/invites",
    { preHandler: requireUser(fastify) },
    async (request) => {
      // biome-ignore lint/style/noNonNullAssertion: set by requireUser() preHandler, which runs before this handler and throws if auth fails
      const userId = request.userId!;
      const invites = await fastify.prisma.invite.findMany({
        where: { inviterUserId: userId },
        orderBy: { createdAt: "desc" },
      });
      return invites.map((i) => ({
        id: i.id,
        inviteeName: i.inviteeName,
        inviteeEmail: i.inviteeEmail,
        status: i.status,
        createdAt: i.createdAt.toISOString(),
      }));
    },
  );

  fastify.post(
    "/v1/invites",
    { schema: { body: CreateInviteBody }, preHandler: requireUser(fastify) },
    async (request, reply) => {
      // biome-ignore lint/style/noNonNullAssertion: set by requireUser() preHandler, which runs before this handler and throws if auth fails
      const userId = request.userId!;
      const body = request.body as z.infer<typeof CreateInviteBody>;

      const invite = await fastify.prisma.invite.create({
        data: {
          inviterUserId: userId,
          inviteeName: body.inviteeName,
          inviteeEmail: body.inviteeEmail,
        },
      });

      reply.code(201);
      return {
        id: invite.id,
        inviteeName: invite.inviteeName,
        inviteeEmail: invite.inviteeEmail,
        status: invite.status,
      };
    },
  );

  fastify.delete(
    "/v1/invites/:id",
    { preHandler: requireUser(fastify) },
    async (request) => {
      // biome-ignore lint/style/noNonNullAssertion: set by requireUser() preHandler, which runs before this handler and throws if auth fails
      const userId = request.userId!;
      const { id } = request.params as { id: string };
      const invite = await fastify.prisma.invite.findUnique({ where: { id } });
      if (!invite || (invite.inviterUserId !== userId && request.userRole !== "admin")) {
        throw NOT_FOUND();
      }
      if (invite.status === "registered") {
        throw VALIDATION_FAILED([
          { field: "id", message: "Este convite já resultou em um cadastro." },
        ]);
      }

      await fastify.prisma.invite.delete({ where: { id } });
      await fireEvent(fastify, userId, "invite.deleted", id, {
        inviteeEmail: invite.inviteeEmail,
      });
      return { ok: true };
    },
  );

  fastify.post(
    "/v1/invites/:id/resend",
    { preHandler: requireUser(fastify) },
    async (request) => {
      // biome-ignore lint/style/noNonNullAssertion: set by requireUser() preHandler, which runs before this handler and throws if auth fails
      const userId = request.userId!;
      const { id } = request.params as { id: string };
      const invite = await fastify.prisma.invite.findUnique({ where: { id } });
      if (!invite || (invite.inviterUserId !== userId && request.userRole !== "admin")) {
        throw NOT_FOUND();
      }
      if (invite.status !== "approved") {
        throw VALIDATION_FAILED([
          { field: "id", message: "Este convite ainda não foi aprovado." },
        ]);
      }

      const rawToken = randomBytes(24).toString("hex");
      const updated = await fastify.prisma.invite.update({
        where: { id },
        data: {
          registrationTokenHash: hashToken(rawToken),
          tokenExpiresAt: new Date(Date.now() + TOKEN_TTL_MS),
        },
      });
      await sendInviteEmail(fastify.resend, {
        to: updated.inviteeEmail,
        link: `${fastify.env.WEB_APP_URL}/register?token=${rawToken}`,
      });
      await fireEvent(fastify, userId, "invite.resent", id, {
        inviteeEmail: updated.inviteeEmail,
      });
      return { id: updated.id, status: updated.status };
    },
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd apps/api && npx vitest run src/invites/routes.test.ts`
Expected: PASS (all tests in the file).

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck --workspace=@harmon/api`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/invites/routes.ts apps/api/src/invites/routes.test.ts
git commit -m "feat(api): add delete/resend for Invite (owner or admin)"
```

---

### Task 9: `DELETE /v1/connections/:id` + `POST /v1/connections/:id/resend` + email on create

**Files:**
- Modify: `apps/api/src/connections/routes.ts`
- Modify: `apps/api/src/connections/routes.test.ts`

**Interfaces:**
- Consumes: `sendConnectionRequestEmail` (Task 4), `fastify.resend`/`fastify.env.WEB_APP_URL` (Tasks 1, 5), `createAuthedUser(..., { role })` (Task 7).
- Produces: `DELETE /v1/connections/:id` → `{ ok: true }`; `POST /v1/connections/:id/resend` → `{ id: string, status: "pending" }`. `POST /v1/connections` (existing) now also sends an email as a side effect.

- [ ] **Step 1: Write the failing tests**

Add the Resend mock to the top of `apps/api/src/connections/routes.test.ts` (same pattern as Tasks 6/8):

```ts
import type { FastifyInstance } from "fastify";
// apps/api/src/connections/routes.test.ts
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createAuthedUser } from "../../test/auth-helper.js";
import { resetTestDb } from "../../test/db.js";
import { buildServer } from "../server.js";

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));
vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({ emails: { send: sendMock } })),
}));
```

Add a helper right after the existing `authedUser()` function:

```ts
async function authedAdmin() {
  return createAuthedUser(server.prisma, TEST_ENV.JWT_SECRET, { role: "admin" });
}
```

Add a `beforeEach` right after the existing `afterEach`/`afterAll` blocks to reset the mock's default resolution before each test (some existing tests in this file call `POST /v1/connections`, which will now also call `sendMock` — give it a default success so those don't start failing):

```ts
import { beforeEach } from "vitest"; // add to the existing vitest import line instead of a separate line

beforeEach(() => {
  sendMock.mockResolvedValue({ data: { id: "email_test" }, error: null });
});
```

(Fold `beforeEach` into the existing `import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";` line rather than a second import line — final line reads `import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";`.)

Append these new describe blocks at the end of the file:

```ts
describe("POST /v1/connections sends a notification email", () => {
  it("emails the addressee when a connection request is created", async () => {
    const a = await authedUser("a@harmon.dev");
    await authedUser("b@harmon.dev");

    await server.inject({
      method: "POST",
      url: "/v1/connections",
      headers: { authorization: `Bearer ${a.accessToken}` },
      payload: { addresseeEmail: "b@harmon.dev" },
    });

    expect(sendMock).toHaveBeenCalledTimes(1);
    const call = sendMock.mock.calls[0][0] as { to: string; html: string };
    expect(call.to).toBe("b@harmon.dev");
    expect(call.html).toContain("/connections");
  });
});

describe("DELETE /v1/connections/:id", () => {
  it("lets the requester delete their own pending connection", async () => {
    const a = await authedUser("a@harmon.dev");
    await authedUser("b@harmon.dev");
    const created = await server.inject({
      method: "POST",
      url: "/v1/connections",
      headers: { authorization: `Bearer ${a.accessToken}` },
      payload: { addresseeEmail: "b@harmon.dev" },
    });

    const response = await server.inject({
      method: "DELETE",
      url: `/v1/connections/${created.json().id}`,
      headers: { authorization: `Bearer ${a.accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    const stored = await server.prisma.userConnection.findUnique({
      where: { id: created.json().id },
    });
    expect(stored).toBeNull();
  });

  it("blocks the addressee from deleting it (they have accept/reject instead)", async () => {
    const a = await authedUser("a@harmon.dev");
    const b = await authedUser("b@harmon.dev");
    const created = await server.inject({
      method: "POST",
      url: "/v1/connections",
      headers: { authorization: `Bearer ${a.accessToken}` },
      payload: { addresseeEmail: "b@harmon.dev" },
    });

    const response = await server.inject({
      method: "DELETE",
      url: `/v1/connections/${created.json().id}`,
      headers: { authorization: `Bearer ${b.accessToken}` },
    });

    expect(response.statusCode).toBe(404);
  });

  it("lets an admin delete someone else's pending connection", async () => {
    const a = await authedUser("a@harmon.dev");
    await authedUser("b@harmon.dev");
    const admin = await authedAdmin();
    const created = await server.inject({
      method: "POST",
      url: "/v1/connections",
      headers: { authorization: `Bearer ${a.accessToken}` },
      payload: { addresseeEmail: "b@harmon.dev" },
    });

    const response = await server.inject({
      method: "DELETE",
      url: `/v1/connections/${created.json().id}`,
      headers: { authorization: `Bearer ${admin.accessToken}` },
    });

    expect(response.statusCode).toBe(200);
  });

  it("blocks deleting a connection that was already accepted", async () => {
    const a = await authedUser("a@harmon.dev");
    const b = await authedUser("b@harmon.dev");
    const created = await server.inject({
      method: "POST",
      url: "/v1/connections",
      headers: { authorization: `Bearer ${a.accessToken}` },
      payload: { addresseeEmail: "b@harmon.dev" },
    });
    await server.inject({
      method: "POST",
      url: `/v1/connections/${created.json().id}/accept`,
      headers: { authorization: `Bearer ${b.accessToken}` },
    });

    const response = await server.inject({
      method: "DELETE",
      url: `/v1/connections/${created.json().id}`,
      headers: { authorization: `Bearer ${a.accessToken}` },
    });

    expect(response.statusCode).toBe(400);
  });
});

describe("POST /v1/connections/:id/resend", () => {
  it("re-sends the notification email without changing status", async () => {
    const a = await authedUser("a@harmon.dev");
    await authedUser("b@harmon.dev");
    const created = await server.inject({
      method: "POST",
      url: "/v1/connections",
      headers: { authorization: `Bearer ${a.accessToken}` },
      payload: { addresseeEmail: "b@harmon.dev" },
    });
    sendMock.mockClear();

    const response = await server.inject({
      method: "POST",
      url: `/v1/connections/${created.json().id}/resend`,
      headers: { authorization: `Bearer ${a.accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().status).toBe("pending");
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it("blocks resending a connection that was already accepted", async () => {
    const a = await authedUser("a@harmon.dev");
    const b = await authedUser("b@harmon.dev");
    const created = await server.inject({
      method: "POST",
      url: "/v1/connections",
      headers: { authorization: `Bearer ${a.accessToken}` },
      payload: { addresseeEmail: "b@harmon.dev" },
    });
    await server.inject({
      method: "POST",
      url: `/v1/connections/${created.json().id}/accept`,
      headers: { authorization: `Bearer ${b.accessToken}` },
    });

    const response = await server.inject({
      method: "POST",
      url: `/v1/connections/${created.json().id}/resend`,
      headers: { authorization: `Bearer ${a.accessToken}` },
    });

    expect(response.statusCode).toBe(400);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd apps/api && npx vitest run src/connections/routes.test.ts`
Expected: FAIL — no email sent on create yet, and the delete/resend routes don't exist.

- [ ] **Step 3: Implement the changes**

Replace the full contents of `apps/api/src/connections/routes.ts`:

```ts
// apps/api/src/connections/routes.ts
// BACKLOG.md US-6.2 — conexões entre usuários (ARQUITETURA.md §6.10).
//
// Escopo: UserConnection.addresseeUserId é NOT NULL no schema (§1.2,
// decisão do Sprint 1) — não dá pra gerar um link "cego" sem saber quem vai
// aceitar. Por isso POST /v1/connections pede o e-mail do convidado (deve já
// ser um usuário Harmon cadastrado) em vez de um token público standalone; o
// token gerado ainda existe (connectionTokenHash) para o caso de A querer
// mandar um link, mas aceitar via /v1/connections/:id/accept (in-app,
// exigindo que o usuário autenticado SEJA o addressee) é o caminho principal
// — token-based accept-by-link para alguém ainda sem conta pertence ao
// Épico 8 (convites), fora deste sprint.
//
// Excluir/reenviar (sprint 15): autorização inline — dono (requesterUserId,
// nunca addressee — ele tem accept/reject) OU admin. Excluir é hard delete,
// só quando status="pending". Reenviar só reenvia o e-mail de notificação
// (sem token/estado) — ver docs/superpowers/specs/2026-07-28-invite-
// connection-cancel-resend-design.md.
import { randomBytes } from "node:crypto";
import type { Prisma } from "@harmon/db";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireUser } from "../auth/authenticate.js";
import { hashToken } from "../auth/refresh-tokens.js";
import { sendConnectionRequestEmail } from "../email/templates.js";
import { NOT_FOUND, VALIDATION_FAILED } from "../errors.js";

const CreateConnectionBody = z.object({ addresseeEmail: z.string().email() });

async function fireEvent(
  fastify: FastifyInstance,
  userId: string,
  type: string,
  aggregateId: string,
  payload: Prisma.InputJsonValue,
): Promise<void> {
  await fastify.prisma.domainEvent.create({
    data: {
      userId,
      type,
      aggregateType: "UserConnection",
      aggregateId,
      payload,
    },
  });
}

export async function registerConnectionRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.get(
    "/v1/connections",
    { preHandler: requireUser(fastify) },
    async (request) => {
      // biome-ignore lint/style/noNonNullAssertion: set by requireUser() preHandler, which runs before this handler and throws if auth fails
      const userId = request.userId!;
      const connections = await fastify.prisma.userConnection.findMany({
        where: {
          OR: [{ requesterUserId: userId }, { addresseeUserId: userId }],
        },
        orderBy: { createdAt: "desc" },
      });
      const counterpartIds = [
        ...new Set(
          connections.map((c) =>
            c.requesterUserId === userId
              ? c.addresseeUserId
              : c.requesterUserId,
          ),
        ),
      ];
      const counterparts = await fastify.prisma.user.findMany({
        where: { id: { in: counterpartIds } },
      });
      const counterpartById = new Map(counterparts.map((u) => [u.id, u]));

      // Saldo de acerto (§6.10): soma das transações atribuídas a cada
      // contraparte, ainda não acertadas. amountBRLCents é sempre positivo
      // (§0) — kind carrega o sinal do dono original da transação, não da
      // relação de acerto; expense = eu paguei algo do/para o portador
      // (a meu favor), income = o inverso.
      const unsettled = await fastify.prisma.transaction.findMany({
        where: {
          userId,
          portadorUserId: { in: counterpartIds },
          portadorSettled: false,
        },
      });
      const balanceByCounterpart = new Map<string, number>();
      for (const tx of unsettled) {
        if (!tx.portadorUserId) continue;
        const sign = tx.kind === "expense" ? 1 : tx.kind === "income" ? -1 : 0;
        balanceByCounterpart.set(
          tx.portadorUserId,
          (balanceByCounterpart.get(tx.portadorUserId) ?? 0) +
            sign * tx.amountBRLCents,
        );
      }

      return connections.map((c) => {
        const counterpartId =
          c.requesterUserId === userId ? c.addresseeUserId : c.requesterUserId;
        const counterpart = counterpartById.get(counterpartId);
        return {
          id: c.id,
          status: c.status,
          isRequester: c.requesterUserId === userId,
          counterpartUserId: counterpartId,
          counterpartName: counterpart?.name ?? "",
          counterpartEmail: counterpart?.email ?? "",
          createdAt: c.createdAt.toISOString(),
          respondedAt: c.respondedAt?.toISOString() ?? null,
          settlementBalanceCents: balanceByCounterpart.get(counterpartId) ?? 0,
        };
      });
    },
  );

  fastify.post(
    "/v1/connections",
    {
      schema: { body: CreateConnectionBody },
      preHandler: requireUser(fastify),
    },
    async (request, reply) => {
      // biome-ignore lint/style/noNonNullAssertion: set by requireUser() preHandler, which runs before this handler and throws if auth fails
      const userId = request.userId!;
      const body = request.body as z.infer<typeof CreateConnectionBody>;

      const addressee = await fastify.prisma.user.findUnique({
        where: { email: body.addresseeEmail },
      });
      if (!addressee || addressee.status !== "active") {
        throw VALIDATION_FAILED([
          {
            field: "addresseeEmail",
            message: "Não encontramos um usuário Harmon com esse e-mail.",
          },
        ]);
      }
      if (addressee.id === userId) {
        throw VALIDATION_FAILED([
          {
            field: "addresseeEmail",
            message: "Você não pode se conectar com você mesmo.",
          },
        ]);
      }
      const existing = await fastify.prisma.userConnection.findUnique({
        where: {
          requesterUserId_addresseeUserId: {
            requesterUserId: userId,
            addresseeUserId: addressee.id,
          },
        },
      });
      if (existing) {
        throw VALIDATION_FAILED([
          {
            field: "addresseeEmail",
            message: "Já existe uma conexão (ou convite) com esse usuário.",
          },
        ]);
      }

      const requester = await fastify.prisma.user.findUniqueOrThrow({
        where: { id: userId },
      });
      const rawToken = randomBytes(24).toString("hex");
      const connection = await fastify.prisma.userConnection.create({
        data: {
          requesterUserId: userId,
          addresseeUserId: addressee.id,
          status: "pending",
          connectionTokenHash: hashToken(rawToken),
        },
      });
      await sendConnectionRequestEmail(fastify.resend, {
        to: addressee.email,
        requesterName: requester.name,
        link: `${fastify.env.WEB_APP_URL}/connections`,
      });
      await fireEvent(fastify, userId, "connection.requested", connection.id, {
        counterpartUserId: addressee.id,
      });

      reply.code(201);
      return { id: connection.id, status: connection.status };
    },
  );

  fastify.post(
    "/v1/connections/:id/accept",
    { preHandler: requireUser(fastify) },
    async (request) => {
      // biome-ignore lint/style/noNonNullAssertion: set by requireUser() preHandler, which runs before this handler and throws if auth fails
      const userId = request.userId!;
      const { id } = request.params as { id: string };
      const connection = await fastify.prisma.userConnection.findUnique({
        where: { id },
      });
      if (!connection || connection.addresseeUserId !== userId) {
        throw NOT_FOUND();
      }
      if (connection.status !== "pending") {
        throw VALIDATION_FAILED([
          { field: "id", message: "Este convite já foi respondido." },
        ]);
      }
      const updated = await fastify.prisma.userConnection.update({
        where: { id },
        data: { status: "accepted", respondedAt: new Date() },
      });
      // Ambas as timelines recebem o evento (§6.10 — "toda ponta gera evento").
      await fireEvent(fastify, userId, "connection.accepted", id, {
        counterpartUserId: connection.requesterUserId,
      });
      await fireEvent(
        fastify,
        connection.requesterUserId,
        "connection.accepted",
        id,
        {
          counterpartUserId: userId,
        },
      );
      return { id: updated.id, status: updated.status };
    },
  );

  fastify.post(
    "/v1/connections/:id/reject",
    { preHandler: requireUser(fastify) },
    async (request) => {
      // biome-ignore lint/style/noNonNullAssertion: set by requireUser() preHandler, which runs before this handler and throws if auth fails
      const userId = request.userId!;
      const { id } = request.params as { id: string };
      const connection = await fastify.prisma.userConnection.findUnique({
        where: { id },
      });
      if (!connection || connection.addresseeUserId !== userId) {
        throw NOT_FOUND();
      }
      if (connection.status !== "pending") {
        throw VALIDATION_FAILED([
          { field: "id", message: "Este convite já foi respondido." },
        ]);
      }
      const updated = await fastify.prisma.userConnection.update({
        where: { id },
        data: { status: "rejected", respondedAt: new Date() },
      });
      await fireEvent(fastify, userId, "connection.rejected", id, {
        counterpartUserId: connection.requesterUserId,
      });
      await fireEvent(
        fastify,
        connection.requesterUserId,
        "connection.rejected",
        id,
        {
          counterpartUserId: userId,
        },
      );
      return { id: updated.id, status: updated.status };
    },
  );

  fastify.delete(
    "/v1/connections/:id",
    { preHandler: requireUser(fastify) },
    async (request) => {
      // biome-ignore lint/style/noNonNullAssertion: set by requireUser() preHandler, which runs before this handler and throws if auth fails
      const userId = request.userId!;
      const { id } = request.params as { id: string };
      const connection = await fastify.prisma.userConnection.findUnique({
        where: { id },
      });
      if (
        !connection ||
        (connection.requesterUserId !== userId && request.userRole !== "admin")
      ) {
        throw NOT_FOUND();
      }
      if (connection.status !== "pending") {
        throw VALIDATION_FAILED([
          { field: "id", message: "Este pedido de conexão já foi respondido." },
        ]);
      }

      await fastify.prisma.userConnection.delete({ where: { id } });
      await fireEvent(fastify, userId, "connection.deleted", id, {
        counterpartUserId: connection.addresseeUserId,
      });
      await fireEvent(
        fastify,
        connection.addresseeUserId,
        "connection.deleted",
        id,
        { counterpartUserId: connection.requesterUserId },
      );
      return { ok: true };
    },
  );

  fastify.post(
    "/v1/connections/:id/resend",
    { preHandler: requireUser(fastify) },
    async (request) => {
      // biome-ignore lint/style/noNonNullAssertion: set by requireUser() preHandler, which runs before this handler and throws if auth fails
      const userId = request.userId!;
      const { id } = request.params as { id: string };
      const connection = await fastify.prisma.userConnection.findUnique({
        where: { id },
      });
      if (
        !connection ||
        (connection.requesterUserId !== userId && request.userRole !== "admin")
      ) {
        throw NOT_FOUND();
      }
      if (connection.status !== "pending") {
        throw VALIDATION_FAILED([
          { field: "id", message: "Este pedido de conexão já foi respondido." },
        ]);
      }

      const [requester, addressee] = await Promise.all([
        fastify.prisma.user.findUniqueOrThrow({
          where: { id: connection.requesterUserId },
        }),
        fastify.prisma.user.findUniqueOrThrow({
          where: { id: connection.addresseeUserId },
        }),
      ]);
      await sendConnectionRequestEmail(fastify.resend, {
        to: addressee.email,
        requesterName: requester.name,
        link: `${fastify.env.WEB_APP_URL}/connections`,
      });
      await fireEvent(fastify, userId, "connection.resent", id, {
        counterpartUserId: connection.addresseeUserId,
      });
      return { id: connection.id, status: connection.status };
    },
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd apps/api && npx vitest run src/connections/routes.test.ts`
Expected: PASS (all tests in the file).

- [ ] **Step 5: Run typecheck and the full backend suite**

Run: `npm run typecheck --workspace=@harmon/api && (cd apps/api && npx vitest run)`
Expected: no type errors, all tests pass (including Tasks 6 and 8's files, which also touch mocked Resend).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/connections/routes.ts apps/api/src/connections/routes.test.ts
git commit -m "feat(api): add delete/resend for UserConnection, notify on create"
```

---

### Task 10: `ConnectionsPage.tsx` — delete/resend buttons

**Files:**
- Modify: `apps/web/src/routes/ConnectionsPage.tsx`

**Interfaces:**
- Consumes: `apiFetchJson` (existing), `MyInviteDto`/`ConnectionDto` (existing, unchanged shape — delete/resend don't add response fields the list needs).

- [ ] **Step 1: Add the four mutations**

In `apps/web/src/routes/ConnectionsPage.tsx`, right after the existing `revokeShareMutation` (currently ending around line 507), add:

```ts
  const deleteConnectionMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetchJson(`/connections/${id}`, { method: "DELETE" }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["connections"] }),
  });
  const resendConnectionMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetchJson(`/connections/${id}/resend`, { method: "POST" }),
  });
  const deleteInviteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetchJson(`/invites/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invites"] }),
  });
  const resendInviteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetchJson(`/invites/${id}/resend`, { method: "POST" }),
  });
```

- [ ] **Step 2: Add buttons to the "Convites enviados" section**

Replace the "Convites enviados" section (currently lines 580-604):

```tsx
      {sentInvites.length > 0 ? (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--hm-text-2)]">
            Convites enviados
          </h2>
          <div className="flex flex-col gap-2">
            {sentInvites.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-[var(--hm-r-lg)] border border-[var(--hm-border)] p-4"
              >
                <div>
                  <p className="text-[var(--hm-text)]">{c.counterpartName}</p>
                  <p className="text-sm text-[var(--hm-text-2)]">
                    {c.counterpartEmail}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-[var(--hm-text-2)]">
                    Aguardando resposta
                  </p>
                  <Button
                    variant="secondary"
                    loading={resendConnectionMutation.isPending}
                    onClick={() => resendConnectionMutation.mutate(c.id)}
                  >
                    Reenviar
                  </Button>
                  <Button
                    variant="secondary"
                    loading={deleteConnectionMutation.isPending}
                    onClick={() => deleteConnectionMutation.mutate(c.id)}
                  >
                    Excluir
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
```

- [ ] **Step 3: Add buttons to the "Convidar para o Harmon" section**

Replace the invites-list block inside the "Convidar para o Harmon" section (currently lines 689-708):

```tsx
        {invitesQuery.data && invitesQuery.data.length > 0 ? (
          <div className="flex flex-col gap-2">
            {invitesQuery.data.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between rounded-[var(--hm-r-lg)] border border-[var(--hm-border)] p-4"
              >
                <div>
                  <p className="text-[var(--hm-text)]">{invite.inviteeName}</p>
                  <p className="text-sm text-[var(--hm-text-2)]">
                    {invite.inviteeEmail}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-[var(--hm-text-2)]">
                    {INVITE_STATUS_LABEL[invite.status]}
                  </p>
                  {invite.status === "approved" ? (
                    <Button
                      variant="secondary"
                      loading={resendInviteMutation.isPending}
                      onClick={() => resendInviteMutation.mutate(invite.id)}
                    >
                      Reenviar
                    </Button>
                  ) : null}
                  {invite.status !== "registered" ? (
                    <Button
                      variant="secondary"
                      loading={deleteInviteMutation.isPending}
                      onClick={() => deleteInviteMutation.mutate(invite.id)}
                    >
                      Excluir
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}
```

- [ ] **Step 4: Run the frontend typecheck**

Run: `npm run typecheck --workspace=@harmon/web`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/routes/ConnectionsPage.tsx
git commit -m "feat(web): add delete/resend buttons for invites and connections"
```

---

### Task 11: `AdminPage.tsx` — delete button on pending invites

**Files:**
- Modify: `apps/web/src/routes/AdminPage.tsx`

- [ ] **Step 1: Add the mutation**

Right after the existing `rejectInviteMutation` (currently ending around line 76), add:

```ts
  const deleteInviteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetchJson(`/invites/${id}`, { method: "DELETE" }),
    onSuccess: invalidateAccess,
  });
```

- [ ] **Step 2: Add the button**

In the invites `.map()` block (currently lines 167-199), add a third button after "Aprovar":

```tsx
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between rounded-[var(--hm-r-lg)] border border-[var(--hm-border)] p-4"
              >
                <div>
                  <p className="text-[var(--hm-text)]">
                    {invite.inviteeName}{" "}
                    <Badge kind="status" status="pending">
                      Convite
                    </Badge>
                  </p>
                  <p className="text-sm text-[var(--hm-text-2)]">
                    {invite.inviteeEmail}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    loading={deleteInviteMutation.isPending}
                    onClick={() => deleteInviteMutation.mutate(invite.id)}
                  >
                    Excluir
                  </Button>
                  <Button
                    variant="secondary"
                    loading={rejectInviteMutation.isPending}
                    onClick={() => rejectInviteMutation.mutate(invite.id)}
                  >
                    Recusar
                  </Button>
                  <Button
                    loading={approveInviteMutation.isPending}
                    onClick={() => approveInviteMutation.mutate(invite.id)}
                  >
                    Aprovar
                  </Button>
                </div>
              </div>
            ))}
```

- [ ] **Step 3: Run the frontend typecheck**

Run: `npm run typecheck --workspace=@harmon/web`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/routes/AdminPage.tsx
git commit -m "feat(web): let admin delete a pending invite from Acessos"
```

---

### Task 12: Manual verification (Playwright)

**Files:** none (verification only).

- [ ] **Step 1: Start the stack**

Run: `docker compose up -d` (Postgres/Redis), then in two terminals: `npm run dev --workspace=@harmon/api` and `npm run dev --workspace=@harmon/web`.

- [ ] **Step 2: Seed two users and an admin**

Use the existing dev seed script/flow (or the app's registration screens) to have: user A (inviter), user B (a second registered user, for the connection flow), and an admin account.

- [ ] **Step 3: Invite flow as the inviter**

Log in as A. Go to `/connections`. In "Convidar para o Harmon", create an invite. As the admin (separate browser/session), go to `/admin`, approve it — confirm no error (email send succeeds against the real `RESEND_API_KEY` in `.env`, or check the Fastify log for the Resend response). Back as A, confirm the invite shows "Aprovado — aguardando cadastro" with a "Reenviar" button; click it, confirm no error. Confirm "Excluir" removes the invite from the list.

- [ ] **Step 4: Connection flow as the requester**

Still as A, connect to B by email. Confirm the "Convites enviados" section shows "Reenviar" and "Excluir" buttons. Click "Reenviar", confirm no error. Click "Excluir", confirm the row disappears and, as B, the pending request is gone from "Convites recebidos".

- [ ] **Step 5: Admin bypass**

As A, create a fresh invite and a fresh connection request to B. As the admin, confirm the admin can delete the pending invite from the Acessos panel. (Admin has no UI for the connection per the spec's scope decision — skip that part.)

- [ ] **Step 6: Report results**

Note any failures with the exact error message and which step reproduced it; fix before considering the plan complete.

---

## Self-Review Notes

- **Spec coverage:** every bullet in the spec's Escopo/Rotas/E-mails/Frontend/Erros sections maps to a task above (Tasks 1, 5 → env/wiring; Task 2-4 → templates; Task 6 → admin approve; Tasks 8-9 → the four new routes + create-time email; Tasks 10-11 → UI; Task 12 → the manual QA the spec calls for since there's no component test suite for these pages).
- **Type consistency:** `sendInviteEmail`/`sendConnectionRequestEmail` signatures in Task 4 match every call site in Tasks 6, 8, 9. `TOKEN_TTL_MS` is defined once (Task 1) and only ever imported after that.
- **No placeholders:** every step above has literal code, not a description of code to write.
