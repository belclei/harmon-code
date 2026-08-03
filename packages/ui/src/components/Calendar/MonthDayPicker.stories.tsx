import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Card } from "../Card/Card";
import { Body } from "../Typography/Body";
import type { MonthDayValue } from "./MonthDayPicker";
import { MonthDayPicker } from "./MonthDayPicker";

const meta: Meta<typeof MonthDayPicker> = {
  title: "Componentes/MonthDayPicker",
  component: MonthDayPicker,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          'Seletor de dia do mês do Lurem (index.html id="calendario", "Seletor de dia do mês — ' +
          'recorrências"). Dias 29–31 aparecem esmaecidos: nem todo mês os tem — escolhendo um deles, ' +
          "a ocorrência cai no último dia do mês curto.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof MonthDayPicker>;

function PlaygroundDemo() {
  const [value, setValue] = useState<MonthDayValue>(5);
  return (
    <Card style={{ maxWidth: 420 }}>
      <MonthDayPicker
        label="Todo dia do mês"
        value={value}
        onChange={setValue}
      />
      <div style={{ marginTop: "0.75rem" }}>
        <Body muted style={{ fontSize: ".8125rem" }}>
          Dias 29 a 31 aparecem esmaecidos: nem todo mês os tem. Escolhendo um
          deles, a ocorrência cai no último dia do mês curto — o sistema avisa
          isso na hora, não depois.
        </Body>
      </div>
    </Card>
  );
}

export const Playground: Story = {
  render: () => <PlaygroundDemo />,
};
