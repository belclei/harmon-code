import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Vite config used by Storybook's builder (@storybook/react-vite).
// This package has no runtime bundle of its own beyond Storybook —
// components are consumed as TS/TSX source by apps/web later.
export default defineConfig({
  plugins: [react(), tailwindcss()],
});
