import type { Decorator, Preview } from "@storybook/react-vite";
import React, { useEffect } from "react";
import "../src/styles/tailwind.css";

// Global toolbar control to flip the whole preview between Harmon's light
// and dark theme. The design tokens (harmon-tokens.css) key dark mode off
// `data-theme="dark"` on an ancestor element — see US-1.6.
const withTheme: Decorator = (Story, context) => {
  const theme = context.globals.theme ?? "light";

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.setAttribute("data-theme", "dark");
    } else {
      root.removeAttribute("data-theme");
    }
  }, [theme]);

  return (
    <div
      data-theme={theme === "dark" ? "dark" : undefined}
      style={{
        background: "var(--hm-bg)",
        color: "var(--hm-text)",
        minHeight: "100%",
        padding: "1.5rem",
      }}
    >
      <Story />
    </div>
  );
};

const preview: Preview = {
  parameters: {
    layout: "centered",
    a11y: {
      // Fail the check on critical violations; keep serious/moderate visible
      // as warnings so they don't silently regress.
      test: "error",
    },
    backgrounds: { disable: true },
    options: {
      storySort: {
        order: [
          "Introduction",
          "Button",
          "Input",
          "Select",
          "Alert",
          "Card",
          "Badge",
          "Skeleton",
          "Typography",
        ],
      },
    },
  },
  globalTypes: {
    theme: {
      name: "Theme",
      description: "Harmon light/dark theme",
      defaultValue: "light",
      toolbar: {
        icon: "mirror",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [withTheme],
};

export default preview;
