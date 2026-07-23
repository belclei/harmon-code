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
