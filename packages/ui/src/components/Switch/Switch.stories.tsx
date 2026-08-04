import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Switch } from "./Switch";

const meta: Meta<typeof Switch> = {
  title: "Componentes/Switch",
  component: Switch,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          'Switch do Lurem (index.html id="selecao"). Aplica na hora (preferência) — ' +
          'diferente do Checkbox, que espera um "Salvar" de formulário. Ação destrutiva ou com custo nunca é switch.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Switch>;

function PlaygroundDemo() {
  const [checked, setChecked] = useState(false);
  return (
    <Switch
      label="Ocultar valores nesta tela"
      checked={checked}
      onChange={setChecked}
    />
  );
}

export const Playground: Story = {
  render: () => <PlaygroundDemo />,
};

export const Estados: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "0.75rem" }}>
      <Switch aria-label="Desligado" checked={false} onChange={() => {}} />
      <Switch aria-label="Ligado" checked={true} onChange={() => {}} />
      <Switch aria-label="Desabilitado" checked={false} disabled />
      <Switch
        label="Ocultar valores nesta tela"
        checked={true}
        onChange={() => {}}
      />
    </div>
  ),
};
