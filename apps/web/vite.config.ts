import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Judgment call (spec asked for "a proxy or a VITE_API_URL, whichever is
// simpler"): proxying apps/api's /v1/* namespace (see apps/api/src/env.ts's
// PORT default) is simpler than wiring VITE_API_URL + CORS on the API side
// — the API doesn't set any CORS headers today, and none are documented in
// its contract. Same-origin fetches from the browser's point of view also
// sidestep same-site-but-cross-origin subtleties for the refreshToken
// cookie. A real deploy needs an equivalent reverse-proxy rule in front of
// the built static bundle; out of scope here.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/v1": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
