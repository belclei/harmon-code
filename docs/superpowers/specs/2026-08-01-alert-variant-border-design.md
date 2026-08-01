# Borda colorida por variant no Alert

Data: 2026-08-01

## Contexto

`Alert` (`packages/ui/src/components/Alert/Alert.tsx`) usa hoje só um fundo
tintado por variant (`--hm-blue-100`, `--hm-sage-100`, `--hm-sand-100`,
`--hm-clay-100`, com wash translúcido em dark mode) pra sinalizar
info/success/warning/error. Não há borda nenhuma no layout `box`.

A referência visual (`brand/design-system/harmon-components.css:564-606`)
tem uma borda base no `.hmc-alert` (`border: 1px solid var(--hm-border)`)
que cada variant explicitamente zera com `border-color: transparent` — ou
seja, a referência decidiu conscientemente não ter borda colorida,
provavelmente porque o fundo tintado já carrega o sinal.

Motivação para desviar disso agora: reforço visual/contraste — o fundo
tintado sozinho não delimita bem o card contra certos fundos (ex.: dark
mode, ou surfaces onde o wash translúcido se confunde com o entorno).

## Escopo

**Dentro:**
- `VARIANT_STYLES` (Alert.tsx) ganha um campo `border` por variant,
  reaproveitando exatamente o mesmo token de cor já usado em `icon` — esse
  token já foi verificado para a barra de contraste 3:1 aplicável a
  elementos não-textuais (WCAG 1.4.11), que é o critério certo pra uma
  borda decorativa (ao contrário do 4.5:1 de texto).
- Container do layout `box` ganha `border` (1px) + a classe de cor da
  variant.

**Fora (decisão explícita):**
- Layout `inline` — não tem formato de card pra delimitar (é ícone + texto
  correndo no fluxo de outro componente), então não ganha borda.
- Mudar a cor do fundo tintado, do ícone, ou qualquer outro token —
  só adiciona a borda.
- Tornar a borda configurável via prop — não há caso de uso hoje pra
  Alert sem borda; se aparecer, é extensão futura.

## Design

Novo campo em `VARIANT_STYLES`:

```ts
border: string; // border-[var(--hm-*-700)] dark:border-[var(--hm-*-300)]
```

Valores (idênticos ao `icon` de cada variant, só trocando `text-` por
`border-`):

| variant | light | dark |
|---|---|---|
| info | `border-[var(--hm-blue-700)]` | `dark:border-[var(--hm-blue-300)]` |
| success | `border-[var(--hm-sage-700)]` | `dark:border-[var(--hm-sage-300)]` |
| warning | `border-[var(--hm-sand-700)]` | `dark:border-[var(--hm-sand-300)]` |
| error | `border-[var(--hm-clay-650)]` | `dark:border-[var(--hm-clay-500)]` |

No container do layout `box`, adicionar a utility `border` (1px, largura
padrão do Tailwind) e `styles.border` ao array de classNames — mesmo lugar
onde `styles.bg` já entra hoje.

Layout `inline` não é tocado.

## Testes

Não há `Alert.test.tsx` — só `Alert.stories.tsx` — e a mudança é CSS puro
via classe condicional já existente no componente, então sem teste novo
dedicado. Verificação via:
- `pnpm typecheck` / `pnpm lint` no pacote `ui`.
- Storybook: conferir visualmente as 4 variants em light e dark mode
  (`Alert.stories.tsx` já cobre as variants).

## Fora de escopo / follow-ups

Nenhum identificado — mudança autocontida em um arquivo.
