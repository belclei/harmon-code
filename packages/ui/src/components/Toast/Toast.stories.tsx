import type { Meta, StoryObj } from "@storybook/react-vite";
import { Toast } from "./Toast";

const meta: Meta<typeof Toast> = {
  title: "Componentes/Toast",
  component: Toast,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          'Toast do Lurem (index.html id="dialogo"). Componente de apresentação única — ' +
          'fila, empilhamento e o timer de auto-dismiss (8s para "Desfazer") são responsabilidade de um gerenciador da aplicação, não deste componente.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Toast>;

export const Sucesso: Story = {
  name: "Sucesso com desfazer",
  args: {
    variant: "success",
    message: "Transação excluída.",
    action: { label: "Desfazer", onClick: () => {} },
  },
};

export const Erro: Story = {
  name: "Erro",
  args: {
    variant: "danger",
    message: "Não foi possível salvar. Seus dados continuam no formulário.",
    action: { label: "Tentar de novo", onClick: () => {} },
  },
};

export const Neutro: Story = {
  args: { variant: "neutral", message: "Preferências salvas." },
};
