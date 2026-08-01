# Convites de usuário restritos a beta-testers, com limite de 3

Data: 2026-08-01

## Contexto

`POST /v1/invites` (`apps/api/src/invites/routes.ts`, Épico 8 ainda em
construção) hoje deixa **qualquer usuário ativo** gerar convites, sem
nenhuma checagem de flag e sem limite de quantidade. Antes de abrir essa
porta, dois controles precisam existir: só quem é beta-tester pode convidar,
e no máximo 3 convites "em jogo" por pessoa.

## Escopo

**Dentro:**
- Nova flag `invites.user_to_user` (`state=beta` no seed) — gate de
  `POST /v1/invites`. Reaproveita o mecanismo existente de `state=beta` =
  "só pra quem tem `User.isBetaTester=true`" (ARQUITETURA.md §6.3) — nenhum
  conceito novo de segmento.
- Limite de **3 convites ativos por usuário**, contando `status IN
  (awaiting_approval, approved, registered)`. `rejected`/`expired` **não**
  contam — liberam vaga de volta.
- Checagem no backend em `POST /v1/invites`, antes de criar (fonte da
  verdade — front também esconde/desabilita o formulário, mesmo princípio
  "front esconde, back garante" de §6.3).
- Textos na tela de convite (`apps/web`, seção "Convidar para o Harmon" em
  `ConnectionsPage.tsx` ou equivalente):
  - Usuário não é beta-tester: mensagem explicando que convidar está
    disponível pro grupo de testadores por enquanto (sem formulário
    quebrado/vazio).
  - Usuário é beta-tester: contador "X de 3 convites usados".
  - Limite atingido (3/3 ativos): mensagem explicando que um convite
    rejeitado ou expirado libera uma vaga.

**Fora (decisão explícita):**
- Qualquer mudança na fila pública de espera (`WaitlistEntry`, §6.0) — o
  limite e a flag são só pro convite usuário-a-usuário (`Invite`).
- Aumentar/configurar o limite por usuário (ex. override de admin pra dar
  mais que 3) — YAGNI enquanto não houver pedido real.
- Mudar o que já existe em `DELETE /v1/invites/:id` / `POST
  /v1/invites/:id/resend` (spec 2026-07-28) — resend de um convite
  `approved` não conta como novo convite pro limite (o convite já existia
  antes do resend).

## Modelo de dados

Sem migração de schema — o limite é calculado, não armazenado (`Invite`
já tem `status`; conta-se via `count()`).

## Rota (`apps/api/src/invites/routes.ts`)

`POST /v1/invites` ganha, antes do `prisma.invite.create`:
1. `evaluateFlag("invites.user_to_user", user)` → 403/404 se off (mesmo
   padrão de "não vazar detalhe" já usado nas outras rotas flagueadas).
2. `count()` de `Invite` do `inviterUserId` com `status IN
   (awaiting_approval, approved, registered)`. Se `>= 3`,
   `VALIDATION_FAILED` — "Você já tem 3 convites em andamento. Aguarde uma
   resposta ou o vencimento de um deles."
3. `GET /v1/invites` (lista existente) passa a incluir também
   `activeCount`/`maxInvites` na resposta (ou endpoint dedicado, decisão de
   implementação) pra alimentar o contador "X de 3" no frontend sem o
   frontend duplicar a lógica de quais status contam como ativos.

## Frontend

Seção "Convidar para o Harmon" (`apps/web`): três estados —
não-beta-tester (mensagem, sem formulário), beta-tester com vaga livre
(formulário + contador "X de 3"), beta-tester no limite (formulário
desabilitado + mensagem de limite atingido, mantendo a lista de convites
existentes visível).

## Testes

- `apps/api/src/invites/routes.test.ts`: 403/404 quando flag off; bloqueia
  no 4º convite ativo; convite rejeitado/expirado libera vaga (cria 3,
  rejeita 1, confirma que um 4º passa); resend de convite `approved` não
  conta contra o limite.
- Frontend: validação manual via Playwright MCP (sem suíte de componente
  hoje) cobrindo os três estados da seção de convite.
