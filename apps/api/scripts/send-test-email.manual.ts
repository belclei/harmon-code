import {
  createResendClient,
  sendTestEmail,
} from "../src/email/resend-client.js";
// apps/api/scripts/send-test-email.manual.ts
// Run manually after filling a real RESEND_API_KEY into apps/api/.env:
//   cd apps/api && npx tsx scripts/send-test-email.manual.ts you@example.com
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
