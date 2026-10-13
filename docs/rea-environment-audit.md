# Auditoria do ambiente, da stack e do REA

Data: 13/10/2026 · Escopo: repositório `robertoalencar-afk/tipe-1.0` (commit base `5f1c36f`) e ambiente de execução desta fase.

## 1. Stack atual (verificada no código)

| Camada | O que existe | Onde |
|---|---|---|
| Interface | React 19, TypeScript estrito, Tailwind v4, Radix UI | `src/components`, `src/routes` |
| Framework | TanStack Start (SSR + server functions), Router, Query | `src/start.ts`, `src/router.tsx` |
| Build/Hospedagem | Vite 8 + Nitro (edge), integrado ao Lovable | `vite.config.ts`, `AGENTS.md` |
| Banco | PostgreSQL (Supabase) com RLS em todas as tabelas públicas | `supabase/migrations`, `drizzle/migrations` |
| Autenticação | Supabase Auth (e-mail/senha), papéis em `user_roles`, 2FA para founders | `src/integrations/supabase`, `founder-guard.ts` |
| Pagamentos | Pagar.me v5: conta própria de cada restaurante (chave AES-GCM), conta TIPE para gorjetas e assinaturas | `pagarme.server.ts`, `payments.functions.ts` |
| Webhooks | Pagar.me (TIPE e por restaurante), PDV por adaptador, POS legado | `src/routes/api/public/**` |
| Rotinas | `/api/public/pdv/sync` com `LOVABLE_CRON_SECRET` | `cron-auth.ts` |
| PDV | Camada de adaptadores com modelo canônico e eventos idempotentes (`pdv_ingest_event`) | `src/lib/tipe/pdv` |
| IA | Lebre (assistente) com propostas tipadas e confirmação | `lebre.functions.ts` |
| Testes | 2 arquivos vitest (máscaras e taxa de serviço) antes desta fase | `src/lib/tipe/*.test.ts` |

## 2. Inventário de funcionalidades (antes desta fase)

| Funcionalidade | Situação | Observação |
|---|---|---|
| QR por mesa, sem app e sem cadastro | Concluída | QR abre a mesa; pagamento exige `session_token` rotativo |
| Conta em tempo real | Concluída | Consulta a cada 5 s no cliente; Realtime no painel |
| Divisão por item com frações (½, ⅓, ¼) | Concluída | Bloqueio de linha no banco; sugestão por IA |
| Divisão igualitária / valor livre / percentual | **Ausente** | Implementada nesta fase |
| Pix (Pagar.me) | Concluída | Real quando o restaurante conecta a conta Pagar.me |
| Cartão tokenizado | Parcial | Fluxo existe; regra do produto desencoraja cartão na conta |
| Apple Pay / Google Pay | **Simulado** | Com Pagar.me conectado o servidor recusa ("em breve"); sem Pagar.me é aprovado em simulação |
| Pagamento no estabelecimento (dinheiro/maquininha) | Concluída | Confirmação manual do caixa, cálculo de troco |
| Gorjeta extra (70% equipe / 30% TIPE) | Concluída | Recebida na conta TIPE; ciclos quinzenais e saque Pix |
| Taxa de serviço definida pelo restaurante | Concluída | Remoção por conta (`service_fee_waivers`) |
| Avaliação do garçom | Concluída | Sem convite para avaliação pública (Google) |
| Comprovante/recibo por e-mail | Ausente | Roadmap |
| Painel do salão, caixa, histórico, relatórios | Concluída | |
| Lançamento TIPE (PDV próprio) e cozinha/bar | Concluída | |
| Integração com PDV de terceiros | Parcial | Contrato pronto; só adaptadores próprios (`lancamento_tipe`, `api_tipe`) |
| Baixa automática no PDV externo | Ausente | `informarPagamento` nunca era chamado |
| Estorno e contestação | **Ausente** | Estorno no provedor não chegava à TIPE — corrigido nesta fase |
| Reconciliação de pagamentos presos | **Ausente** | Webhook perdido deixava itens reservados — corrigido |
| Limite de mesas por plano, assinatura | Concluída | |

## 3. Riscos encontrados na auditoria

| # | Risco | Gravidade | Tratamento |
|---|---|---|---|
| R1 | **Modo simulação aprova pagamento digital na hora** quando o restaurante não conectou a Pagar.me (`payments.functions.ts`). Em produção, a conta fica "paga" sem dinheiro. O comentário do código diz o contrário ("fica pending"). | Alta | **Corrigido** (D1): simulação só com `TIPE_ALLOW_SIMULATED_PAYMENTS=true` |
| R2 | Mesa reaberta arquivava pagamentos **sem o id do pedido no provedor**; estorno posterior não encontrava o pagamento | Alta | Corrigido (migração 0019) |
| R3 | Estornos e contestações ignorados; evento `charge.chargedback` foi descontinuado pela Pagar.me em favor de `chargeback.received` (prazo 30/09/2026) | Alta | Corrigido: webhooks aceitam `order.*`, `charge.*`, `chargeback.*` |
| R4 | Divisão em frações perdia centavo (3 × ⅓ de R$ 10,00 = R$ 9,99) | Média | Corrigido: arredondamento cumulativo por item |
| R5 | `splitGorjeta` (sem uso) perdia centavos na divisão 70/30 | Baixa | Corrigido |
| R6 | Histórico de migrações **não recria o banco**: tabelas como `restaurant_leads` e `pdv_events` foram criadas fora dele | Média | Documentado; harness de teste completa a partir de `types.ts` |
| R7 | `has_restaurant_role` dá acesso de restaurante ao founder, em tensão com a regra "founder só vê agregados" do `AGENTS.md` | Média | **Corrigido** (D4, migração 0020) |
| R8 | Proporção da gorjeta: o briefing citava 75/25; o código usa 70/30 | Decisão | **70/30 confirmado** pelo dono do produto |
| R9 | `.env` versionado | Baixa | Contém apenas chaves publicáveis do Supabase (públicas por desenho). Nenhum segredo exposto |

## 4. O skill REA

**Onde está:** servidor MCP local `rea` no Mac do usuário (`macbook-pro-de-roberto-local`, macOS x64), estado `announced`, exposto a esta sessão pela ponte do app desktop (`mcp__remote-devices__rea__*`). Não é um skill em pasta; é um conjunto de ~190 ferramentas.

**Capacidades (pelas descrições das ferramentas):** observação passiva de páginas via Chrome DevTools Protocol (DOM, acessibilidade, scripts, rede, captura de tela), análise estática de bundles JavaScript, cenários de navegador controlados, comparação de capturas, além de engenharia reversa de binários nativos, Android (ADB/JEB), Apple, firmware e decompilação.

**Limites adotados nesta missão** (do briefing e de ética): só observação de páginas públicas acessíveis legitimamente e do próprio app TIPE. **Não** foram usadas, e não devem ser usadas contra concorrentes: decompilação, `recover_javascript_sources`, `batch_decompile`, extração de bundles ou fontes de terceiros, contorno de autenticação.

**Limitações técnicas reais encontradas:**

1. As ferramentas web do REA exigem um Chrome aberto com depuração remota em loopback (porta 9222). Sem isso, `list_browser_targets` devolve `endpoint_unreachable` (registrado às 15h08).
2. A ponte desta sessão entrega como texto os parâmetros que o REA espera como objeto. Resultado: `capture_browser_scenario` (que abriria páginas e executaria ações) **não pode ser chamado** daqui — erro de validação "expected object, received string". Só ferramentas com parâmetros simples funcionam (`list_browser_targets`, `inspect_web_page`, `capture_web_screenshot`, `analyze_web_bundle`).
3. Consequência: o REA não navega sozinho; as páginas precisam estar abertas no Chrome de depuração.

O que foi efetivamente executado está em `docs/rea-functional-analysis.md`, com os ids de evidência.

## 5. Ambiente de execução desta fase

- O registro npm e o espelho do Lovable estão bloqueados pela política de rede da sessão (`403` no proxy; DNS indisponível para acesso direto). **Não foi possível instalar as dependências**, logo não foi possível rodar `vite build`, `eslint` do projeto nem o `tsc` completo.
- Substitutos usados, todos registrados em `docs/test-report.md`:
  - testes vitest executados com o executor nativo do Node 22 (`node --test`) e um adaptador mínimo da API do vitest;
  - `tsc` 6 (global) em modo estrito sobre os módulos puros, e checagem parcial dos arquivos com React/TanStack usando declarações vazias;
  - **PostgreSQL 16 local** com todas as migrações do repositório, para testar as funções reais do banco, incluindo concorrência entre duas conexões.
