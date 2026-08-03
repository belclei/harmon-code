import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { RadioGroup } from "./RadioGroup";

const meta: Meta<typeof RadioGroup> = {
  title: "Componentes/RadioGroup",
  component: RadioGroup,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          'Grupo de rádio do Lurem (index.html id="selecao"). Componente burro e controlado — ' +
          "`value` vem inteiramente do chamador; a navegação por seta entre opções é nativa do browser (mesmo `name`).",
      },
    },
  },
  args: {
    label: "Tipo de conta",
    options: [
      { value: "corrente", label: "Conta corrente" },
      { value: "poupanca", label: "Poupança" },
      {
        value: "investimento",
        label: "Investimento (em breve)",
        disabled: true,
      },
    ],
  },
};

export default meta;
type Story = StoryObj<typeof RadioGroup>;

function PlaygroundDemo() {
  const [value, setValue] = useState("poupanca");
  return (
    <RadioGroup
      label="Tipo de conta"
      value={value}
      onChange={setValue}
      options={[
        { value: "corrente", label: "Conta corrente" },
        { value: "poupanca", label: "Poupança" },
        {
          value: "investimento",
          label: "Investimento (em breve)",
          disabled: true,
        },
      ]}
    />
  );
}

export const Playground: Story = {
  render: () => <PlaygroundDemo />,
};

export const Erro: Story = {
  name: "Erro",
  args: { value: null, error: true },
};
