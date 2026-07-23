import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-a11y", "storybook-addon-pseudo-states"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  core: {
    // Storybook must never reach out to telemetry / external services during
    // a build — this app is meant to build fully offline (US-1.9).
    disableTelemetry: true,
  },
  docs: {
    defaultName: "Docs",
  },
  typescript: {
    reactDocgen: "react-docgen-typescript",
  },
};

export default config;
