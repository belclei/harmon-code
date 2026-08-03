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
          className="lr-label"
          style={{ fontSize: ".6875rem", color: "var(--lr-text-secondary)" }}
        >
          Closed
        </span>
        <Select label="Categoria" options={CATEGORIES} />
      </div>
      <div className="grid gap-1.5">
        <span
          className="lr-label"
          style={{ fontSize: ".6875rem", color: "var(--lr-text-secondary)" }}
        >
          Open
        </span>
        <Select label="Categoria" options={CATEGORIES} defaultOpen />
      </div>
      <div className="grid gap-1.5">
        <span
          className="lr-label"
          style={{ fontSize: ".6875rem", color: "var(--lr-text-secondary)" }}
        >
          Option selected
        </span>
        <Select label="Categoria" options={CATEGORIES} value="mercado" />
      </div>
      <div className="grid gap-1.5">
        <span
          className="lr-label"
          style={{ fontSize: ".6875rem", color: "var(--lr-text-secondary)" }}
        >
          Focused
        </span>
        <Select id="select-focused" label="Categoria" options={CATEGORIES} />
      </div>
      <div className="grid gap-1.5">
        <span
          className="lr-label"
          style={{ fontSize: ".6875rem", color: "var(--lr-text-secondary)" }}
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
          className="lr-label"
          style={{ fontSize: ".6875rem", color: "var(--lr-text-secondary)" }}
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

const FoodIcon = (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
  >
    <path d="M6 3v8a2 2 0 0 0 4 0V3M8 11v10M16 3c-1.5 2-2 4-2 6h4V3zM18 9v12" />
  </svg>
);
const HomeIcon = (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
  >
    <path d="M3 11 12 4l9 7v9H3z" />
  </svg>
);
const TransportIcon = (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
  >
    <path d="M4 15h16l-1.5-5H5.5z" />
    <circle cx="7.5" cy="17.5" r="1.7" />
    <circle cx="16.5" cy="17.5" r="1.7" />
  </svg>
);

/**
 * index.html id="select", "Painel aberto": ícone por item, item selecionado
 * distinto do apenas destacado (blue-100 vs sunken), separador e um item
 * desabilitado ("em breve") — todos no mesmo menu de categorias.
 */
export const MenuComIconesESeparador: Story = {
  name: "Menu com ícones, separador e item desabilitado",
  render: () => (
    <div style={{ width: "18rem" }}>
      <Select
        label="Categoria"
        value="moradia"
        defaultOpen
        options={[
          { value: "alimentacao", label: "Alimentação", icon: FoodIcon },
          { value: "moradia", label: "Moradia", icon: HomeIcon },
          {
            value: "transporte",
            label: "Transporte",
            icon: TransportIcon,
          },
          { separator: true },
          {
            value: "investimentos",
            label: "Investimentos (em breve)",
            disabled: true,
          },
        ]}
      />
    </div>
  ),
};
