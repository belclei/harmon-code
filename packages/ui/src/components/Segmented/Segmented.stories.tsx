import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Segmented } from "./Segmented";

const meta: Meta<typeof Segmented> = {
  title: "Componentes/Segmented",
  component: Segmented,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          'Segmented control do Harmon (index.html id="tabs"). Diferente do Tabs, nunca troca ' +
          "conteúdo de painel — é um filtro/período mutuamente exclusivo (`radiogroup`/`radio`).",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Segmented>;

function PlaygroundDemo() {
  const [value, setValue] = useState("mes");
  return (
    <Segmented
      label="Período"
      value={value}
      onChange={setValue}
      options={[
        { value: "mes", label: "Mês" },
        { value: "trimestre", label: "Trimestre" },
        { value: "ano", label: "Ano" },
      ]}
    />
  );
}

export const Playground: Story = {
  render: () => <PlaygroundDemo />,
};
