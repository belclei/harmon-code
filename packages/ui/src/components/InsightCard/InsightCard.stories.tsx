import type { Money } from "@harmon/domain";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { InsightCard } from "./InsightCard";

const SAMPLE_MONEY: Money = {
  valueCents: 234050,
  breakdown: [
    {
      label: "Saldo em contas líquidas",
      valueCents: 500000,
      kind: "account_balance",
      isEstimate: false,
    },
    {
      label: "Fatura fechada (Itaú)",
      valueCents: -120000,
      kind: "closed_invoice",
      isEstimate: false,
    },
    {
      label: "Aluguel (agendado)",
      valueCents: -145950,
      kind: "scheduled_tx",
      isEstimate: false,
    },
    {
      label: "Conta de luz (estimada)",
      valueCents: -0,
      kind: "recurring_expense",
      isEstimate: true,
    },
  ],
};

const meta: Meta<typeof InsightCard> = {
  title: "Componentes/InsightCard",
  component: InsightCard,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Card herói do dashboard com decomposição explicável (IMPLEMENTACAO.md §10.1b item 3, §6.9 arq). " +
          "`money` chega pronto de `packages/core` — este componente só exibe.",
      },
    },
  },
  args: {
    title: "Disponível Hoje",
    money: SAMPLE_MONEY,
  },
};

export default meta;
type Story = StoryObj<typeof InsightCard>;

export const Playground: Story = {
  render: (args) => (
    <div style={{ width: "22rem" }}>
      <InsightCard {...args} />
    </div>
  ),
};

export const Fechado: Story = {
  render: (args) => (
    <div style={{ width: "22rem" }}>
      <InsightCard {...args} />
    </div>
  ),
  args: { defaultExpanded: false },
};

export const Expandido: Story = {
  render: (args) => (
    <div style={{ width: "22rem" }}>
      <InsightCard {...args} />
    </div>
  ),
  args: { defaultExpanded: true },
};
