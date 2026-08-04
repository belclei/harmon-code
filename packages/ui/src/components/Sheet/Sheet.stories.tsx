import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Button } from "../Button/Button";
import { Input } from "../Input/Input";
import { Segmented } from "../Segmented/Segmented";
import { Sheet } from "./Sheet";

const meta: Meta<typeof Sheet> = {
  title: "Componentes/Sheet",
  component: Sheet,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          'Sheet mobile do Lurem (index.html id="dialogo") — mesmo comportamento modal do ' +
          "`Dialog` (foco preso, Escape fecha), ancorado à borda inferior.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Sheet>;

function NovaTransacaoDemo() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState("saida");

  return (
    <>
      <Button onClick={() => setOpen(true)}>Nova transação</Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Nova transação">
        <div style={{ display: "grid", gap: "0.75rem" }}>
          <Input label="Valor" money affix="R$" defaultValue="48,90" />
          <Segmented
            label="Tipo"
            value={kind}
            onChange={setKind}
            options={[
              { value: "saida", label: "Saída" },
              { value: "entrada", label: "Entrada" },
              { value: "transferencia", label: "Transferência" },
            ]}
          />
          <Button onClick={() => setOpen(false)}>Salvar</Button>
        </div>
      </Sheet>
    </>
  );
}

export const NovaTransacao: Story = {
  name: "Nova transação (mobile)",
  render: () => <NovaTransacaoDemo />,
};
