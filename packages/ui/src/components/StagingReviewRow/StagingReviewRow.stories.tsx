import type { Meta, StoryObj } from "@storybook/react-vite";
import { StagingReviewRow } from "./StagingReviewRow";

const meta: Meta<typeof StagingReviewRow> = {
  title: "Componentes/StagingReviewRow",
  component: StagingReviewRow,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Linha de revisão de importação (IMPLEMENTACAO.md §10.1b item 8, §6.8 arq). " +
          "Confiança em 3 pips discretos, nunca percentual.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof StagingReviewRow>;

export const Pending: Story = {
  render: () => (
    <div style={{ width: "30rem" }}>
      <StagingReviewRow
        description="Uber"
        amountCents={2890}
        date="2026-07-20T12:00:00.000Z"
        confidencePips={2}
        suggestedCategoryLabel="Transporte"
        status="pending"
        onConfirm={() => {}}
        onEdit={() => {}}
        onReject={() => {}}
      />
    </div>
  ),
};

export const AltaConfianca: Story = {
  render: () => (
    <div style={{ width: "30rem" }}>
      <StagingReviewRow
        description="Supermercado Extra"
        amountCents={18790}
        date="2026-07-20T12:00:00.000Z"
        confidencePips={3}
        suggestedCategoryLabel="Alimentação"
        status="pending"
        onConfirm={() => {}}
        onEdit={() => {}}
        onReject={() => {}}
      />
    </div>
  ),
};

export const Duplicata: Story = {
  render: () => (
    <div style={{ width: "30rem" }}>
      <StagingReviewRow
        description="Netflix"
        amountCents={3990}
        date="2026-07-05T12:00:00.000Z"
        confidencePips={3}
        suggestedCategoryLabel="Assinaturas"
        status="pending"
        isDuplicate
        duplicateReason="Já existe transação com mesma data e valor"
        onConfirm={() => {}}
        onEdit={() => {}}
        onReject={() => {}}
      />
    </div>
  ),
};

export const Confirmed: Story = {
  render: () => (
    <div style={{ width: "30rem" }}>
      <StagingReviewRow
        description="Salário"
        amountCents={520000}
        date="2026-07-05T12:00:00.000Z"
        confidencePips={3}
        suggestedCategoryLabel="Salário"
        status="confirmed"
      />
    </div>
  ),
};

export const Rejected: Story = {
  render: () => (
    <div style={{ width: "30rem" }}>
      <StagingReviewRow
        description="Estorno não reconhecido"
        amountCents={5000}
        date="2026-07-12T12:00:00.000Z"
        confidencePips={1}
        status="rejected"
      />
    </div>
  ),
};
