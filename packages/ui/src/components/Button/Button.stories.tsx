import type { Meta, StoryObj } from "@storybook/react-vite";
import { Fragment } from "react";
import { Button, type ButtonVariant } from "./Button";

const meta: Meta<typeof Button> = {
  title: "Componentes/Button",
  component: Button,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Gatilho de ação base do Harmon. Componente burro: nunca decide o que " +
          "acontece ao ser clicado — isso é responsabilidade do `onClick` recebido via prop.",
      },
    },
  },
  args: {
    children: "Confirmar",
    variant: "primary",
    size: "md",
    loading: false,
    disabled: false,
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "tertiary", "danger"],
    },
    size: { control: "select", options: ["sm", "md", "lg"] },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

/** Playground interativo — use o painel Controls para variar props. */
export const Playground: Story = {};

const VARIANTS: ButtonVariant[] = [
  "primary",
  "secondary",
  "tertiary",
  "danger",
];
const LABELS: Record<ButtonVariant, string> = {
  primary: "Primário",
  secondary: "Secundário",
  tertiary: "Terciário",
  danger: "Perigo",
};

/**
 * Matriz completa exigida pela US-1.7: 4 variantes × 5 estados
 * (default / hover / active / disabled / loading) numa única tela.
 * Hover e active são forçados via storybook-addon-pseudo-states, já que
 * são pseudo-classes de CSS e não props do componente.
 */
export const Matriz: Story = {
  parameters: {
    pseudo: {
      hover: VARIANTS.map((v) => `#btn-${v}-hover`),
      active: VARIANTS.map((v) => `#btn-${v}-active`),
    },
    docs: {
      description: {
        story: "Todas as variantes nos 5 estados exigidos por US-1.7.",
      },
    },
  },
  render: () => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "auto repeat(5, max-content)",
        alignItems: "center",
        gap: "1rem 1.5rem",
      }}
    >
      <span />
      {["Default", "Hover", "Active", "Disabled", "Loading"].map((label) => (
        <span
          key={label}
          className="hm-label"
          style={{ fontSize: ".6875rem", color: "var(--hm-text-2)" }}
        >
          {label}
        </span>
      ))}
      {VARIANTS.map((variant) => (
        <Fragment key={variant}>
          <span style={{ fontWeight: 700, fontSize: ".875rem" }}>
            {LABELS[variant]}
          </span>
          <Button variant={variant}>{LABELS[variant]}</Button>
          <Button id={`btn-${variant}-hover`} variant={variant}>
            {LABELS[variant]}
          </Button>
          <Button id={`btn-${variant}-active`} variant={variant}>
            {LABELS[variant]}
          </Button>
          <Button variant={variant} disabled>
            {LABELS[variant]}
          </Button>
          <Button variant={variant} loading>
            {LABELS[variant]}
          </Button>
        </Fragment>
      ))}
    </div>
  ),
};

export const Tamanhos: Story = {
  render: () => (
    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
      <Button size="sm">Pequeno</Button>
      <Button size="md">Médio</Button>
      <Button size="lg">Grande</Button>
    </div>
  ),
};
