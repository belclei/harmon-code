import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Button } from "../Button/Button";
import { Input } from "../Input/Input";
import { Dialog } from "./Dialog";

const meta: Meta<typeof Dialog> = {
  title: "Componentes/Dialog",
  component: Dialog,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          'Diálogo de confirmação do Lurem (index.html id="dialogo", padrão WAI-ARIA Dialog ' +
          "Modal). Foco preso, Escape fecha, foco retorna ao gatilho ao fechar — ver `useModalBehavior`.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Dialog>;

function ConfirmacaoDestrutivaDemo() {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const canDelete = confirmText === "Itaú";

  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        Excluir conta
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Excluir a conta Itaú?"
        description="As 214 transações desta conta serão excluídas junto. Esta ação não pode ser desfeita."
        footer={
          <>
            <Button variant="tertiary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              disabled={!canDelete}
              onClick={() => setOpen(false)}
            >
              Excluir conta
            </Button>
          </>
        }
      >
        <Input
          label="Digite Itaú para confirmar"
          value={confirmText}
          onChange={(event) => setConfirmText(event.target.value)}
        />
      </Dialog>
    </>
  );
}

/** index.html id="dialogo", "confirmação destrutiva": ação irreversível vira diálogo com confirmação digitada. */
export const ConfirmacaoDestrutiva: Story = {
  name: "Confirmação destrutiva",
  render: () => <ConfirmacaoDestrutivaDemo />,
};
