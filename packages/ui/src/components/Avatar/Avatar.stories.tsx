import type { Meta, StoryObj } from "@storybook/react-vite";
import { Avatar } from "./Avatar";

const meta: Meta<typeof Avatar> = {
  title: "Componentes/Avatar",
  component: Avatar,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Avatar do usuário — recebe a lista de URLs já resolvida pelo backend (ARQUITETURA.md §6.1) e cai para a próxima em caso de erro de carregamento.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Avatar>;

export const Dicebear: Story = {
  render: () => (
    <Avatar
      urls={["https://api.dicebear.com/9.x/thumbs/svg?seed=Ana"]}
      alt="Avatar de Ana"
    />
  ),
};

export const Grande: Story = {
  render: () => (
    <Avatar
      urls={["https://api.dicebear.com/9.x/thumbs/svg?seed=Bruno"]}
      alt="Avatar de Bruno"
      size={96}
    />
  ),
};
