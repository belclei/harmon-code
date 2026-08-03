import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Button } from "../Button/Button";
import type { CalendarRange } from "./Calendar";
import { Calendar } from "./Calendar";

const meta: Meta<typeof Calendar> = {
  title: "Componentes/Calendar",
  component: Calendar,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          'Calendário do Lurem (index.html id="calendario", origem react-day-picker). Locale ' +
          "pt-BR fixo (semana começa domingo). O ponto sob o dia: cheio é transação real, vazado com " +
          'traço é agendada — o calendário nunca mostra valores, só "quando".',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Calendar>;

const REFERENCE_TODAY = new Date(2026, 6, 21);
const REAL_DAYS = [5, 7, 8, 9, 11, 12, 14, 15];
const SCHEDULED_DAYS = [25, 28];

function daySeed(date: Date, month: Date) {
  return date.getMonth() === month.getMonth() ? date.getDate() : -1;
}

function SelecaoSimplesDemo() {
  const [month, setMonth] = useState(REFERENCE_TODAY);
  const [selected, setSelected] = useState<Date | null>(new Date(2026, 6, 25));

  return (
    <Calendar
      label="Selecione uma data"
      mode="single"
      month={month}
      onMonthChange={setMonth}
      selected={selected}
      onSelect={(value) => setSelected(value as Date)}
      today={REFERENCE_TODAY}
      dayStatus={(date) => {
        const day = daySeed(date, month);
        if (REAL_DAYS.includes(day)) return "real";
        if (SCHEDULED_DAYS.includes(day)) return "scheduled";
        return undefined;
      }}
      footer={
        <>
          <Button
            variant="tertiary"
            size="sm"
            onClick={() => setSelected(REFERENCE_TODAY)}
          >
            Hoje
          </Button>
          <Button
            variant="tertiary"
            size="sm"
            className="ml-auto"
            onClick={() => setSelected(null)}
          >
            Limpar
          </Button>
        </>
      }
    />
  );
}

export const SelecaoSimples: Story = {
  name: "Seleção simples",
  render: () => <SelecaoSimplesDemo />,
};

function IntervaloDemo() {
  const [month, setMonth] = useState(REFERENCE_TODAY);
  const [range, setRange] = useState<CalendarRange>({
    from: new Date(2026, 6, 5),
    to: new Date(2026, 6, 15),
  });

  return (
    <Calendar
      label="Selecione um período"
      mode="range"
      month={month}
      onMonthChange={setMonth}
      selected={range}
      onSelect={(value) => setRange(value as CalendarRange)}
      today={REFERENCE_TODAY}
      isDisabled={(date) => date > REFERENCE_TODAY}
      footer={
        <>
          <Button
            variant="tertiary"
            size="sm"
            onClick={() =>
              setRange({
                from: new Date(
                  REFERENCE_TODAY.getFullYear(),
                  REFERENCE_TODAY.getMonth(),
                  1,
                ),
                to: REFERENCE_TODAY,
              })
            }
          >
            Este mês
          </Button>
          <Button
            variant="tertiary"
            size="sm"
            onClick={() => {
              const from = new Date(REFERENCE_TODAY);
              from.setDate(from.getDate() - 90);
              setRange({ from, to: REFERENCE_TODAY });
            }}
          >
            Últimos 90 dias
          </Button>
        </>
      }
    />
  );
}

/** Filtro de período — dias futuros desabilitados (`isDisabled`, decisão de quem usa, não do componente). */
export const Intervalo: Story = {
  render: () => <IntervaloDemo />,
};
