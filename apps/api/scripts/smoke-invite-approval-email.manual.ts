// apps/api/scripts/smoke-invite-approval-email.manual.ts
// Manual, real-network verification for BACKLOG.md §13 "E-mail de
// aprovação": approving a waitlist/invite entry generated the 7-day token
// but never sent the e-mail. This exercises the real POST
// /v1/admin/access/waitlist/:id/approve route end-to-end (real Resend send)
// against a running API, the same way send-test-email.manual.ts verifies
// the raw Resend client.
//
// Usage: cd apps/api && npx tsx --env-file=.env scripts/smoke-invite-approval-email.manual.ts you@example.com
// Requires the API dev server running locally (npm run dev --workspace=@harmon/api).
import { PrismaClient } from "@harmon/db";
import { signAccessToken } from "../src/auth/jwt.js";
import { loadEnv } from "../src/env.js";

const to = process.argv[2];
if (!to) {
  console.error(
    "Usage: tsx scripts/smoke-invite-approval-email.manual.ts <recipient-email>",
  );
  process.exit(1);
}

const env = loadEnv();
const prisma = new PrismaClient();

const admin = await prisma.user.findFirst({ where: { role: "admin" } });
if (!admin) {
  console.error("No admin user found — run scripts/seed-demo-user.ts first.");
  process.exit(1);
}

const entry = await prisma.waitlistEntry.create({
  data: { name: "Smoke Test", email: to },
});

const accessToken = await signAccessToken(
  { sub: admin.id, role: "admin" },
  env.JWT_SECRET,
);

const response = await fetch(
  `http://localhost:${env.PORT}/v1/admin/access/waitlist/${entry.id}/approve`,
  {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}` },
  },
);
console.log(response.status, await response.json());
console.log(`Check ${to}'s inbox for the approval e-mail.`);

await prisma.$disconnect();
