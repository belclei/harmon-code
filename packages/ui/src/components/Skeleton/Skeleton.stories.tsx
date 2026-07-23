import type { Meta, StoryObj } from "@storybook/react-vite";
import { Skeleton } from "./Skeleton";

const meta: Meta<typeof Skeleton> = {
  title: "Componentes/Skeleton",
  component: Skeleton,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Placeholder de carregamento com shimmer leve. Decorativo (`aria-hidden`) — " +
          'quem compõe a tela é responsável por anunciar o carregamento via `role="status"`.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Skeleton>;

export const Formas: Story = {
  name: "Shapes",
  render: () => (
    <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
      <Skeleton shape="circle" width={48} height={48} />
      <div style={{ display: "grid", gap: "0.5rem", width: "14rem" }}>
        <Skeleton shape="text" width="80%" />
        <Skeleton shape="text" width="55%" />
      </div>
      <Skeleton shape="rect" width={120} height={80} />
    </div>
  ),
};

export const CardDeConta: Story = {
  name: "Exemplo — card de conta carregando",
  render: () => (
    <div
      className="hm-card"
      style={{ width: "18rem", display: "grid", gap: "0.75rem" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <Skeleton shape="circle" width={32} height={32} />
        <Skeleton shape="text" width="50%" />
      </div>
      <Skeleton shape="text" width="70%" height="1.75rem" />
      <Skeleton shape="text" width="40%" />
    </div>
  ),
};
