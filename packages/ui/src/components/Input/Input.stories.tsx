import type { Meta, StoryObj } from "@storybook/react-vite";
import { Fragment } from "react";
import { Input, type InputType } from "./Input";

const meta: Meta<typeof Input> = {
  title: "Componentes/Input",
  component: Input,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Campo de texto base do Harmon. Sempre com label visível; validação " +
          "é responsabilidade de quem usa o componente — o `error` chega pronto via prop.",
      },
    },
  },
  args: {
    label: "Nome",
    type: "text",
    placeholder: "Digite aqui",
  },
  argTypes: {
    type: {
      control: "select",
      options: ["text", "email", "password", "number"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Playground: Story = {};

const TYPES: { type: InputType; label: string; placeholder: string }[] = [
  { type: "text", label: "Nome", placeholder: "Ana Souza" },
  { type: "email", label: "E-mail", placeholder: "ana@exemplo.com" },
  { type: "password", label: "Senha", placeholder: "••••••••" },
  { type: "number", label: "Idade", placeholder: "30" },
];

/**
 * Matriz completa exigida pela US-1.7: 4 tipos × 5 estados
 * (default / focused / filled / error / disabled).
 */
export const Matriz: Story = {
  parameters: {
    pseudo: {
      focusVisible: TYPES.map(({ type }) => `#input-${type}-focused`),
    },
    docs: {
      description: {
        story: "Todos os tipos nos 5 estados exigidos por US-1.7.",
      },
    },
  },
  render: () => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, minmax(11rem, 1fr))",
        gap: "1.5rem",
      }}
    >
      {["Default", "Focused", "Filled", "Error", "Disabled"].map((label) => (
        <span
          key={label}
          className="hm-label"
          style={{ fontSize: ".6875rem", color: "var(--hm-text-2)" }}
        >
          {label}
        </span>
      ))}
      {TYPES.map(({ type, label, placeholder }) => (
        <Fragment key={type}>
          <Input type={type} label={label} placeholder={placeholder} />
          <Input
            id={`input-${type}-focused`}
            type={type}
            label={label}
            placeholder={placeholder}
          />
          <Input type={type} label={label} defaultValue={placeholder} />
          <Input
            type={type}
            label={label}
            placeholder={placeholder}
            error="Este campo é obrigatório."
          />
          <Input type={type} label={label} placeholder={placeholder} disabled />
        </Fragment>
      ))}
    </div>
  ),
};

/** Campo obrigatório — o asterisco usa o mesmo tom (--hm-clay-600) do texto de erro, então precisa do mesmo passo de contraste no tema escuro. */
export const Obrigatorio: Story = {
  name: "Obrigatório",
  args: { label: "Dia do vencimento", required: true },
};

/** index.html id="campo": readonly é tracejado + fundo recuado — distinto de disabled (o valor continua selecionável, só não é editável). */
export const ReadOnly: Story = {
  name: "Readonly",
  args: {
    label: "Hash do documento",
    defaultValue: "a1f9…c72e",
    readOnly: true,
  },
};

const SearchIcon = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

/**
 * index.html id="campo", "Valor monetário": mono, tabular, alinhado à
 * direita, com prefixo estático "R$" — o sinal fica no valor, nunca digitado.
 */
export const Monetario: Story = {
  name: "Monetário",
  render: () => (
    <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
      <div style={{ width: "220px" }}>
        <Input label="Valor" placeholder="0,00" money affix="R$" />
      </div>
      <div style={{ width: "220px" }}>
        <Input label="Valor" defaultValue="1.842,90" money affix="R$" />
      </div>
      <div style={{ width: "220px" }}>
        <Input
          label="Valor"
          defaultValue="0,00"
          money
          affix="R$"
          error="Obrigatório"
        />
      </div>
    </div>
  ),
};

/** index.html id="campo", "Área de texto e busca": afixo decorativo (ícone) à esquerda do campo, dentro do mesmo `.hmc-inputgroup`. */
export const ComIconeDeBusca: Story = {
  name: "Com ícone de busca",
  render: () => (
    <div style={{ width: "18rem" }}>
      <Input
        label="Buscar"
        placeholder="Transação, categoria ou valor"
        affix={
          <span style={{ display: "block", width: "15px", height: "15px" }}>
            {SearchIcon}
          </span>
        }
      />
    </div>
  ),
};
