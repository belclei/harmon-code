import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Checkbox } from "./Checkbox";

const meta: Meta<typeof Checkbox> = {
  title: "Componentes/Checkbox",
  component: Checkbox,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          'Checkbox do Harmon (index.html id="selecao"). Componente burro e controlado — ' +
          "`checked`/`indeterminate` vêm inteiramente do chamador.",
      },
    },
  },
  args: {
    label: "Marcar como recorrente",
  },
};

export default meta;
type Story = StoryObj<typeof Checkbox>;

function PlaygroundDemo() {
  const [checked, setChecked] = useState(false);
  return (
    <Checkbox
      label="Marcar como recorrente"
      checked={checked}
      onChange={(event) => setChecked(event.target.checked)}
    />
  );
}

export const Playground: Story = {
  render: () => <PlaygroundDemo />,
};

/** Todos os 5 estados documentados na referência: off, on, indeterminate, disabled, error. */
export const Estados: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "0.75rem" }}>
      <Checkbox
        label="Marcar como recorrente"
        checked={false}
        onChange={() => {}}
      />
      <Checkbox
        label="Marcar como recorrente"
        checked={true}
        onChange={() => {}}
      />
      <Checkbox
        label="34 de 51 selecionadas"
        indeterminate
        onChange={() => {}}
      />
      <Checkbox label="Débito automático" disabled />
      <Checkbox label="Li e aceito os termos" error onChange={() => {}} />
    </div>
  ),
};
