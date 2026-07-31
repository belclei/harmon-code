import type { Meta, StoryObj } from "@storybook/react-vite";
import { CreditCardCard } from "./CreditCardCard";

const meta: Meta<typeof CreditCardCard> = {
  title: "Componentes/CreditCardCard",
  component: CreditCardCard,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Card de resumo de cartão de crédito (IMPLEMENTACAO.md §10.1b item 2). " +
          "`usedCents` já vem somado (fatura fechada + aberta) — o componente só desenha a barra de uso.",
      },
    },
  },
  args: {
    institutionName: "Itaú Unibanco",
    usedCents: 120000,
    limitCents: 500000,
    invoiceStatus: "open",
    closingDay: 3,
    dueDay: 10,
  },
};

export default meta;
type Story = StoryObj<typeof CreditCardCard>;

export const Playground: Story = {
  render: (args) => (
    <div style={{ width: "32rem" }}>
      <CreditCardCard {...args} />
    </div>
  ),
};

export const Estados: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "0.75rem", width: "32rem" }}>
      <CreditCardCard
        institutionName="Itaú Unibanco"
        usedCents={120000}
        limitCents={500000}
        invoiceStatus="open"
        closingDay={3}
        dueDay={10}
      />
      <CreditCardCard
        institutionName="Nubank"
        usedCents={400000}
        limitCents={500000}
        invoiceStatus="open"
        closingDay={3}
        dueDay={10}
        autoDebitAccountLabel="Itaú"
      />
      <CreditCardCard
        institutionName="C6 Bank"
        usedCents={620000}
        limitCents={500000}
        invoiceStatus="open"
        closingDay={20}
        dueDay={27}
      />
      <CreditCardCard
        institutionName="Bradesco"
        usedCents={250000}
        limitCents={500000}
        invoiceStatus="closed_awaiting_payment"
        closingDay={3}
        dueDay={10}
      />
    </div>
  ),
};
