import type { Meta, StoryObj } from "@storybook/react-vite";
import { Card } from "./Card";

const meta: Meta<typeof Card> = {
  title: "Componentes/Card",
  component: Card,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Container base do Harmon — padding, borda e sombra vêm dos tokens " +
          "(`.lr-card` em harmon-tokens.css). Sem estado, sem lógica de negócio.",
      },
    },
  },
  args: {
    children: "Conteúdo do card",
  },
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Playground: Story = {
  render: (args) => (
    <Card {...args} style={{ width: "20rem" }}>
      {args.children}
    </Card>
  ),
};

export const Variantes: Story = {
  render: () => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 16rem)",
        gap: "1.5rem",
      }}
    >
      <Card>Padrão</Card>
      <Card sunken>Sunken (fundo recuado)</Card>
      <Card dashed>Dashed (placeholder vazio)</Card>
      <Card interactive>Interactive (passe o mouse)</Card>
      <Card padding="sm">Padding sm</Card>
      <Card padding="lg">Padding lg</Card>
    </div>
  ),
};
