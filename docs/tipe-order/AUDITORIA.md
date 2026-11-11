# Tipe Order 1.0 — Auditoria e decisão de base (Fase 1)

Data: 27/10/2026. Base inspecionada: `main` em `586f05e`, mais as branches de todos os PRs abertos (#1, #4, #6–#29).
Tudo o que está marcado como "verificado" foi conferido no código ou executado neste ambiente; nada aqui foi aplicado em produção.

## 1. Resumo para decisão

1. **Boa parte do Order já existe, mas em PRs não mesclados.** O pedido do cliente pela mesa (PR #8), o KDS por pedido com Realtime (PR #6), o pedido do garçom pelo celular (PR #7) e o totem (PR #9) estão prontos, testados no banco e passam no build. Nada disso está em `main`.
2. **O fluxo de conta decidido (dividir → pagar → gorjeta extra depois) também não está em `main`.** Ele vive na cadeia `redesign-landing-v3` → #12 → #21 → #25, que reescreveu a tela da mesa, o painel do restaurante e o app do garçom.
3. **Essas duas linhagens colidem em 6 arquivos (14 trechos).** Os conflitos são previsíveis: formatação nova da v3 contra as entradas novas da colibri (aba Cozinha, aba Cardápio, garçom lançando pedido).
4. **Risco de segurança que bloqueia o Order em produção:** o QR impresso traz um `access_token` fixo, e com ele qualquer pessoa obtém o `session_token` da conta. Uma foto do QR permite pedir de casa. Para pagar isso não importa (ninguém paga a conta dos outros por engano), mas para pedir importa. A Fase 2 precisa resolver isso antes de ligar o Order para qualquer restaurante.
5. **Recomendação de base:** criar a branch `order/base` a partir de `sunday/gorjeta-depois`, mesclar a cadeia Sunday restante (#19/#22, #15/#18, #16) e depois a colibri A–D (#6–#9) e #13/#17, resolvendo os conflitos uma única vez. Todo o Order (Fases 2, 3, 4, 6, 7, 8) empilha sobre ela. A landing (Fase 5) fica em branch separada sobre `redesign-landing-v6`.

## 2. O que foi executado para chegar aqui

| Verificação | Resultado |
|---|---|
| Merge de teste `main` + colibri A, B, C, D, em sequência | sem conflito |
| `bun run build` nesse merge | ok (nitro, preset Cloudflare) |
| `tsc --noEmit` nesse merge | ok, 0 erros |
| `vitest run` nesse merge | 9 arquivos, 92 testes, todos passando |
| `tests/db/run.sh` (Postgres 16 local, descartável) nesse merge | "TODOS OS CENÁRIOS DO BANCO PASSARAM", incluindo pedido do cliente pela mesa, idempotência, recusa de chamada direta por anônimo e logado, totem, KDS |
| Merge de teste da cadeia Sunday entre si (#25 + #22 + #18 + #16 + landing v6) | sem conflito |
| Merge de teste da colibri D sobre a cadeia Sunday | conflito em 6 arquivos, 14 trechos (seção 6) |
| Merge de teste do CRM (#29) sobre `main` + colibri | sem conflito |
| Merge de teste do CRM (#29) sobre a cadeia Sunday | conflito em 5 arquivos (logos em `src/assets/marca/`, `backoffice.tsx`, `styles.css`) |
| Merge de teste do `/demo` (#20) sobre a cadeia Sunday | sem conflito |

## 3. Mapa do sistema atual

### 3.1 Rotas (em `main`)

- Cliente: `/$restaurante/$mesa` (QR, com `?t=<access_token>` opcional), `/mesa/$restaurante/$mesa` (redireciona 301 para a anterior), `/$restaurante` (área do restaurante), `/simulador` (demo local, nunca toca dados reais).
- Logado (`/_authenticated`): `/painel` (painel do restaurante, `RestaurantPanel` + `AdminSections`), `/garcom`, `/backoffice` (fundador), `/admin/leads`.
- API pública: `/api/public/pagarme/webhook`, `/api/public/pagarme/restaurante/$slug`, `/api/public/payments/reconcile`, `/api/public/pdv/$adapter/webhook`, `/api/public/pdv/sync`, `/api/public/pos/$slug`, `/api/public/csp-report`.
- Em PRs: `/$restaurante/cozinha` e `/$restaurante/senhas` (#6), `/$restaurante/totem` (#9), `/produtos/$produto`, `/precos`, `/integracoes`, `/teste-gratis` (landing v5/v6), `/demo` (#20), `/crm/*` (#29).

### 3.2 Autenticação e permissões

- Supabase Auth. Papéis em `public.user_roles` e `staff_members`, enum `app_role` = `founder`, `owner`, `cashier`, `waiter`.
- Funções de autorização: `has_restaurant_role`, `is_restaurant_member`, `is_member_of_slug`, sem bypass de fundador (migração 0020). Fundador age por `supabaseAdmin` depois de `requireFounder2fa` (TOTP obrigatório).
- Cliente da mesa não tem login: é autorizado pelo `access_token` do QR ou pelo `session_token` da conta aberta (`getPublicTable` em `src/lib/tipe/pdv.functions.ts`, `verifyTableSession` em `src/lib/tipe/security.server.ts`).
- Rate limit: `enforceRate` (tabela `rate_limit_buckets`, RPC `rate_limit_hit`), por restaurante, mesa e IP. Eventos em `security_events`, com alerta por e-mail limitado (`security_alert_state`).

### 3.3 Banco: tabelas que importam para o Order

| Tabela | Papel hoje |
|---|---|
| `restaurants` | `slug`, `bill_payment_methods`, `service_rate`, `onboarding_step`; #8 adiciona `self_order_enabled` (padrão desligado) |
| `restaurant_tables` | `number`, `code`, `access_token` (QR fixo), `session_token` (gira ao fechar a mesa), `waiter_id`, `active` |
| `pdv_menu_categories`, `pdv_menu_items` | cardápio do "Lançamento TIPE": `code`, `name`, `price numeric(10,2)`, `available`, `position`, `sector` (`kitchen`/`bar`), `description` |
| `pdv_orders`, `pdv_order_items` | pedido e itens; #6 adiciona `channel` (`mesa`, `balcao`, `totem`, `tablet`, `delivery`), senha do dia, `request_id` único por restaurante, cancelamento; itens têm `status` (`received`, `preparing`, `ready`, `delivered`, `cancelled`), `notes`, `sector` |
| `table_bill_items` | a conta da mesa (o que o cliente paga), com porções decimais reservadas/pagas e trava por linha |
| `table_payment_requests` | pagamentos da conta e gorjetas (`payment_target`), com `waiter_id`, idempotência e estados do provedor |
| `archived_payments`, `payment_audit_log`, `payment_incidents` | histórico, auditoria e casos para humano |
| `pdv_connections`, `pdv_events`, `pos_integrations`, `pdv_payment_outbox` | adaptadores de PDV e fila de baixa |
| `service_fee_waivers`, `plan_catalog`, `restaurant_subscriptions`, `table_limit_blocks` | taxa de serviço, planos e limite de mesas |
| `restaurant_leads` | leads do site (só servidor grava; só fundador lê em `/admin/leads`) |

Dinheiro: o banco guarda `numeric(10,2)` em reais (exato, não é float); o TypeScript calcula em centavos inteiros (`itemChargeCents` em `src/lib/tipe/bill-math.ts`). O Order deve seguir o mesmo contrato: colunas `numeric(10,2)` para casar com as tabelas existentes e todo cálculo em centavos inteiros no servidor. Trocar o tipo das colunas existentes não traz benefício e mexeria em pagamentos.

Migrações: `supabase/migrations` (12 arquivos com carimbo da Lovable) e `drizzle/migrations` (0000–0022 em `main`). Em PRs: 0023 (#6), 0024 (#8), 0025 (#9), 0026 (#19, push). Sem colisão entre elas hoje; a próxima livre é **0027**. Continua em aberto como a Lovable Cloud aplica as migrações do `drizzle/` (já registrado em `docs/TIPE-EXECUTION-STATUS.md`).

### 3.4 Server functions principais

- Conta e pagamento: `getPublicTable`, `createPayment`, `getSharedTableState`, `reopenClosedTable`, `getPaymentStatus`, `submitRating`, `sendPaymentReceipt` (`payments.functions.ts`, `pdv.functions.ts`). Liquidação só por `applyProviderOrder` → `decideSettlement` sobre pedido rebuscado no Pagar.me; webhook validado; `register_table_payment` com chave de idempotência.
- Operação: `launchOrder`, `voidItem`, `closeTable`, `saveMenuItem`, `saveCategory`, `importMenuCsv`, `getTopItems` (`pdv.functions.ts`, `pdv-integrations.functions.ts`).
- Em PRs: `counterSale`, `bumpOrder`, `callTicket`, `getTicketBoard` (#6, `orders.functions.ts`); `waiter-order.functions.ts` (#7); `getPublicMenu`, `placeCustomerOrder` (#8, `customer-order.functions.ts`); `totem.functions.ts` (#9).

### 3.5 Realtime

- Publicação `supabase_realtime`: `table_bill_items`, `table_payment_requests` (main); `pdv_order_items`, `pdv_orders` (#6).
- Quem escuta: painel do restaurante (`RestaurantPanel`, 2 canais) e KDS (`Kds.tsx`, canal `kds-<restaurante>` em `pdv_order_items`).
- A tela do cliente **não usa Realtime**: atualiza a mesa a cada 5 s por polling (`$restaurante.$mesa.tsx`). O app do garçom também atualiza por consulta. Para o acompanhamento do pedido pelo cliente (Fase 4), o caminho seguro é continuar por server function com polling curto ou um canal por sessão de mesa, porque o cliente é anônimo e as tabelas têm RLS só para membros.

### 3.6 Fluxo atual do QR da mesa

1. O QR impresso aponta para `/$restaurante/$mesa?t=<access_token>`. O `access_token` só muda se o dono clicar em "regenerar".
2. `getPublicTable` aceita o `access_token` ou o `session_token` e devolve a conta, os métodos de pagamento e o `session_token` atual.
3. O navegador guarda identidade e sessão por restaurante e mesa; reabrir o QR retoma a conta.
4. Pagamento: escolher itens ou dividir → método → Pagar.me (ou baixa manual "pagar no estabelecimento"); a mesa só é quitada pelo provedor.
5. Ao fechar a mesa, o `session_token` gira e os pagamentos vão para `archived_payments`.

Consequência para o Order: o `access_token` é fixo e dá acesso ao `session_token`, então **quem tem a foto do QR consegue pedir de qualquer lugar** enquanto a mesa existir. O PR #8 autoriza o pedido pelo mesmo `session_token`, então herda o problema.

## 4. O que existe, o que está em PR e o que falta

Legenda: **main** = existe e funciona em `main`; **PR** = existe em PR não mesclado (número); **falta** = procurei e não existe.

### 4.1 Cliente na mesa

| Item | Estado | Onde |
|---|---|---|
| Mesmo QR para conta e pagamento | main | `$restaurante.$mesa.tsx` |
| Conta curta, Pix em destaque, carteiras visíveis | PR #12 | `sunday/cliente-conta-curta` |
| Gorjeta extra depois de pagar, como segundo pagamento, com nome do garçom | PR #25 (sobre #21) | `sunday/gorjeta-depois` |
| Cardápio do cliente (categorias, busca, observação, quantidade) | PR #8 | `MesaPedido.tsx`, aba "Cardápio" na tela da mesa |
| Pedido do cliente cai na conta da mesa e no KDS | PR #8 | RPC `pdv_customer_order` |
| Idempotência contra duplo clique | PR #8 | `request_id` único por restaurante |
| Preço recalculado no servidor | PR #8 | a RPC lê `pdv_menu_items`, ignora preço do cliente |
| Liga/desliga por restaurante | PR #8 | `restaurants.self_order_enabled` (booleano, sem estados) |
| Fotos, destaques, horários de venda, alergênicos, porção | falta | não há colunas nem UI |
| Modificadores (grupos com mín/máx) e combos | falta | só observação livre de 140 caracteres |
| Carrinho persistente por sessão e participante | falta | carrinho em memória do componente |
| Acompanhar status do pedido pelo cliente | falta | itens têm status, mas o cliente não vê |
| Pedir novamente | falta | |
| Pagar antes (pedido só vai à cozinha após confirmação) | falta para mesa | existe no totem (#9): item aguarda pagamento fora da cozinha |
| Chamar garçom (água, talheres, ajuda) | falta | só existe encenado no `/demo` (#20) |
| Proteção contra pedido de fora do restaurante | falta | ver seção 3.6 |

### 4.2 Operação

| Item | Estado | Onde |
|---|---|---|
| Lançamento de pedido pelo painel | main | `launchOrder` / `pdv_launch_order` |
| Garçom lança pedido pelo celular | PR #7 | `GarcomAtender.tsx`, `waiter-order.functions.ts` |
| KDS por pedido e por item, setores cozinha e bar, Realtime | PR #6 | `Kds.tsx`, `/$restaurante/cozinha`, `pdv_order_bump` |
| Balcão com senha e painel de senhas para TV | PR #6 | `Balcao.tsx`, `/$restaurante/senhas` |
| Totem de autoatendimento | PR #9 | `/$restaurante/totem` |
| Setor sobremesa (ou setores configuráveis) | falta | `sector` aceita só `kitchen` e `bar` |
| Avisos para garçom (mesa paga, parcial, pagamento no local, nota baixa) | PR #13, #17 | |
| Push no celular com app fechado e escolha de avisos | PR #19, #22 | migração 0026 `staff_push_subscriptions` |
| Impressão de pedido/comanda | falta | só `window.print()` para imprimir QR Codes |
| Importação de cardápio CSV | main | `importMenuCsv` (sem prévia nem detecção de duplicados na UI) |

### 4.3 Conta, pagamento e PDV

| Item | Estado | Onde |
|---|---|---|
| Divisão (itens, partes iguais, valor, percentual) em porções | main | `bill-math.ts` |
| Pix via Pagar.me na conta do restaurante | main | `pagarme.server.ts`, `restaurant_pagarme_accounts` |
| Pagar no estabelecimento com baixa manual e troco | main | |
| Apple Pay e Google Pay | **rejeitados no servidor** | `payments.functions.ts:183`; a UI mostra, o servidor recusa e o fallback é Pix. Pendência: habilitar no Pagar.me |
| Cartão digitado na conta | não existe, por decisão | |
| Estornos, chargebacks, reconciliação, incidentes | main | `provider_reverse_payment`, `/api/public/payments/reconcile` |
| Gorjeta 70% garçom / 30% restaurante | main | `waiter_id` da mesa |
| Adaptadores de PDV | main | `lancamento_tipe`, `api_tipe`; nenhum PDV externo testado |
| Fila de baixa no PDV | main | `pdv_payment_outbox` |

### 4.4 Gestão, CRM, landing

| Item | Estado | Onde |
|---|---|---|
| Módulos contratados por restaurante (entitlements) | falta no banco | o CRM (#29) tem `ModuleKey` com `pedido_na_mesa`, `kds`, `totem`, só em modo demonstração (localStorage) |
| Card de módulos em `/crm/contas/$id` | PR #29 | lê do seed; adaptador em `src/lib/tipe/crm/adapters.ts` deriva módulos de `bill_payment_methods` |
| Planos | main | `plans.ts` / `plan_catalog`; "Cozinha e bar (KDS)" listado no Premium, sem checagem de módulo |
| Leads do site | main | `submitLead` → `restaurant_leads` → `/admin/leads`; o CRM (#29) lê pela camada Comercial |
| Página `/produtos/order` | PR #28 (landing v6) | `site/produtos.ts`, `slug: "order"`, `status: "em-breve"`, renderizada por `ProdutoPagina` com `duvidasDe()` e `TrilhoProdutos` |
| "Em breve" no menu Produtos | main e v6 | `LandingChrome.tsx` (3 lugares) lê `status` do catálogo |
| FAQ "Quando fica disponível?" | v6 | texto fixo "Está em fase final de implantação" |
| Estado de lançamento configurável | falta | `Status` só tem `disponivel` e `em-breve` |
| Telas reais do app | v6 | `src/assets/telas-reais/`, `TelaReal`; ainda não há tela real do cardápio |
| Visualizador 3D, AR, Tipe 3D Studio | falta | nada no repositório |
| Painel de métricas do Order | falta | `getTopItems` existe e serve de base |

## 5. Dependências da Lovable que o Order não deve aumentar

Encontradas em `main`: `LOVABLE_API_KEY` em `lebre.functions.ts`, `split-ai.functions.ts` e `email-templates/send-email.ts`; rota `lovable/email/transactional/preview.ts`; `src/start.ts`; assets `*.asset.json` servidos por `/__l5e` (logo, mascote). O componente `TipeLogo` ainda aponta para `/__l5e` e quebra fora da Lovable; o CRM (#29) já usa o logo vetorial em `src/assets/marca/`.

Regra para o Order: nenhum código novo usa `LOVABLE_API_KEY`, gateway de IA da Lovable ou assets `/__l5e`. Logo pelo SVG de `src/assets/marca/`. Sugestões da Fase 8 por regras, sem IA. Arquivos 3D no Supabase Storage.

## 6. Decisão de base

### 6.1 Produto: `order/base`

Ordem proposta de montagem (merge, nunca rebase; nada em `main`):

1. Partir de `sunday/gorjeta-depois` (#25), que já contém `redesign-landing-v3` (#10), #12 e #21.
2. Mesclar `sunday/avisos-escolha` (#22, contém #19 e a migração 0026), `sunday/restaurante-pagamentos` (#18, contém #15) e `sunday/conta-leve` (#16). Testado: entram sem conflito.
3. Mesclar `integracao/colibri-d-totem` (#9, contém #6, #7 e #8). Conflitos esperados, todos verificados:

   | Arquivo | Trechos | Natureza |
   |---|---|---|
   | `drizzle/migrations/meta/_journal.json` | 1 | 0023–0025 e 0026 na mesma lista; manter as quatro em ordem |
   | `src/components/tipe/AdminSections.tsx` | 1 | `Cozinha` foi movida para `Kds.tsx` na colibri |
   | `src/components/tipe/RestaurantPanel.tsx` | 6 | imports e lista de seções reformatados na v3 contra as novas seções da colibri (Cozinha, Balcão, Totem, pedido pela mesa) |
   | `src/lib/tipe/admin.functions.ts` | 1 | campos novos de configuração (pedido pela mesa, totem) |
   | `src/routes/$restaurante.$mesa.tsx` | 2 | tela nova da v3/Sunday contra a aba "Cardápio" do #8 |
   | `src/routes/_authenticated/garcom.tsx` | 2 | garçom novo da v3 contra a aba "Atender" do #7 |

4. Mesclar `sunday/garcom-nota-baixa` (#17, contém #13), que depende da colibri B.
5. Rodar build, tipos, vitest, `tests/db/run.sh` e Playwright da tela da mesa e do painel antes de abrir o PR.

Por que essa base e não as alternativas:

- **`main` + colibri (sem Sunday):** é o caminho sem conflito, mas o Order nasceria na tela antiga da mesa e com a gorjeta no lugar errado. Depois seria preciso resolver os mesmos 14 conflitos, só que com mais código do Order no meio.
- **Empilhar só sobre #8:** mesma situação, e ainda deixaria #9 (totem, que já resolve "pagar antes") de fora.
- **Esperar os merges em `main`:** depende de decisões suas que ainda não foram tomadas e trava o Order.

Custo da escolha: o PR do Order vai mostrar no diff tudo o que ainda não está em `main` (cerca de 245 arquivos só da cadeia Sunday + landing v3). Para a revisão ficar legível, cada fase do Order abre PR em rascunho **contra `order/base`**, não contra `main`, e o PR de `order/base` contra `main` serve só como "pacote de integração".

O CRM (#29) não entra em `order/base` agora: ele conflita com a landing v3 nos logos de `src/assets/marca/`, em `backoffice.tsx` e em `styles.css`. Na Fase 2, o trabalho de entitlements no CRM é feito em branch empilhada sobre `crm/backoffice-saas`, com o adaptador lendo a mesma tabela de módulos. Quando os dois forem integrados, o conflito é pequeno e conhecido.

### 6.2 Landing: `order/landing` sobre `redesign-landing-v6`

A página já existe como `/produtos/order` (`site/produtos.ts`, `slug: "order"`). A Fase 5 só altera esse registro, o tipo `Status` (para os 4 estados de lançamento) e as seções da `ProdutoPagina`, sem criar rota nova. O formulário grava por `submitLead` (o mesmo de `/admin/leads`). As telas reais do cardápio dependem da Fase 3; até lá a página usa demonstração conceitual rotulada.

## 7. Modelo de dados mínimo proposto (só o que falta)

Convenção do projeto: tabelas em inglês, `snake_case`, `restaurant_id uuid` com RLS por `is_restaurant_member`/`has_restaurant_role`, escrita sensível só por `SECURITY DEFINER` com `service_role`, migrações numeradas a partir de **0027**. Dinheiro em `numeric(10,2)` no banco, centavos inteiros no código.

**Fase 2 — entitlements e sessão segura**

- `restaurant_modules` (`restaurant_id`, `module` text check em `pay`, `order`, `kds`, `totem`, `three_d`, `status` check em `active`, `suspended`, `cancelled`, `changed_by`, `changed_at`, `reason`; PK `restaurant_id, module`). Leitura por membros; escrita só por RPC `set_restaurant_module` (fundador com 2FA, via `supabaseAdmin`, com log em `security_events`). `self_order_enabled` (#8) passa a ser a preferência do restaurante, e o pedido só é aceito com `module = 'order'` ativo **e** a preferência ligada. Função `restaurant_has_module(rid, module)` usada dentro das RPCs de pedido.
- `table_order_sessions` (`id`, `restaurant_id`, `table_number`, `session_token` da conta, `opened_by` (staff) ou `opened_via` = `staff`/`table_code`, `short_code` (4–6 dígitos, opcional), `expires_at`, `closed_at`). O cliente só pede com uma sessão aberta pela operação ou validada por código curto exibido na mesa, conforme `restaurants.order_session_mode` (`staff_opens` | `table_code`). Pagar continua como hoje.
- Rate limit novo por sessão de pedido (`enforceRate` já serve; só chave nova).

**Fase 3 — cardápio rico, carrinho e pedido**

- Colunas novas em `pdv_menu_items`: `image_path`, `highlight`, `portion`, `ingredients`, `allergens text[]` (só o informado; vazio = "não informado", nunca "sem alergênicos"), `pos_code`.
- `menu_availability_windows` (`item_id` ou `category_id`, dia da semana, início, fim).
- `menu_modifier_groups` (`restaurant_id`, `name`, `min`, `max`, `required`) e `menu_modifier_options` (`group_id`, `name`, `price_delta numeric(10,2)`, `available`); ligação `menu_item_modifier_groups` (`item_id`, `group_id`, `position`).
- `menu_combos` simples pode ficar como item com grupos obrigatórios (sem tabela nova) até haver necessidade real.
- `pdv_order_items.modifiers jsonb` (snapshot do que foi escolhido, com preços do servidor) e `participant` (nome/apelido opcional).
- `table_carts` (`session_id`, `participant`, `items jsonb`, `updated_at`) para o carrinho sobreviver a recarregar a página.
- `pdv_orders.payment_mode` (`pay_later` | `pay_first`) e `status` derivado já existe pelos itens; `pdv_order_events` (`order_id`, `status`, `at`, `actor`) para a trilha.

**Fase 4** — `waiter_calls` (`restaurant_id`, `table_number`, `session_id`, `reason`, `status`, `created_at`, `handled_by`, `handled_at`) com limite por sessão; `sector` passa a aceitar setores configuráveis (`kitchen_stations` ou ampliar o check para `dessert`).

**Fase 6/7** — `menu_item_models` (versões: `draft`, `published`, `archived`; `storage_path`, `size_bytes`, `triangles`, `scale_mode` `approximate`/`calibrated`, `real_size_mm`), `model_capture_jobs` (fila do Studio), `menu_item_events` (aberturas do 3D/AR).

### Desenho de entitlements

- **Fonte da verdade:** `restaurant_modules` no banco. O plano (`plan_catalog`) sugere módulos, mas o que vale é a linha do restaurante, porque o Order é módulo adicional.
- **Onde é checado:** dentro de toda RPC de pedido (`pdv_customer_order` e as novas) e em toda server function antes de chamá-la. A UI só lê `getPublicTable` → `modules`, e com `order` inativo a tela da mesa fica idêntica à atual.
- **Suspender** bloqueia novos pedidos (RPC recusa), não mexe em `table_bill_items`, pagamentos nem pedidos já confirmados.
- **CRM:** o adaptador de `/crm/contas/$id` passa a ler e gravar `restaurant_modules` quando houver Supabase configurado; em modo demonstração continua no localStorage, rotulado.

## 8. Riscos

| Risco | Impacto | Tratamento |
|---|---|---|
| QR fixo dá acesso à sessão da conta (pedido de casa) | alto, bloqueia Order real | Fase 2: sessão aberta pela operação ou código curto; teste de servidor provando a recusa |
| 14 trechos em conflito entre colibri e Sunday | médio | resolver uma vez em `order/base`, com build, testes de banco e Playwright |
| Migrações 0023–0026 em PRs e próxima livre 0027 | médio | não criar migração com número já usado; se algum PR for mesclado em outra ordem, renumerar antes |
| Como a Lovable Cloud aplica `drizzle/migrations` | alto para produção | continua em aberto; nenhuma migração do Order será aplicada sem seu ok |
| Apple Pay e Google Pay recusados no servidor, com a mensagem "serão liberados em breve. Use Pix por enquanto" | médio | manter na interface, fallback para Pix, habilitar no Pagar.me (decisão sua); a mensagem contradiz a regra de não dizer "em breve" e deve ser trocada quando a tela de pagamento for tocada |
| Dependências da Lovable (`LOVABLE_API_KEY`, `/__l5e`) | médio | Order não usa nenhuma; logo vetorial |
| Cliente não tem Realtime | baixo | acompanhamento por server function com polling curto ou canal por sessão |
| CRM conflita com landing v3 (logos, `backoffice.tsx`, `styles.css`) | baixo | integrar por último, conflito pequeno e conhecido |
| 3D/AR e reconstrução precisam de aparelho real e GPU | alto para Fases 6–7 | começar por GLB importado; GPU só com custo aprovado |

## 9. Fora do escopo do 1.0

Cardápio multilíngue, comparação de pratos em 3D, importação por PDF/imagem, avaliações por prato, promoções condicionais complexas.
