import type { Meta, StoryObj } from "@storybook/react-vite";
import { TimelineAlertBanner } from "./TimelineAlertBanner";

const meta: Meta<typeof TimelineAlertBanner> = {
  title: "Componentes/TimelineAlertBanner",
  component: TimelineAlertBanner,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Banner fixo de estado de alerta no topo da Timeline (IMPLEMENTACAO.md §10.1b item 6, §6.4/§6.12 arq).",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof TimelineAlertBanner>;

export const UmaEntidade: Story = {
  render: () => (
    <div style={{ width: "36rem" }}>
      <TimelineAlertBanner
        entities={[
          {
            id: "1",
            kind: "account",
            institutionName: "Nubank",
            overAmountCents: 34000,
            onConfigure: () => {},
          },
        ]}
      />
    </div>
  ),
};

export const MultiplasEntidades: Story = {
  render: () => (
    <div style={{ width: "36rem" }}>
      <TimelineAlertBanner
        entities={[
          {
            id: "1",
            kind: "account",
            institutionName: "Nubank",
            overAmountCents: 34000,
            onConfigure: () => {},
          },
          {
            id: "2",
            kind: "card",
            institutionName: "Inter",
            usagePercent: 118,
            onConfigure: () => {},
          },
        ]}
      />
    </div>
  ),
};
