import type { Meta, StoryObj } from "@storybook/react-vite";
import { RecurringRow } from "./RecurringRow";

const meta: Meta<typeof RecurringRow> = {
  title: "Componentes/RecurringRow",
  component: RecurringRow,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Linha de série recorrente (IMPLEMENTACAO.md §10.1b item 7, §6.7 arq).",
      },
    },
  },
  args: {
    description: "Aluguel",
    referenceAmountCents: 180000,
    isVariableAmount: false,
    status: "active",
    nextOccurrenceDate: "2026-08-10T12:00:00.000Z",
  },
};

export default meta;
type Story = StoryObj<typeof RecurringRow>;

export const Playground: Story = {
  render: (args) => (
    <div style={{ width: "28rem" }}>
      <RecurringRow {...args} />
    </div>
  ),
};

export const Estados: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "0.75rem", width: "34rem" }}>
      <RecurringRow
        description="Aluguel"
        referenceAmountCents={180000}
        isVariableAmount={false}
        status="active"
        nextOccurrenceDate="2026-08-10T12:00:00.000Z"
      />
      <RecurringRow
        description="Conta de luz"
        referenceAmountCents={15000}
        isVariableAmount
        status="active"
        nextOccurrenceDate="2026-08-15T12:00:00.000Z"
      />
      <RecurringRow
        description="Academia"
        referenceAmountCents={12000}
        isVariableAmount={false}
        status="paused"
      />
      <RecurringRow
        description="Assinatura de streaming (cancelada)"
        referenceAmountCents={4500}
        isVariableAmount={false}
        status="ended"
      />
      <RecurringRow
        description="Conta de luz"
        referenceAmountCents={15000}
        isVariableAmount
        hasVariationAlert
        status="active"
        nextOccurrenceDate="2026-08-15T12:00:00.000Z"
      />
    </div>
  ),
};
