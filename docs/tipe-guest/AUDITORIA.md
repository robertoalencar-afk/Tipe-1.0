# Tipe Guest · Auditoria do repositório (Fase 1)

Data da verificação: 27/10/2026. Base: `main` em `124191c` mais as branches remotas abertas (lidas com `git fetch --depth 1` e `git show`/`git ls-tree`, sem mesclar nada). Documento de trabalho da Fase 1 do prompt *Tipe Guest 2.0 + Restaurante Fundador v2*.

Legenda de status: **funciona em main** · **em PR não mesclado** (número do PR) · **falta**.

## 1. Resumo para decisão

- Nada de reservas, disponibilidade, lista de espera, descoberta, perfil público de restaurante, conta de consumidor ou app nativo existe hoje, em `main` ou em qualquer branch. O Guest é construção nova, mas tem bons alicerces: restaurantes, mesas, sessão de mesa, pagamento confirmado por webhook, avaliação pós-pagamento, CRM com "clientes do restaurante" (em PR) e a demonstração `/demo` (em PR).
- **As avaliações atuais não servem para o Guest público.** `waiter_ratings` não liga a nota ao pagamento, não pede consentimento e não está citada no conteúdo legal. A Fase 2 precisa começar a coletar avaliações novas, com consentimento opcional, sem mudar a atual.
- **"Nome lembrado" é só do aparelho:** o nome fica em `localStorage` por restaurante e mesa (`customerStorageKey`), não no servidor. A landing ("O nome fica guardado para a próxima visita") está correta para o mesmo aparelho, mas não existe perfil de cliente no banco.
- **`founder` já é o papel da equipe Tipe** (enum `app_role`). O programa de restaurantes usa `founding_partner_*`.
- **Migrações:** o Guest reserva **0040–0049** (ver seção 7). Fase 1 não cria migração.

## 2. Stack e ambiente

| Item | Situação |
|---|---|
| Frontend | TanStack Start 1.168 + React 19 + TypeScript strict, Tailwind 4, Radix/shadcn (`package.json`) |
| Backend | Server functions do TanStack (`createServerFn`) + Supabase (Postgres, RLS) via `supabaseAdmin` só no servidor (`*.server.ts`, imports dinâmicos) |
| Migrações | `supabase/migrations/` (12 arquivos da Lovable, 25/09–01/10) e `drizzle/migrations/0000–0022` em `main` |
| Testes | Vitest (`src/lib/tipe/*.test.ts`) e banco local `tests/db/run.sh` (Postgres 16, `bootstrap.sql`, `payments.sql`) |
| Dependências da Lovable ainda em `main` | `@lovable.dev/*` no `package.json`; `src/integrations/lovable/index.ts`, `previewAuthStorage.ts`, `send-email.ts`, `lebre.functions.ts`, `split-ai.functions.ts`, assets `*.asset.json`. A saída está no PR #34 (`infra/sair-da-lovable`) e #36 (staging). **O Guest não deve usar nenhum desses pontos.** |
| Mobile / monorepo | **falta**: não há `apps/`, Expo, React Native nem workspaces |

## 3. Rotas e papéis

| Rota | O que é | Status |
|---|---|---|
| `/` | Landing (em `main` ainda a antiga, com bloco `ForGuests` em `src/routes/index.tsx:226`) | funciona em main |
| `/$restaurante/$mesa`, `/mesa/$restaurante/$mesa` | Conta do cliente pelo QR: dividir, pagar, avaliar, gorjeta | funciona em main |
| `/$restaurante` | Página do restaurante (índice) | funciona em main |
| `/painel` | Painel do restaurante (`RestaurantPanel.tsx`, abas como "Salão", "Mesas e QR Codes") | funciona em main |
| `/garcom` | Área do garçom | funciona em main |
| `/backoffice`, `/admin/leads` | Backoffice Tipe e leads | funciona em main |
| `/fundador` | Super-admin da equipe Tipe com 2FA (`founder-guard.ts`, `FounderMfaGate.tsx`) | funciona em main |
| `/$restaurante/cozinha`, `/senhas`, `/totem` | KDS, painel de senhas, totem | em PR (#6–#9, `order/base` #32) |
| `/crm/*` (24 rotas) | CRM comercial, contas, clientes do restaurante, WhatsApp, gamificação | em PR (#29), modo demonstração |
| `/demo` | Restaurante fictício, papéis cliente/garçom/cozinha/gerente/tipe, no navegador | em PR (#20) |
| `/produtos/$produto` (inclui `guest`) | Páginas de produto da landing nova | em PR (#28/#30) |
| Qualquer rota do Guest (`/guest`, `/demo/guest`, reservas) | — | **falta** |

**Autenticação:** `src/routes/_authenticated/route.tsx` só verifica `supabase.auth.getUser()` e manda para `/entrar`. Não há distinção por tipo de usuário no guard; quem decide o que a pessoa vê são as funções do servidor e o RLS.

**Papéis:** enum `public.app_role` = `founder | owner | cashier | waiter` (`supabase/migrations/20260926100944_…sql:1`), em `user_roles` por restaurante. Funções de RLS: `has_role`, `is_restaurant_member`, `has_restaurant_role` (SECURITY DEFINER, `search_path` fixo, sem `EXECUTE` para `anon`).

**Implicação para o Guest:** um consumidor do Guest será um `auth.users` **sem** linha em `user_roles`. É preciso garantir que esse usuário não caia no onboarding de restaurante nem enxergue painel (ver riscos em `ARQUITETURA.md`). Não se cria valor novo no enum `app_role` para consumidor; o consumidor é identificado pela existência de `guest_profiles`.

## 4. Restaurante, mesa e salão

| Dado | Onde | Status |
|---|---|---|
| `restaurants`: `slug`, `name`, `cnpj`, `address` (texto livre), `phone`, `opening_hours` (texto livre), `service_rate`, `pos_mode`, `bill_payment_methods`, `google_review_url` | `supabase/migrations/20260929182948_…sql:1-7`, `0002`, `0008`, `0012`, `0021` | funciona em main |
| `restaurant_tables`: `number` (texto), `active`, `code`, `access_token`, `waiter_id`, `session_token` | `20260926100944`, `20260926103913`, `20260930104852` | funciona em main |
| Capacidade de mesa (lugares), área do salão, posição no mapa, combinação de mesas | — | **falta** |
| Endereço estruturado, bairro, coordenadas, culinária, faixa de preço, fotos públicas, horários estruturados | — | **falta** (só `address`/`opening_hours` como texto) |
| Aba "Salão" do painel | `RestaurantPanel.tsx:60,294`: lista de mesas ao vivo, sem mapa espacial | funciona em main |

Consequência: o motor de reservas (Fase 4) precisa acrescentar `seats_min/seats_max` e área às mesas (colunas novas, nulas, sem mudar o QR) e o perfil público precisa de uma tabela separada (`guest_restaurant_profiles`) para não misturar dado operacional com vitrine.

## 5. Fluxo do QR e pagamento

- Sessão da mesa: `verifyTableSession(slug, mesa, session)` em `src/lib/tipe/security.server.ts:102` compara `restaurant_tables.session_token` em tempo constante e registra negação em `security_events`.
- Pagamento: `table_payment_requests` com `idempotency_key`, confirmação pelo provedor (Pagar.me) via webhook (`/api/public/pagarme/webhook`), conciliação (`payments.reconcile`), estornos e `payment_incidents` (0019/0022).
- **Bloqueio de segurança conhecido (do Order):** o `access_token` do QR é fixo e a sessão vem dele; uma foto do QR permite abrir a conta de casa. Para o Guest isso importa na Fase 5: o **check-in da reserva** deve abrir/ligar a sessão da mesa pelo lado da operação (recepção/garçom), nunca por um token público. Ver `docs/tipe-order/AUDITORIA.md` (PR #31).

O Guest **não altera** nada disso. O link reserva → mesa será feito por uma tabela própria (`guest_reservation_table_links` ou coluna na reserva), lida pelo pagamento só para estatística, nunca para decidir cobrança.

## 6. Avaliação pós-pagamento (o ponto mais sensível)

**O que é gravado** (`drizzle/migrations/0009_waiter_ratings.sql`): `restaurant_id`, `waiter_id` (o garçom atual da mesa, definido pelo servidor), `table_number`, `stars` 1–5, `comment` até 400, `created_at`.

**Como é gravado** (`src/lib/tipe/payments.functions.ts`, `submitRating`): exige sessão válida da mesa e limita 5 envios por 10 minutos por mesa/sessão (`enforceRate`). Insere com `supabaseAdmin`. **Não** recebe nem grava o pagamento; quem tem a sessão da mesa pode avaliar mesmo sem ter pago. No cliente (`src/routes/$restaurante.$mesa.tsx:720`) o envio é "dispara e esquece" (`.catch(() => undefined)`).

**Quem lê:** RLS `Owners and cashiers read ratings` (dono e caixa); garçom não lê direto. `waiter-insights.functions.ts` agrega para o painel. Em `order/base` (#32), nota ≤ 2 dispara aviso à equipe (`avisarNota`).

**O que o cliente vê na tela:** "Como foi seu atendimento? Sua avaliação ajuda {garçom} e o restaurante." Comentário opcional. **Nenhum aviso de privacidade, nenhuma menção a uso público.** Depois, todos (sem filtro por nota) veem o botão "Avaliar no Google" quando o restaurante tem `google_review_url`.

**Conteúdo legal:** `grep -i "avalia|estrela|rating"` em `src/lib/tipe/legal-content.ts` e `legal.ts` não encontra nada. A política atual não trata avaliações.

**Conclusões:**
1. As avaliações antigas são internas e assim ficam. Não têm consentimento para publicação nem prova de visita paga.
2. A nova coleta (Fase 2) precisa: ligar a avaliação ao pagamento aprovado (`table_payment_requests.id` com `status = 'approved'` confirmado pelo webhook) para marcar "visita paga verificada"; consentimento separado e desmarcado; versão do texto aceito; moderação.
3. Manter `submitRating` e a tela como estão é viável: a Fase 2 acrescenta uma segunda escrita (nova tabela) ou estende a função com campos opcionais, sem quebrar o contrato atual.

## 7. Migrações e numeração

| Número | Arquivo | Onde | Dono |
|---|---|---|---|
| 0000–0022 | — | `main` | — |
| 0023 | `counter_sales_kds_ticket_board` | #6, `order/base` | Colibri/Order |
| 0024 | `customer_self_order` | #8, `order/base` | Colibri/Order |
| 0025 | `self_service_totem` | #9, `order/base` | Colibri/Order |
| 0026 | `staff_push_subscriptions` | #19, `order/base` | Sunday/Order |
| 0027 | reservada | `docs/tipe-order/FASE-5.md` | Tipe Order (produto) |
| 0028 | `product_launch_states` | #33 `order/landing`, `release/candidato-cloudflare-20261027` | Tipe Order landing |
| 0029 | livre, deixada para o Order | — | Tipe Order (se precisar) |
| 0030 | `restrict_internal_rpc_execution` | #34 `infra/sair-da-lovable`, #36 | Infra |
| 0031–0032 | usadas | PR #45 / release | Release |
| 0033 | usada | caixa / esperado no servidor | Caixa |
| 0034–0039 | fora do bloco do Guest (uso não verificado) | — | — |
| **0040–0049** | **reservadas ao Tipe Guest** | — | Guest (0040 avaliações, 0041 Restaurante Fundador, 0042+ reservas) |

Combinado por mensagem com a thread do Tipe Order em 27/10; renumerado em 28/10 para 0040–0049 porque 0031–0032 foram usadas pelo PR #45/release e 0033 por caixa/esperado-no-servidor. Se algum PR for mesclado fora de ordem, o `_journal.json` do drizzle precisa ser reordenado antes (o Order já registrou esse cuidado).

## 8. CRM (PR #29, `crm/backoffice-saas`)

- Modo demonstração no navegador (`src/lib/tipe/crm/store.ts`, `seed.ts`), proposta SQL não aplicada (`docs/crm/supabase-crm.sql`), adaptadores em `adapters.ts`.
- Três camadas já tipadas em `types.ts`: A Comercial (`Lead`, `Deal`…), B Conta do restaurante (`RestaurantAccount`, com `modules: ModuleKey[]` que já inclui `"avaliacao"`, e `platformRestaurantId` para ligar ao Supabase), C Clientes do restaurante (`Consumer` com `phoneLast4` e `marketingOptIn`, `Visit` com `rating` e `source: "demo" | "tipe"`, `Campaign` simulada).
- **Onde o Guest entra:** Restaurante Fundador como visão da camada B (`RestaurantAccount` ganha `foundingPartner?`), e o relacionamento do Guest (reservas, visitas, avaliações elegíveis) alimenta a camada C. **Não** se cria outro CRM.
- Leads reais hoje: `restaurant_leads` via `submitLead`/`submitLeadDetails` (`src/lib/tipe/leads.functions.ts`), listados em `/admin/leads`. O CTA do Fundador e o "Quero ser avisado" do Guest devem gravar ali (com origem distinta).

## 9. Demonstração (PR #20, `tipe-2.0/fase-0-demo`)

- `src/lib/tipe/demo/engine.ts` (1.559 linhas) é um reducer puro (`apply(state, action)`), com `DemoState` v3: restaurante, equipe, cardápio, mesas, pedidos, pagamentos, `ratings` (já ligadas a `paymentId`), alertas, extrato simulado do provedor. Papéis: `cliente | garcom | cozinha | gerente | tipe`. Testes em `engine.test.ts`.
- `/demo?papel=…&mesa=…` (`src/routes/demo.tsx`), `noindex`.
- **Encaixe do Guest (Fase 6):** acrescentar o papel `guest` e um "slice" de reservas no mesmo estado (ou estado irmão com a mesma loja), para que a reserva feita como Guest apareça para o gerente/garçom e o check-in abra a mesa da demo, seguindo para o pagamento simulado que já existe.

## 10. Tipe Order (PR #31, #32, #33)

- `order/base` (#32) junta conta Sunday, pedido na mesa, KDS, garçom, totem e avisos push. Ele mexe muito em `$restaurante.$mesa.tsx` (+1.931 linhas) e `garcom.tsx`.
- **Consequência:** a Fase 2 do Guest mexe na tela de avaliação, que está nesse arquivo. Para não criar conflito, a Fase 2 deve partir de `order/base` (ou da branch que estiver como base no momento) e tocar o mínimo do arquivo (componente separado para o consentimento).
- Landing do Order: `order/landing` (#33) sobre `redesign-landing-v6` acrescenta `useLancamento.ts` e estados de lançamento por produto (0028). A Fase 8 do Guest deve reutilizar esse mecanismo para manter "Em breve".

## 11. Landing (PR #28/#30)

- `src/components/tipe/site/produtos.ts` (em `correcao-visual-v6`), slug `guest`: `status: "em-breve"`, resumo "Avaliação depois de pagar e cliente lembrado; relacionamento em desenvolvimento", telas `pago`, `gorjeta`, `avaliacao`, narrativa "A experiência termina bem. E o cliente lembra."
- Verdadeiro hoje: avaliação depois do pagamento e nome lembrado **no mesmo aparelho**. O texto atual não promete reservas. A Fase 8 acrescenta a nova narrativa separando "disponível hoje / planejado / demonstração".

## 12. Tabela consolidada

| Capacidade | Status |
|---|---|
| Restaurante, mesas, sessão de mesa, QR | funciona em main |
| Pagamento confirmado por webhook, idempotência, estorno, conciliação | funciona em main |
| Avaliação interna do atendimento (`waiter_ratings`) | funciona em main |
| Redirecionamento para avaliação no Google | funciona em main |
| Nome lembrado no aparelho (`localStorage`) | funciona em main |
| Leads de restaurante (`restaurant_leads`) | funciona em main |
| Papel `founder` (equipe Tipe, 2FA) | funciona em main |
| Pedido na mesa, KDS, garçom, totem, push | em PR (#6–#9, #19, #32) |
| CRM com camadas A/B/C | em PR (#29), demonstração |
| `/demo` com 5 papéis | em PR (#20) |
| Página `/produtos/guest` "Em breve" | em PR (#28/#30) |
| Estado de lançamento configurável por produto | em PR (#33) |
| Avaliação ligada ao pagamento, consentimento, moderação, leitura pública | **falta** (Fase 2) |
| Programa Restaurante Fundador | **falta** (Fase 3) |
| Perfil público do restaurante (bairro, culinária, fotos, horários estruturados) | **falta** (Fase 4) |
| Capacidade e área das mesas, regras de disponibilidade, holds, reservas, lista de espera, alertas, experiências | **falta** (Fase 4) |
| Conta de consumidor, favoritos, preferências, push do consumidor | **falta** (Fases 4 e 7) |
| Reservas no painel e check-in → mesa | **falta** (Fase 5) |
| Demonstração do Guest | **falta** (Fase 6) |
| App Expo | **falta** (Fase 7) |

## 13. Skills disponíveis nesta sessão (listadas antes de escolher)

Sessão na nuvem: `superpowers:*` (brainstorming, writing-plans, test-driven-development, verification-before-completion, systematic-debugging), `vectorlab-ux-skills:*` (page-patterns, forms, empty-states, viewports, keyboard, motion…), `anthropic-skills:design-taste-frontend`, `security-review`, `code-review`, `dataviz`. No Mac do Roberto: servidor MCP **REA** anunciado (`rea`). As 15 skills de `.claude/skills` do PR #24 não estão em `main`, então não carregam nesta sessão.

Usadas na Fase 1: REA (modo passivo) para o benchmark; as demais ficam para as fases de implementação.
