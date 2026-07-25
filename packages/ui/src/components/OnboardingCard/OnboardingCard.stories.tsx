import type { Meta, StoryObj } from "@storybook/react-vite";
import { OnboardingCard } from "./OnboardingCard";

const meta: Meta<typeof OnboardingCard> = {
  title: "Componentes/OnboardingCard",
  component: OnboardingCard,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Card de ativação por pendência (IMPLEMENTACAO.md §10.1b item 10, §6.11 arq).",
      },
    },
  },
  args: {
    kind: "accounts",
    title: "Contas",
    description:
      "Adicione suas contas — escolha a instituição e informe o saldo atual.",
    ctaLabel: "Adicionar conta",
  },
};

export default meta;
type Story = StoryObj<typeof OnboardingCard>;

export const Playground: Story = {
  render: (args) => (
    <div style={{ width: "22rem" }}>
      <OnboardingCard {...args} isComplete={false} onAction={() => {}} />
    </div>
  ),
};

export const Estados: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "0.75rem", width: "22rem" }}>
      <OnboardingCard
        kind="wallet"
        title="Carteira"
        description="Quanto você tem em dinheiro físico?"
        isComplete={false}
        ctaLabel="Informar carteira"
        onAction={() => {}}
      />
      <OnboardingCard
        kind="accounts"
        title="Contas"
        description="Adicione suas contas — escolha a instituição e informe o saldo atual."
        isComplete={false}
        ctaLabel="Adicionar conta"
        onAction={() => {}}
      />
      <OnboardingCard
        kind="cards"
        title="Cartões"
        description="Instituição, fechamento, vencimento e limite."
        isComplete
        ctaLabel="Adicionar cartão"
        onAction={() => {}}
      />
    </div>
  ),
};
