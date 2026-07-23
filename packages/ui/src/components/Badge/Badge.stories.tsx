import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  BADGE_STATUS_LABEL,
  Badge,
  type BadgeCategoryColor,
  type BadgeStatus,
} from "./Badge";

const meta: Meta<typeof Badge> = {
  title: "Componentes/Badge",
  component: Badge,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Duas variações: `status` (ativo/inativo/pendente) e `category` " +
          "(cor definida por quem chama, a partir do dado da categoria — o Badge só pinta).",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

const STATUSES: BadgeStatus[] = ["active", "inactive", "pending"];
const CATEGORY_COLORS: { color: BadgeCategoryColor; label: string }[] = [
  { color: "blue", label: "Moradia" },
  { color: "sage", label: "Mercado" },
  { color: "sand", label: "Lazer" },
  { color: "clay", label: "Saúde" },
  { color: "ink", label: "Outros" },
];

export const Status: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "0.75rem" }}>
      {STATUSES.map((status) => (
        <Badge key={status} kind="status" status={status}>
          {BADGE_STATUS_LABEL[status]}
        </Badge>
      ))}
    </div>
  ),
};

export const Categoria: Story = {
  name: "Category",
  render: () => (
    <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
      {CATEGORY_COLORS.map(({ color, label }) => (
        <Badge key={color} kind="category" color={color}>
          {label}
        </Badge>
      ))}
    </div>
  ),
};
