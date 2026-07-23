import type { Meta, StoryObj } from "@storybook/react-vite";
import { Body } from "./Body";
import { Heading, type HeadingLevel } from "./Heading";
import { Mono } from "./Mono";

const meta: Meta = {
  title: "Componentes/Typography",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Heading (níveis 1–6), Body (regular/medium) e Mono (números/código).",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

const LEVELS: HeadingLevel[] = [1, 2, 3, 4, 5, 6];

export const Headings: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "0.75rem" }}>
      {LEVELS.map((level) => (
        <Heading key={level} level={level}>
          Heading nível {level} — Visão geral das finanças
        </Heading>
      ))}
    </div>
  ),
};

export const BodyText: Story = {
  name: "Body",
  render: () => (
    <div style={{ display: "grid", gap: "0.75rem", width: "28rem" }}>
      <Body weight="regular">
        Texto regular: usado no corpo padrão de parágrafos, descrições e listas.
      </Body>
      <Body weight="medium">
        Texto medium: para destacar um trecho sem virar heading.
      </Body>
      <Body muted>Texto secundário (muted): legendas e texto de apoio.</Body>
    </div>
  ),
};

export const MonoText: Story = {
  name: "Mono",
  render: () => (
    <div style={{ display: "grid", gap: "0.75rem" }}>
      <div style={{ display: "flex", gap: "1.5rem", alignItems: "baseline" }}>
        <Mono tone="default">R$ 1.234,56</Mono>
        <Mono tone="in">+ R$ 240,00</Mono>
        <Mono tone="out">- R$ 89,90</Mono>
        <Mono tone="estimate">≈ R$ 300,00</Mono>
      </div>
      <Body>
        Rode a migração com <Mono variant="code">npm run build-storybook</Mono>{" "}
        antes de abrir o PR.
      </Body>
    </div>
  ),
};
