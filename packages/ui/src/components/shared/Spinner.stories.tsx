import type { Meta, StoryObj } from "@storybook/react-vite";
import { Card } from "../Card/Card";
import { Body } from "../Typography/Body";
import { Spinner } from "./Spinner";

const meta: Meta<typeof Spinner> = {
  title: "Componentes/Spinner",
  component: Spinner,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          'Anel de carregamento inline do Lurem (index.html id="carregando"). Cor herda de ' +
          "`currentColor` — o mesmo anel que `Button` usa internamente em `loading`.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Spinner>;

export const Playground: Story = {};

/** index.html id="carregando", "spinner inline": ao lado de um texto explicando a espera. */
export const InlineComTexto: Story = {
  name: "Inline com texto",
  render: () => (
    <Card
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "0.75rem",
        width: "18rem",
      }}
    >
      <Spinner className="mt-0.5 flex-none text-[var(--lr-night-600)]" />
      <Body style={{ fontSize: ".8125rem" }} muted>
        Lendo a fatura… isso leva alguns segundos.
      </Body>
    </Card>
  ),
};
