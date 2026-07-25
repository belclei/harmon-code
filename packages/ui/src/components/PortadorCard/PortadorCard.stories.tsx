import type { Meta, StoryObj } from "@storybook/react-vite";
import { PortadorCard } from "./PortadorCard";

const meta: Meta<typeof PortadorCard> = {
  title: "Componentes/PortadorCard",
  component: PortadorCard,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Card de validação de transação de portador e acerto (IMPLEMENTACAO.md §10.1b item 9, §6.10 arq).",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof PortadorCard>;

export const Pendente: Story = {
  render: () => (
    <div style={{ width: "28rem" }}>
      <PortadorCard
        counterpartName="Belclei"
        description="Restaurante - ADICIONAL MARIA"
        amountCents={8900}
        date="2026-07-18T12:00:00.000Z"
        status="pending"
        targetOptions={[
          { id: "acc-1", label: "Conta corrente Itaú" },
          { id: "card-1", label: "Cartão Nubank" },
        ]}
        onAccept={() => {}}
        onReject={() => {}}
      />
    </div>
  ),
};

export const Aceito: Story = {
  render: () => (
    <div style={{ width: "28rem" }}>
      <PortadorCard
        counterpartName="Belclei"
        description="Restaurante - ADICIONAL MARIA"
        amountCents={8900}
        date="2026-07-18T12:00:00.000Z"
        status="accepted"
        settlementLabel="Acerto pendente com Belclei · R$ 89,00 a seu favor"
        onMarkSettled={() => {}}
      />
    </div>
  ),
};

export const Rejeitado: Story = {
  render: () => (
    <div style={{ width: "28rem" }}>
      <PortadorCard
        counterpartName="Belclei"
        description="Restaurante - ADICIONAL MARIA"
        amountCents={8900}
        date="2026-07-18T12:00:00.000Z"
        status="rejected"
      />
    </div>
  ),
};

export const Acertado: Story = {
  render: () => (
    <div style={{ width: "28rem" }}>
      <PortadorCard
        counterpartName="Belclei"
        description="Restaurante - ADICIONAL MARIA"
        amountCents={8900}
        date="2026-07-18T12:00:00.000Z"
        status="settled"
      />
    </div>
  ),
};
