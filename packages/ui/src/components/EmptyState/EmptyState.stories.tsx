import type { Meta, StoryObj } from "@storybook/react-vite";
import { EmptyState } from "./EmptyState";

const meta: Meta<typeof EmptyState> = {
  title: "Componentes/EmptyState",
  component: EmptyState,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          'Estado vazio do Lurem (index.html id="carregando"). Nunca é uma tela morta — ' +
          "sempre carrega o próximo passo concreto.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof EmptyState>;

const NoDataIcon = (
  <svg
    aria-hidden="true"
    viewBox="0 0 64 64"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.2}
  >
    <path d="M10 32a22 22 0 0 1 22-22M54 32a22 22 0 0 1-22 22" />
    <circle cx="32" cy="32" r="4" fill="var(--lr-gold-500)" stroke="none" />
  </svg>
);

const NoResultsIcon = (
  <svg
    aria-hidden="true"
    viewBox="0 0 64 64"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.2}
  >
    <circle cx="28" cy="28" r="15" />
    <path d="m40 40 12 12" />
  </svg>
);

/** index.html id="carregando", "Estado vazio": nenhuma transação ainda — dois CTAs. */
export const SemDados: Story = {
  name: "Sem dados",
  args: {
    icon: NoDataIcon,
    title: "Nenhuma transação ainda",
    description:
      "Registre a primeira em menos de dez segundos — ou importe um extrato e deixe o histórico nascer pronto.",
    actions: [
      { label: "Nova transação", onClick: () => {} },
      { label: "Importar extrato", onClick: () => {}, variant: "secondary" },
    ],
  },
};

/** Busca sem resultado — uma única ação de recuperação. */
export const SemResultado: Story = {
  name: "Sem resultado de busca",
  args: {
    icon: NoResultsIcon,
    title: 'Nada encontrado para "farmácia"',
    description:
      "Tente outro termo ou amplie o período — a busca está limitada a julho de 2026.",
    actions: [
      { label: "Limpar filtros", onClick: () => {}, variant: "tertiary" },
    ],
  },
};
