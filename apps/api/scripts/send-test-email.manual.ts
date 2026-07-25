// apps/api/scripts/send-test-email.manual.ts
// Run manually after filling a real RESEND_API_KEY into apps/api/.env:
//   cd apps/api && npx tsx --env-file=.env scripts/send-test-email.manual.ts you@example.com
// (--env-file is required — this script doesn't go through any dotenv
// loading on its own.)
import {
  createResendClient,
  sendTestEmail,
} from "../src/email/resend-client.js";
import { loadEnv } from "../src/env.js";

const to = process.argv[2];
if (!to) {
  console.error(
    "Usage: tsx scripts/send-test-email.manual.ts <recipient-email>",
  );
  process.exit(1);
}
const env = loadEnv();
const resend = createResendClient(env.RESEND_API_KEY);
const result = await sendTestEmail(resend, to);
console.log(
  `Sent. Resend message id: ${result.id}. Check inbox + webhook logs.`,
);
