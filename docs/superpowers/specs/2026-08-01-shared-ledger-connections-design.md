# Ledger compartilhado entre conexões (substitui o portador por flags)

Data: 2026-08-01

## Contexto

Hoje (`apps/api/src/portador/routes.ts`, `apps/api/src/connections/routes.ts`)
o "acerto" entre dois usuários conectados vive inteiramente como flags na
própria `Transaction` (§6.10 arq): `portadorUserId`, `portadorSettled`,
`portadorMirrorOfTransactionId`. O saldo entre duas pessoas é **calculado on
the fly**, com a mesma fórmula duplicada em dois arquivos (soma de
`Transaction` com `portadorUserId=contraparte, portadorSettled=false`, sinal
vindo de `kind`).

Isso tem três limitações que motivam a mudança:

1. **Settle não fecha as duas pontas.** `POST /v1/portador/settle` só marca
   `portadorSettled=true` nas transações **do lado de quem chama** — cada
   usuário precisa "acertar" independentemente do seu lado, e nada garante
   que os dois lados fiquem consistentes (comentário no código já reconhece
   isso: "nenhuma tentativa de sincronizar as duas pontas automaticamente").
2. **Não entra no Patrimônio Total/Disponível Hoje (§6.9).** É uma tela à
   parte; um valor a receber real (alguém te deve) não soma no seu
   patrimônio.
3. **Trava em N=2 pra sempre.** O modelo só existe porque `UserConnection` é
   estritamente 1-para-1. Não há caminho de evolução pra "Viagem de Férias
   dividida entre 4 amigos" sem construir um segundo mecanismo do zero.

Esta spec troca o par de flags por um ledger de verdade — desenhado desde já
no formato "pagador + N devedores com rateio", mesmo operando só com N=2
hoje (a conexão de casal/par é o caso particular). Grupos (N>2) ficam **fora
de escopo** — não estamos construindo `Group` agora — mas o formato do dado
não precisa de reescrita quando esse dia chegar.

## Escopo

**Dentro:**
- Novos modelos `SharedLedger` / `SharedLedgerParticipant` /
  `SharedLedgerEntry` / `SharedLedgerShare` (Prisma).
- Criação automática do ledger (+ 2 participantes) quando uma
  `UserConnection` vira `accepted`.
- Atribuição de despesa ("quem paga é o B") disponível tanto no lançamento
  manual quanto na revisão futura de fatura importada (Épico 5, fora deste
  ciclo — a rota de atribuição não depende da origem da transação, mesmo
  padrão que `portador/assign` já segue hoje).
- Aceitar/rejeitar por item (mesmo fluxo de hoje): aceitar **exige** escolher
  conta OU cartão próprio (nunca os dois, nunca nenhum — mesma validação XOR
  que já existe hoje) e cria ali uma transação comum, só pra categorização no
  orçamento do devedor — agora desacoplada do ledger, que já é a fonte da
  dívida por si só.
- Acerto (settlement): ação única que fecha as duas pontas atomicamente (ver
  §Modelo de dados) — corrige a limitação nº 1 acima.
- Patrimônio Total / Disponível Hoje somam o saldo líquido de cada ledger
  ativo em que o usuário participa (novo termo no `packages/core`, nova linha
  no contrato `Money.breakdown`, IMPLEMENTACAO §3.0).
- Lista de contas na UI ganha um card "tipo conta" por ledger ativo.
- Nova capacidade: **desfazer conexão já aceita** (`disconnect`) — não existe
  hoje (o `DELETE /v1/connections/:id` atual só apaga `status=pending`). Com
  saldo ≠ 0, bloqueia e oferece gerar um acerto zerador antes; com saldo = 0,
  arquiva (`UserConnection.status=disconnected` — novo valor de enum — e
  `SharedLedger.status=archived`), mantendo visível como histórico read-only.
- Nova flag `connections.core` (gate de formar/gerenciar conexão em si) +
  revalidação server-side em `connections/routes.ts` (hoje não existe
  nenhuma — só o front esconde o CTA; fecha esse gap junto).
- Migração limpa de `portadorUserId`/`portadorSettled`/
  `portadorMirrorOfTransactionId` → removidos da `Transaction`. Sem shim de
  compatibilidade (banco é de dev/seed, sem dado de produção em jogo).

**Fora (decisão explícita):**
- `Group`/rateio N>2 (viagem com amigos) — só o formato do dado antecipa
  isso, a feature de grupo em si não é construída agora.
- Revisão de fatura importada em si (Épico 5) — a rota de atribuição já
  funciona independente da origem, mas a UI de "reconhecer portador no
  extrato" não existe ainda e não é criada aqui.
- Rateio desigual/percentual por item — hoje é sempre 100% pro devedor
  indicado (mesma semântica do portador atual).

## Modelo de dados

```prisma
enum SharedLedgerScope { connection }   // group fica reservado, não criado

enum SharedLedgerStatus { active archived }

model SharedLedger {
  id           String  @id @default(cuid())
  scopeType    SharedLedgerScope @default(connection)
  connectionId String? @unique
  status       SharedLedgerStatus @default(active)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model SharedLedgerParticipant {
  id       String   @id @default(cuid())
  ledgerId String
  userId   String
  joinedAt DateTime @default(now())
  @@unique([ledgerId, userId])
}

enum SharedLedgerEntryKind { expense_assignment settlement }

model SharedLedgerEntry {
  id                  String @id @default(cuid())
  ledgerId            String
  kind                SharedLedgerEntryKind
  sourceTransactionId String?   // a despesa real, ou a transferência de acerto
  payerUserId         String
  createdAt           DateTime @default(now())
}

enum SharedLedgerShareStatus { pending accepted rejected }

model SharedLedgerShare {
  id             String @id @default(cuid())
  entryId        String
  owedByUserId   String
  amountBRLCents Int              // sempre positivo
  status         SharedLedgerShareStatus @default(pending)
  respondedAt    DateTime?
}
```

**Saldo é sempre derivado** (mesmo princípio de `Account.reconciledBalanceCents`
— cache nunca é a verdade): para um participante X num ledger,
`net(X) = Σ shares aceitas onde X é payerUserId da entry − Σ shares aceitas
onde X é owedByUserId`. Hoje (N=2) cada entry tem exatamente 1 share.

**Settlement fecha as duas pontas numa ação só:** `kind=settlement` cria uma
`SharedLedgerEntry` com 1 `SharedLedgerShare` já `status=accepted` (não passa
por aceite — dinheiro já mudou de mão de verdade), com valor igual ao saldo
sendo zerado. Como o saldo é derivado do ledger (não duplicado por usuário),
essa única entry já reflete corretamente pros dois lados — corrige a
limitação nº1 do modelo atual.

`ConnectionStatus` (enum existente) ganha `disconnected`, distinto de
`rejected` (recusa antes de aceitar) — usado só pelo fluxo de desfazer
conexão já aceita.

## Ciclo de vida

1. `UserConnection` → `accepted`: cria `SharedLedger(scopeType=connection,
   connectionId)` + 2 `SharedLedgerParticipant`, saldo 0. `DomainEvent`
   `shared_ledger.created` pras duas pontas.
2. Atribuição: A tem uma `Transaction` real (própria conta/cartão, manual ou
   importada) e marca "quem paga é B" → `SharedLedgerEntry(kind=
   expense_assignment, payerUserId=A, sourceTransactionId=<tx de A>)` +
   `SharedLedgerShare(owedByUserId=B, status=pending)`.
3. B valida por item: aceitar (escolhendo, obrigatoriamente, conta OU cartão
   próprio — nunca os dois — pra categorizar no orçamento dele: uma
   `Transaction` comum, sem vínculo com o ledger) ou rejeitar. `share.status`
   vira `accepted`/`rejected`;
   rejeição sempre gera `DomainEvent` nas duas timelines (§6.10, comportamento
   já existente preservado).
4. Acerto: qualquer um dos dois pode disparar, escolhendo a conta/cartão
   próprio de onde sai/entra o dinheiro de verdade — cria a `Transaction` real
   de transferência **e** a `SharedLedgerEntry(kind=settlement)` que zera o
   saldo pros dois. `DomainEvent` `shared_ledger.settled` pras duas pontas.
5. Desfazer conexão aceita: se `net(A) != 0` (ou `net(B) != 0` — são sempre
   simétricos), bloqueia com mensagem + oferece gerar o acerto zerador (passo
   4) antes de tentar de novo. Com saldo 0: `UserConnection.status=
   disconnected`, `SharedLedger.status=archived`. Ledger arquivado continua
   visível (histórico, read-only) na UI de ambos.

## Integração com Patrimônio/Disponível Hoje/Timeline

- **Patrimônio Total / Disponível Hoje (§6.9):** novo termo, somado junto com
  `Σ Account`: `+ Σ net(usuário, ledger)` por ledger `active` em que ele
  participa. Novo tipo de linha no contrato `Money.breakdown`
  (IMPLEMENTACAO §3.0) — ex. "Acerto com Maria: R$ 320,00".
- **Lista de contas (UI):** ledgers `active` do usuário renderizam como card
  "tipo conta" (mesmo não sendo `Account`); ledgers `archived` aparecem numa
  seção de histórico, sem entrar no patrimônio.
- **Timeline (§6.12):** de graça — cada transição de estado já emite
  `DomainEvent` (padrão idêntico ao resto do produto); a Timeline não precisa
  saber que `SharedLedgerEntry` existe.

## Flags

- **`connections.core`** (nova, seed `state=beta`): gate de
  `POST/GET /v1/connections`, `/accept`, `/reject`, `/disconnect`. Front já
  esconde o CTA quando off; adiciona preHandler de revalidação no backend
  (gap hoje: essas rotas não checam flag nenhuma).
- **`connections.portador`** (existente, mesma key, sem migração de flag):
  passa a gate-ar as rotas de atribuição/aceite/rejeição/acerto do ledger
  (hoje `apps/api/src/portador/routes.ts`) — sem revalidação server-side hoje;
  adiciona também. Descrição do seed atualizada pra mencionar o ledger e o
  lançamento manual (não só fatura importada).

## Migração

`portadorUserId`, `portadorSettled`, `portadorMirrorOfTransactionId` saem do
schema (`Transaction`). Sem dado de produção em jogo (banco é de
dev/seed) — migração direta, sem shim de compatibilidade. Rotas de
`apps/api/src/portador/routes.ts` reescritas por cima das novas tabelas,
mantendo os mesmos paths (`/v1/portador/*` — "portador" continua sendo o
termo de produto pro reconhecimento de cartão adicional, só o modelo por
trás muda) e a mesma UX de aceitar/rejeitar por item.

## Testes

- `packages/db`: migração aplica limpo em banco de seed.
- `apps/api/src/portador/routes.test.ts` (reescrito): assign/accept/reject
  contra o novo ledger; settle zera `net()` pros dois lados numa chamada só
  (teste que hoje não existe, porque o bug de assimetria não era testável).
- `apps/api/src/connections/routes.test.ts`: novo `disconnect` — bloqueia com
  saldo ≠ 0, sugere acerto, arquiva com saldo 0; `connections.core` 403/404
  quando flag off (mesmo padrão de "não vazar existência").
- `packages/core`: novo termo de patrimônio com ledger positivo (ativo) e
  negativo (passivo) pro mesmo usuário em conexões diferentes.
- Frontend: validação manual via Playwright MCP (sem suíte de componente
  hoje pra `ConnectionsPage`) cobrindo atribuir → aceitar → acertar →
  desfazer conexão, e o card de ledger aparecendo/saindo do patrimônio.
