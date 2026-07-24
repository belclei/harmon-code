import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../Button/Button";
import { Tooltip } from "./Tooltip";

const meta: Meta<typeof Tooltip> = {
  title: "Componentes/Tooltip",
  component: Tooltip,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          'Tooltip do Harmon (index.html id="dialogo"). Sempre escuro (--hm-ink-900), ' +
          "nas duas temas — lê como um carimbo, não como uma superfície do tema. Posicionamento fixo (sem detecção de colisão).",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Tooltip>;

export const Playground: Story = {
  render: () => (
    <div style={{ paddingTop: "3rem" }}>
      <Tooltip content="O limite do cheque especial não entra no Disponível Hoje.">
        <Button variant="secondary" size="sm">
          Disponível hoje
        </Button>
      </Tooltip>
    </div>
  ),
};
