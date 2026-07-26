import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Component tests run in jsdom. Tailwind isn't loaded here — the §4.1 hero
// test asserts on the semantic class name (`.hm-money--hero`), not computed
// styles, so it doesn't need the CSS pipeline. Kept separate from vite.config
// (dev-server proxy) on purpose.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
});
