# Borda colorida por variant no Alert — Plano de Implementação

> **Para agentes de trabalho:** SKILL NECESSÁRIA: Use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para executar este plano tarefa a tarefa. Passos usam sintaxe de checkbox (`- [ ]`) para rastreamento.

**Objetivo:** Adicionar bordas coloridas (1px, por variant) ao layout `box` do Alert, melhorando o contraste visual sem alterar nenhum outro aspecto do componente.

**Arquitetura:** Estender `VARIANT_STYLES` com um campo `border` string contendo a classe Tailwind de cor por variant, idêntico ao campo `icon` mas com `text-` → `border-`. No JSX do layout `box`, adicionar `styles.border` ao array de classNames do container. Layout `inline` fica intocado.

**Tech Stack:** React, TypeScript, Tailwind CSS v4 (utilities de classes), sem dependências novas.

## Restrições Globais

- Nenhuma mudança em `AlertProps` — `border` não é configurável via prop.
- Layout `inline` não recebe borda.
- Cores reaproveitam tokens já verificados em 3:1 (WCAG 1.4.11).
- Sem migração de dados, sem alterações de schema, sem mudanças em e-mail/API.

---

### Task 1: Adicionar campo `border` a `VARIANT_STYLES`

**Arquivos:**
- Modificar: `packages/ui/src/components/Alert/Alert.tsx:68-92`

**Interfaces:**
- Consumes: nada (primeira mudança)
- Produces: `VARIANT_STYLES[variant].border` — string de classe Tailwind color

- [ ] **Passo 1: Abrir Alert.tsx e localizar `VARIANT_STYLES`**

Confirme que você está vendo a definição em torno da linha 68.

- [ ] **Passo 2: Estender a tipagem de `VARIANT_STYLES`**

Altere a linha 68-70 de:

```ts
const VARIANT_STYLES: Record<
  AlertVariant,
  { bg: string; icon: string; role: "status" | "alert" }
> = {
```

Para:

```ts
const VARIANT_STYLES: Record<
  AlertVariant,
  { bg: string; icon: string; border: string; role: "status" | "alert" }
> = {
```

- [ ] **Passo 3: Adicionar campo `border` ao objeto `info`**

Localize o objeto `info` (linha ~72) e altere de:

```ts
  info: {
    bg: "bg-[var(--hm-blue-100)] dark:bg-[var(--hm-blue-700)]/20",
    icon: "text-[var(--hm-blue-700)] dark:text-[var(--hm-blue-300)]",
    role: "status",
  },
```

Para:

```ts
  info: {
    bg: "bg-[var(--hm-blue-100)] dark:bg-[var(--hm-blue-700)]/20",
    icon: "text-[var(--hm-blue-700)] dark:text-[var(--hm-blue-300)]",
    border: "border-[var(--hm-blue-700)] dark:border-[var(--hm-blue-300)]",
    role: "status",
  },
```

- [ ] **Passo 4: Adicionar campo `border` ao objeto `success`**

Localize o objeto `success` (linha ~77) e altere de:

```ts
  success: {
    bg: "bg-[var(--hm-sage-100)] dark:bg-[var(--hm-sage-700)]/20",
    icon: "text-[var(--hm-sage-700)] dark:text-[var(--hm-sage-300)]",
    role: "status",
  },
```

Para:

```ts
  success: {
    bg: "bg-[var(--hm-sage-100)] dark:bg-[var(--hm-sage-700)]/20",
    icon: "text-[var(--hm-sage-700)] dark:text-[var(--hm-sage-300)]",
    border: "border-[var(--hm-sage-700)] dark:border-[var(--hm-sage-300)]",
    role: "status",
  },
```

- [ ] **Passo 5: Adicionar campo `border` ao objeto `warning`**

Localize o objeto `warning` (linha ~82) e altere de:

```ts
  warning: {
    bg: "bg-[var(--hm-sand-100)] dark:bg-[var(--hm-sand-700)]/20",
    icon: "text-[var(--hm-sand-700)] dark:text-[var(--hm-sand-300)]",
    role: "alert",
  },
```

Para:

```ts
  warning: {
    bg: "bg-[var(--hm-sand-100)] dark:bg-[var(--hm-sand-700)]/20",
    icon: "text-[var(--hm-sand-700)] dark:text-[var(--hm-sand-300)]",
    border: "border-[var(--hm-sand-700)] dark:border-[var(--hm-sand-300)]",
    role: "alert",
  },
```

- [ ] **Passo 6: Adicionar campo `border` ao objeto `error`**

Localize o objeto `error` (linha ~87) e altere de:

```ts
  error: {
    bg: "bg-[var(--hm-clay-100)] dark:bg-[var(--hm-clay-600)]/20",
    icon: "text-[var(--hm-clay-650)] dark:text-[var(--hm-clay-500)]",
    role: "alert",
  },
```

Para:

```ts
  error: {
    bg: "bg-[var(--hm-clay-100)] dark:bg-[var(--hm-clay-600)]/20",
    icon: "text-[var(--hm-clay-650)] dark:text-[var(--hm-clay-500)]",
    border: "border-[var(--hm-clay-650)] dark:border-[var(--hm-clay-500)]",
    role: "alert",
  },
```

---

### Task 2: Usar `styles.border` no layout `box`

**Arquivos:**
- Modificar: `packages/ui/src/components/Alert/Alert.tsx:184-198` (container div do layout box)

**Interfaces:**
- Consumes: `styles.border` (do Task 1)
- Produces: JSX com `border` aplicado

- [ ] **Passo 1: Localizar o container do layout `box`**

Procure a linha ~184 onde começa o `return` do layout `box`. Deve ser:

```tsx
  return (
    <div
      id={id}
      role={styles.role}
      className={[
        "@container rounded-[var(--hm-r-md)]",
        styles.bg,
        className,
      ].join(" ")}
    >
```

- [ ] **Passo 2: Adicionar `styles.border` ao array de classNames**

Altere o array de classNames de:

```tsx
      className={[
        "@container rounded-[var(--hm-r-md)]",
        styles.bg,
        className,
      ].join(" ")}
```

Para:

```tsx
      className={[
        "@container rounded-[var(--hm-r-md)]",
        styles.bg,
        styles.border,
        className,
      ].join(" ")}
```

Nota: `styles.border` entra DEPOIS de `styles.bg` mas ANTES de `className` (permitindo override via prop se necessário no futuro).

---

### Task 3: Verificar typecheck, lint e Storybook

**Arquivos:**
- Verificar: `packages/ui/src/components/Alert/Alert.tsx` (typecheck)
- Verificar: `packages/ui/src/components/Alert/Alert.stories.tsx` (Storybook visual)

**Interfaces:**
- Consumes: mudanças completadas nas Tasks 1 e 2
- Produces: confirmação visual e type safety

- [ ] **Passo 1: Rodar typecheck no pacote `ui`**

```bash
cd /home/bel/Projects/harmon/harmon
rtk pnpm typecheck --filter ui
```

Esperado: PASS, sem erros de tipo. Se falhar, revise a sintaxe das mudanças.

- [ ] **Passo 2: Rodar linter no pacote `ui`**

```bash
cd /home/bel/Projects/harmon/harmon
rtk pnpm lint --filter ui
```

Esperado: PASS, sem violações (ou com as mesmas violações que havia antes). Se falhar com novo erro, revise.

- [ ] **Passo 3: Iniciar Storybook localmente**

```bash
cd /home/bel/Projects/harmon/harmon
pnpm exec storybook dev --no-open
```

Aguarde até ver "Storybook started on..." Não precisa esperar a build completa.

- [ ] **Passo 4: Abrir Storybook no navegador**

Acesse `http://localhost:6006` no seu navegador (tipicamente a porta padrão).

- [ ] **Passo 5: Navegar até `Alert`**

Na sidebar do Storybook, procure por `Alert`. Clique para expandir.

- [ ] **Passo 6: Verificar visualmente cada variant em light mode**

Clique em cada story (`Info`, `Success`, `Warning`, `Error`). Para cada uma, confirme:
- O card tem uma borda colorida em torno dele (1px, não espessa)
- A cor da borda é coerente com o variant (azul p/ info, verde p/ success, etc.)
- O resto do card (fundo, ícone, texto) fica idêntico a antes

- [ ] **Passo 7: Alternar para dark mode**

Clique no ícone de lua/sol no canto superior direito do Storybook (ou use a toolbar de tema). Verifique que:
- A borda ficou mais clara (use o tom `*-300` — ex: `--hm-blue-300` pra info)
- A borda ainda contrasta bem contra o fundo translúcido

- [ ] **Passo 8: Fechar Storybook**

Encerre o servidor localmente. Não precisa deixar rodando.

---

### Task 4: Commit

**Arquivos:**
- Modified: `packages/ui/src/components/Alert/Alert.tsx`

- [ ] **Passo 1: Conferir o diff**

```bash
cd /home/bel/Projects/harmon/harmon
rtk git diff packages/ui/src/components/Alert/Alert.tsx
```

Esperado: ~10 linhas de adição (6 campos `border` + 1 mudança no array de classNames).

- [ ] **Passo 2: Stage a mudança**

```bash
cd /home/bel/Projects/harmon/harmon
rtk git add packages/ui/src/components/Alert/Alert.tsx
```

- [ ] **Passo 3: Commit**

```bash
cd /home/bel/Projects/harmon/harmon
rtk git commit -m "$(cat <<'EOF'
feat: add variant-colored borders to Alert box layout

VARIANT_STYLES now includes a `border` field per variant, matching
the color tones already used for icons (blue-700/300, sage-700/300,
sand-700/300, clay-650/500). Layout box now renders a 1px border
using these colors; inline layout unchanged (no card to delimit).

Improves visual contrast and card delimitation, especially in dark
mode or complex backgrounds.
EOF
)"
```

---

## Checklist de Auto-Revisão

✓ **Cobertura da spec:**
- "VARIANT_STYLES ganha campo `border`" — Task 1, passos 2-6
- "Container do layout `box` usa `styles.border`" — Task 2, passo 2
- "Layout `inline` não é tocado" — nenhuma mudança nele, só em `box`
- "Typecheck/lint/Storybook visual" — Task 3

✓ **Placeholders:** Nenhum "TBD", "TODO", "add error handling" etc.

✓ **Consistência de tipos:** 
- `VARIANT_STYLES` sempre retorna `{ bg, icon, border, role }`
- `styles.border` é uma string, entra direto no array de className
- Nenhuma função/tipo novo que possa ter nome inconsistente

✓ **Nenhum gap:** Todos os requisitos da spec têm uma task.
