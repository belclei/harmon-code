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
          "Gatilho de ação base do Lurem. Componente burro: nunca decide o que " +
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
      options: ["primary", "secondary", "tertiary", "danger", "link"],
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
  "link",
];
const LABELS: Record<ButtonVariant, string> = {
  primary: "Primário",
  secondary: "Secundário",
  tertiary: "Terciário",
  danger: "Perigo",
  link: "Link",
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
          className="lr-label"
          style={{ fontSize: ".6875rem", color: "var(--lr-text-secondary)" }}
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

const PlusIcon = (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
);

/**
 * index.html id="botao", "com ícone": ícone à esquerda do rótulo, sempre
 * `aria-hidden` — o rótulo continua sendo o nome acessível do botão.
 */
export const ComIcone: Story = {
  render: () => (
    <Button variant="primary" icon={PlusIcon}>
      Nova transação
    </Button>
  ),
};

const MoreIcon = (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="5" r="1.6" />
    <circle cx="12" cy="12" r="1.6" />
    <circle cx="12" cy="19" r="1.6" />
  </svg>
);

/**
 * Sem rótulo: `icon` sem `children` vira um botão quadrado só-ícone
 * (antigo `IconButton`, fundido aqui). `aria-label` é obrigatório — o
 * TypeScript recusa o componente sem ele, já que o ícone é sempre
 * `aria-hidden` e não há texto visível para servir de nome acessível.
 */
export const SoIcone: Story = {
  render: () => (
    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
      <Button
        variant="tertiary"
        size="sm"
        icon={MoreIcon}
        aria-label="Mais opções"
      />
      <Button
        variant="tertiary"
        size="md"
        icon={MoreIcon}
        aria-label="Mais opções"
      />
      <Button
        variant="tertiary"
        size="lg"
        icon={MoreIcon}
        aria-label="Mais opções"
      />
      <Button
        variant="tertiary"
        icon={MoreIcon}
        aria-label="Mais opções (desabilitado)"
        disabled
      />
    </div>
  ),
};

/**
 * `link`: a 5ª variante do botão na referência (id="botao") — sem fundo,
 * sem padding, sublinhado, para ações de texto como "de onde vem esse
 * número?". Aditiva sobre a lista de 4 variantes do IMPLEMENTACAO.md.
 */
export const Link: Story = {
  render: () => <Button variant="link">De onde vem esse número?</Button>,
};
