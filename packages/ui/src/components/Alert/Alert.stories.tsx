import type { Meta, StoryObj } from "@storybook/react-vite";
import { Alert, type AlertVariant } from "./Alert";

const meta: Meta<typeof Alert> = {
  title: "Componentes/Alert",
  component: Alert,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Notificação inline com ícone, título, descrição e botão de fechar opcional. " +
          "Componente burro: só avisa que o usuário pediu para fechar, via `onClose`.",
      },
    },
  },
  args: {
    variant: "info",
    title: "Conexão com o banco atualizada",
    description: "Os últimos lançamentos foram importados com sucesso.",
    onClose: () => {},
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["info", "success", "warning", "error"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Alert>;

export const Playground: Story = {};

const COPY: Record<AlertVariant, { title: string; description: string }> = {
  info: {
    title: "Conexão com o banco atualizada",
    description: "Os últimos lançamentos foram importados com sucesso.",
  },
  success: {
    title: "Transação confirmada",
    description: "O lançamento de R$ 240,00 foi validado por Ana.",
  },
  warning: {
    title: "Fatura próxima do limite",
    description: "Você já usou 92% do limite do cartão Nubank neste ciclo.",
  },
  error: {
    title: "Não foi possível sincronizar",
    description:
      "A conexão com o Itaú expirou. Reconecte para continuar importando.",
  },
};

/** As 4 variantes exigidas por US-1.8, cada uma com ícone + título + descrição + botão fechar. */
export const Variantes: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "1rem", width: "26rem" }}>
      {(Object.keys(COPY) as AlertVariant[]).map((variant) => (
        <Alert
          key={variant}
          variant={variant}
          {...COPY[variant]}
          onClose={() => {}}
        />
      ))}
    </div>
  ),
};

export const SemBotaoFechar: Story = {
  name: "Sem botão de fechar",
  args: { onClose: undefined },
};
