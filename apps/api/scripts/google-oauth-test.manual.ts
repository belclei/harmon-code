// apps/api/scripts/google-oauth-test.manual.ts
// Run manually after filling a real GOOGLE_CLIENT_ID into apps/api/.env:
//   cd apps/api && npx tsx --env-file=.env scripts/google-oauth-test.manual.ts
// (--env-file is required — this script, unlike the Fastify app, doesn't
// go through any dotenv loading on its own.)
// Opens a tiny local server with a real "Sign in with Google" button, and
// runs the SAME verifier the API uses (createGoogleIdTokenVerifier) against
// the real id_token Google issues — not a reimplementation of the check.
import { createServer } from "node:http";
import { createGoogleIdTokenVerifier } from "../src/auth/google.js";
import { loadEnv } from "../src/env.js";

const env = loadEnv();
const port = Number(process.argv[2] ?? 5500);
const verify = createGoogleIdTokenVerifier(env.GOOGLE_CLIENT_ID);

const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Lurem — teste manual de Google OAuth</title>
    <script src="https://accounts.google.com/gsi/client" async defer></script>
  </head>
  <body style="font-family: sans-serif; max-width: 480px; margin: 4rem auto;">
    <h1>Teste manual — Google OAuth</h1>
    <p>Clique no botão, escolha sua conta Google. O resultado da verificação
    (a mesma função que a API usa em produção) aparece abaixo.</p>
    <div id="g_id_onload"
      data-client_id="${env.GOOGLE_CLIENT_ID}"
      data-callback="onCredential">
    </div>
    <div class="g_id_signin" data-type="standard"></div>
    <pre id="result" style="background:#eee; padding:1rem; white-space:pre-wrap;"></pre>
    <script>
      async function onCredential(response) {
        const el = document.getElementById("result");
        el.textContent = "Verificando...";
        const res = await fetch("/verify", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ idToken: response.credential }),
        });
        const body = await res.json();
        el.textContent = JSON.stringify(body, null, 2);
      }
    </script>
  </body>
</html>`;

const server = createServer((req, res) => {
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(html);
    return;
  }
  if (req.method === "POST" && req.url === "/verify") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", async () => {
      try {
        const { idToken } = JSON.parse(body);
        const identity = await verify(idToken);
        console.log("Verificação OK:", identity);
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: true, identity }));
      } catch (err) {
        console.error("Verificação falhou:", err);
        res.writeHead(200, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          }),
        );
      }
    });
    return;
  }
  res.writeHead(404);
  res.end();
});

server.listen(port, () => {
  console.log(`Abra http://localhost:${port} no navegador e faça login.`);
  console.log(
    `Lembrete: http://localhost:${port} precisa estar em "Authorized JavaScript origins" no Google Cloud Console.`,
  );
});
