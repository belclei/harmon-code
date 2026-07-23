import type { Meta, StoryObj } from "@storybook/react-vite";
import { Select } from "./Select";

const CATEGORIES = [
  { value: "moradia", label: "Moradia" },
  { value: "mercado", label: "Mercado" },
  { value: "transporte", label: "Transporte" },
  { value: "lazer", label: "Lazer" },
  { value: "saude", label: "Saúde" },
  { value: "educacao", label: "Educação" },
];

const meta: Meta<typeof Select> = {
  title: "Componentes/Select",
  component: Select,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Dropdown com busca (padrão combobox WAI-ARIA 1.2). Aberto/fechado e o " +
          "texto de busca são estado local de UI — a lista de opções e o valor " +
          "selecionado sempre chegam (e saem) via props.",
      },
    },
  },
  args: {
    label: "Categoria",
    options: CATEGORIES,
    placeholder: "Selecione uma categoria",
  },
};

export default meta;
type Story = StoryObj<typeof Select>;

export const Playground: Story = {};

/**
 * Matriz completa exigida pela US-1.7: closed / open / option selected /
 * focused / error / disabled.
 */
export const Matriz: Story = {
  parameters: {
    pseudo: { focusVisible: ["#select-focused-input"] },
    docs: { description: { story: "Todos os 6 estados exigidos por US-1.7." } },
  },
  render: () => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 14rem)",
        gap: "3rem 1.5rem",
      }}
    >
      <div className="grid gap-1.5">
        <span
          className="hm-label"
          style={{ fontSize: ".6875rem", color: "var(--hm-text-2)" }}
        >
          Closed
        </span>
        <Select label="Categoria" options={CATEGORIES} />
      </div>
      <div className="grid gap-1.5">
        <span
          className="hm-label"
          style={{ fontSize: ".6875rem", color: "var(--hm-text-2)" }}
        >
          Open
        </span>
        <Select label="Categoria" options={CATEGORIES} defaultOpen />
      </div>
      <div className="grid gap-1.5">
        <span
          className="hm-label"
          style={{ fontSize: ".6875rem", color: "var(--hm-text-2)" }}
        >
          Option selected
        </span>
        <Select label="Categoria" options={CATEGORIES} value="mercado" />
      </div>
      <div className="grid gap-1.5">
        <span
          className="hm-label"
          style={{ fontSize: ".6875rem", color: "var(--hm-text-2)" }}
        >
          Focused
        </span>
        <Select id="select-focused" label="Categoria" options={CATEGORIES} />
      </div>
      <div className="grid gap-1.5">
        <span
          className="hm-label"
          style={{ fontSize: ".6875rem", color: "var(--hm-text-2)" }}
        >
          Error
        </span>
        <Select
          label="Categoria"
          options={CATEGORIES}
          error="Escolha uma categoria."
        />
      </div>
      <div className="grid gap-1.5">
        <span
          className="hm-label"
          style={{ fontSize: ".6875rem", color: "var(--hm-text-2)" }}
        >
          Disabled
        </span>
        <Select label="Categoria" options={CATEGORIES} disabled />
      </div>
    </div>
  ),
};

export const ComBusca: Story = {
  name: "Com busca (digite para filtrar)",
  render: () => <Select label="Categoria" options={CATEGORIES} defaultOpen />,
};
