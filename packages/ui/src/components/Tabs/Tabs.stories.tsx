import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Tabs } from "./Tabs";

const meta: Meta<typeof Tabs> = {
  title: "Componentes/Tabs",
  component: Tabs,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          'Tabs do Harmon (index.html id="tabs"). A tab ativa é marcada em areia ' +
          "(--hm-sand-500) — a mesma cor do fragmento e do foco. Navegação por Left/Right/Home/End.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Tabs>;

const ITEMS = [
  { value: "geral", label: "Visão geral" },
  { value: "transacoes", label: "Transações" },
  { value: "recorrencias", label: "Recorrências" },
  { value: "investimentos", label: "Investimentos", disabled: true },
];

function PlaygroundDemo() {
  const [value, setValue] = useState("transacoes");
  return (
    <div style={{ width: "26rem" }}>
      <Tabs
        label="Seções da conta"
        items={ITEMS}
        value={value}
        onChange={setValue}
      />
    </div>
  );
}

export const Playground: Story = {
  render: () => <PlaygroundDemo />,
};
