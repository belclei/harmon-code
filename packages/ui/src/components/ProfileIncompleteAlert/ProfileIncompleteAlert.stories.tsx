import type { Meta, StoryObj } from "@storybook/react-vite";
import { ProfileIncompleteAlert } from "./ProfileIncompleteAlert";

const meta: Meta<typeof ProfileIncompleteAlert> = {
  title: "Componentes/ProfileIncompleteAlert",
  component: ProfileIncompleteAlert,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Gate de primeiro-login para birthDate placeholder (ARQUITETURA.md §6.1, 26/07/2026).",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof ProfileIncompleteAlert>;

export const Padrao: Story = {
  render: () => (
    <div style={{ width: "36rem" }}>
      <ProfileIncompleteAlert onGoToSettings={() => {}} />
    </div>
  ),
};
