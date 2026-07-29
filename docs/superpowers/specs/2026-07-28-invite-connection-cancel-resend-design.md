# Excluir / reenviar convites e conexões pendentes

Data: 2026-07-28

## Contexto

Hoje `Invite` (convite de cadastro na plataforma, aprovado por admin) e
`UserConnection` (pedido de conexão entre dois usuários já cadastrados) só
podem ser criados e — no caso de `UserConnection` — aceitos/recusados pelo
destinatário. Não existe nenhuma forma de cancelar um pedido enviado por
engano, nem de reenviá-lo depois que o link/token expira ou o e-mail se
perde. Esta spec cobre as duas lacunas para os dois modelos, utilizável
tanto por quem enviou o convite/pedido quanto por um admin.

Também aproveita para fechar um TODO já documentado: `POST
/v1/admin/access/invites/:id/approve` gera o token de registro mas nunca
enviou o e-mail de convite (`admin/routes.ts:8-11`, `ARQUITETURA.md §6.1`) —
o e-mail de verdade é implementado agora, usando um template pronto que o
usuário gerou com uma ferramenta de design (handoff em
`design_handoff_harmon_2/emails/`).

## Escopo

**Dentro:**
- Excluir/reenviar `Invite` (convite de cadastro).
- Excluir/reenviar `UserConnection` (pedido de conexão), do lado do
  requester — o addressee já tem aceitar/recusar, inalterado.
- Ambas as ações disponíveis para o autor original (inviter/requester) e
  para qualquer admin.
- Envio real do e-mail de convite (`harmon-convite.html`, do handoff de
  design) na aprovação e no reenvio.
- Novo e-mail de notificação de pedido de conexão (`harmon-conexao.html`,
  escrito à mão no mesmo estilo visual), no envio e no reenvio.
- Mover os 3 HTMLs prontos do handoff (`harmon-convite.html`,
  `harmon-confirmacao.html`, `harmon-reset-senha.html`) para
  `apps/api/src/email/templates/` como assets do repo.

**Fora (decisão explícita, não esquecimento):**
- Fluxo de confirmação de e-mail no cadastro e fluxo de "esqueci minha
  senha" — os templates `harmon-confirmacao.html`/`harmon-reset-senha.html`
  ficam como assets parados até essas features existirem (nenhuma rota
  correspondente existe hoje).
- Rate limiting de reenvio (sem histórico de abuso, YAGNI).
- Ações do lado do addressee/invitee (convidado) — pedido do usuário foi só
  sobre inviter + admin.
- Ampliar a visibilidade do painel Acessos do admin além do que já existe
  hoje (`Invite` com `status=awaiting_approval`) — admin não ganha
  visibilidade nova sobre `Invite` aprovados nem sobre `UserConnection`
  pendentes; a autorização da API aceita admin em qualquer estado, mas a UI
  do admin só expõe "Excluir" onde ele já enxerga hoje.

## Modelo de dados

Sem migração de schema. Exclusão é **hard delete** (não soft-delete/status
novo):

- `Invite`: bloqueado só quando `status === "registered"` (já virou conta).
  Permitido nos demais estados.
- `UserConnection`: permitido só quando `status === "pending"`.

Hard delete permite reconvidar a mesma pessoa sem esbarrar no
`@@unique([requesterUserId, addresseeUserId])` de `UserConnection`. Cada
exclusão/reenvio grava um `DomainEvent` antes de agir (novo
`aggregateType: "Invite"`, reaproveitando `"UserConnection"` já existente),
preservando rastro de auditoria mesmo com a linha apagada.

## Rotas (apps/api)

Autorização em todas: `donoDoRecurso === request.userId || request.userRole
=== "admin"` — checagem inline na mesma rota de auto-serviço (não rotas
`/v1/admin/*` separadas). Decisão: menos rotas, lógica de negócio num só
lugar; aceito o desvio do padrão atual do projeto (onde admin é sempre uma
família de rotas separada) porque duplicar 4 handlers só pra trocar o
preHandler não paga o custo de manutenção.

**`apps/api/src/invites/routes.ts`** (adiciona ao arquivo existente):
- `DELETE /v1/invites/:id` — dono é `inviterUserId`. 404 se não for
  dono/admin (mesmo padrão de "não vazar existência" já usado em
  `connections/routes.ts`). `VALIDATION_FAILED` se `status === "registered"`.
  Apaga a linha, dispara `DomainEvent` `invite.deleted`.
- `POST /v1/invites/:id/resend` — mesma autorização. Só permitido quando
  `status === "approved"` (senão nada foi aprovado/enviado ainda —
  `VALIDATION_FAILED`, "Este convite ainda não foi aprovado."). Gera novo
  `rawToken`/`hashToken`/`tokenExpiresAt` (mesma lógica de
  `admin/routes.ts` approve, `TOKEN_TTL_MS` = 7 dias, **sem mudar**), chama
  `sendInviteEmail`, dispara `DomainEvent` `invite.resent`.

**`apps/api/src/connections/routes.ts`** (adiciona ao arquivo existente):
- `DELETE /v1/connections/:id` — dono é `requesterUserId` (nunca
  `addresseeUserId` — ele usa accept/reject). Só quando `status ===
  "pending"`. Apaga a linha, `DomainEvent` `connection.deleted` para as duas
  pontas (mesmo padrão de "toda ponta gera evento" já usado em accept/reject).
- `POST /v1/connections/:id/resend` — mesma autorização/estado. Reenvia o
  e-mail de notificação, sem mudar token/estado. `DomainEvent`
  `connection.resent`.

**`POST /v1/admin/access/invites/:id/approve`** (existente, editado): depois
de gerar o token, chama `sendInviteEmail` — primeiro envio real do e-mail.

**`apps/api/src/admin/routes.ts`**: nenhuma rota nova.

## E-mails

- **Templates fonte**: `apps/api/src/email/templates/` recebe os 4 HTMLs —
  os 3 do handoff (`harmon-convite.html`, `harmon-confirmacao.html`,
  `harmon-reset-senha.html`, os dois últimos não usados por código ainda) e
  um novo `harmon-conexao.html` escrito à mão (mesmo chassi visual: faixa
  escura + cartão branco + botão areia; sem link/token, só avisa que há
  pedido pendente). Cada HTML ganha um par `.txt` com a versão texto puro
  (`harmon-convite.txt`, `harmon-conexao.txt`), escrito à mão.
- **Renderização**: nenhum motor de template existe no projeto. Novo helper
  `apps/api/src/email/render-template.ts` — `renderTemplate(name, vars)` lê
  o arquivo de `templates/` e substitui `{{chave}}` por regex. Sem
  dependência nova (2 e-mails não justificam Handlebars/EJS/etc).
  Funciona sem etapa de build: `apps/api` roda direto de `.ts` via `tsx`
  (dev e prod, ver Dockerfile) e o Docker copia o repo inteiro — os `.html`
  ficam disponíveis no runtime sem pipeline de asset.
- **Envio multipart**: `sendInviteEmail`/`sendConnectionRequestEmail`
  (`apps/api/src/email/templates.ts`, novo) chamam `resend.emails.send`
  passando `html` e `text`, igual ao `sendTestEmail` já faz com `text`.
- **Token**: mantém o mecanismo já existente (`randomBytes(24)` +
  `hashToken()` armazenado por hash, nunca o valor puro). Já é de uso único
  na prática — depois do cadastro, `status` sai de `"approved"` e
  `assertUsable()` (`access/tokens.ts`) passa a rejeitar. **TTL continua 7
  dias** (decisão: manter o código como está, não os 14 dias que o handoff
  de design sugeria); o texto do e-mail é ajustado pra "expira em 7 dias".
- **Rodapé**: remove a linha de endereço postal fictício (não existe um
  real pra colocar) e remove `{{unsubscribe_url}}` — é e-mail transacional
  disparado por uma aprovação pontual, não uma lista de marketing; um link
  de unsubscribe fake ficaria pior que não ter nenhum. Mantém só "Você
  recebeu este e-mail porque pediu acesso ao Harmon."
- **Variáveis de `harmon-convite.html`**: `{{link}}` substitui a URL de
  exemplo (`https://app.harmon.com.br/convite/abc123`) por
  `${WEB_APP_URL}/register?token=${rawToken}`. O bloco "Disponível hoje R$
  4.182,35" fica fixo como peça de marca — o convidado ainda não tem conta,
  não há dado real pra mostrar.
- **Novo env var** `WEB_APP_URL` (`apps/api/src/env.ts`): default
  `http://localhost:5173` (porta padrão do Vite dev server) em dev,
  `https://${DOMAIN}` no `docker-compose.prod.yml` (api e web já dividem o
  mesmo `DOMAIN`, diferenciados por `PathPrefix(/v1)` no Traefik).
- **Gatilhos**: primeiro envio em `approve` (existente, editado), reenvio em
  `POST /v1/invites/:id/resend`; notificação em `POST /v1/connections`
  (criação) e `POST /v1/connections/:id/resend`.
- **Falha de envio**: erro do Resend sobe como 500 (mesmo padrão de
  `sendTestEmail`, que já lança). A mudança de estado no banco (token
  regenerado, linha criada) já foi commitada antes da tentativa de envio —
  um "reenviar" seguinte tenta de novo, é aceitável não ser atômico aqui.

## Frontend

**`apps/web/src/routes/ConnectionsPage.tsx`**:
- Seção "Convites enviados" (`UserConnection` pendente, `isRequester`):
  cada linha ganha **Excluir** e **Reenviar** (mutations `DELETE
  /connections/:id`, `POST /connections/:id/resend`), no padrão visual do
  botão "Revogar" de shares (`variant="secondary"`, `loading` da mutation).
- Seção "Convidar para o Harmon" (`Invite`): cada linha ganha **Excluir**
  sempre que `status !== "registered"`, e **Reenviar** só quando `status
  === "approved"`.

**`apps/web/src/routes/AdminPage.tsx`** (painel Acessos): convites
`awaiting_approval` ganham um terceiro botão **Excluir** ao lado de
Aprovar/Rejeitar. Sem reenviar aqui (nada foi aprovado/enviado ainda) e sem
seção nova para `UserConnection` (fora de escopo, ver acima).

## Erros novos

Seguindo a convenção mista do projeto — `VALIDATION_FAILED` ad-hoc nos
próprios arquivos de rota (como `connections/routes.ts` já faz para "Este
convite já foi respondido."), não constantes novas em `errors.ts`:
- Invite delete com `status === "registered"`: "Este convite já resultou em
  um cadastro."
- Invite resend fora de `status === "approved"`: "Este convite ainda não
  foi aprovado." (ou mensagem equivalente pro caso terminal).
- Connection delete/resend fora de `status === "pending"`: "Este pedido de
  conexão já foi respondido." (mesma frase já usada em accept/reject).
- Ownership/admin: 404 (`NOT_FOUND`), não 403 — mesmo padrão de não vazar
  existência já usado em `connections/routes.ts` accept/reject.

## Testes

- `apps/api/src/invites/routes.test.ts`: delete (dono, admin, não-dono
  404, já registrado bloqueado), resend (dono, admin, estado errado
  bloqueado, e-mail disparado com token novo).
- `apps/api/src/connections/routes.test.ts`: delete/resend equivalentes
  (dono=requester, admin, addressee bloqueado, estado errado bloqueado).
- `apps/api/src/admin/routes.test.ts`: approve agora dispara e-mail
  (mock do Resend).
- `apps/api/src/email/render-template.test.ts` (novo): substituição de
  variáveis, chave ausente não quebra.
- Frontend: sem suíte de componente hoje para `ConnectionsPage`/`AdminPage`
  (nenhum teste existente pra estender) — validação manual via Playwright
  MCP antes de fechar, cobrindo os 4 fluxos (excluir/reenviar convite,
  excluir/reenviar conexão) como dono e como admin.
