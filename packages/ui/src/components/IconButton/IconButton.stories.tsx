import type { Meta, StoryObj } from "@storybook/react-vite";
import { IconButton } from "./IconButton";

const MoreIcon = (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="5" r="1.6" />
    <circle cx="12" cy="12" r="1.6" />
    <circle cx="12" cy="19" r="1.6" />
  </svg>
);

const meta: Meta<typeof IconButton> = {
  title: "Componentes/IconButton",
  component: IconButton,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          'Botão quadrado só-ícone do Harmon (index.html id="botao", `.hmc-iconbtn`: ' +
          "40×40, transparente, --hm-text-2 → hover --hm-surface-sunken/--hm-text). " +
          "`aria-label` é obrigatório (TypeScript recusa o componente sem ele) porque " +
          "o ícone é sempre `aria-hidden` — sem rótulo visível, é o único nome acessível do botão.",
      },
    },
  },
  args: {
    "aria-label": "Mais opções",
    children: MoreIcon,
  },
};

export default meta;
type Story = StoryObj<typeof IconButton>;

/** Playground interativo — use o painel Controls para variar props. */
export const Playground: Story = {};

export const Estados: Story = {
  render: () => (
    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
      <IconButton aria-label="Mais opções">{MoreIcon}</IconButton>
      <IconButton aria-label="Mais opções (desabilitado)" disabled>
        {MoreIcon}
      </IconButton>
    </div>
  ),
};
