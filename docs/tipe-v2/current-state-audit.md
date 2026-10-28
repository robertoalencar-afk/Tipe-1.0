# Auditoria do estado atual (Fase 0)

Data: 20/10/2026. Base: `main` em `bff7d2e` (sincronizado com o Lovable). Esta auditoria reaproveita `sunday-analise/02` (14/10), `docs/TIPE-EXECUTION-STATUS.md` e `docs/sunday-ecossistema/STATUS.md` (PR #14) e corrige o que mudou desde então.

## 1. Ferramentas do ambiente (verificadas nesta sessão)

| Ferramenta pedida | Situação | Como foi verificado | Alternativa usada |
|---|---|---|---|
| Frontend Design (skill) | **Não instalada** neste ambiente | Lista de skills da sessão | Design system da Tipe (`ds.tsx`, `styles.css`, `docs/design-system.md`) e revisão visual por capturas do Playwright |
| REA | **Funciona** (Chrome 155 do Roberto, `127.0.0.1:9222`) | `list_browser_targets` listou home e hybrid-ordering; `capture_web_screenshot` capturou hybrid-ordering | Só abas já abertas e só a área visível; texto da página não é liberado pela política da REA (`inspect_web_page` devolve estrutura sem texto) |
| Playwright local | **Funciona** (1.56.1, Chromium em `/opt/pw-browsers`) | Jornada `tests/e2e/demo-journey.mjs` rodou com 9 etapas verdes | — |
| Playwright MCP | **Não conectado** | Não aparece entre os servidores MCP | Playwright local |
| Superpowers | **Instalado** (skills de TDD, depuração, revisão, planos) | Lista de skills | Motor da demonstração escrito com testes primeiro |
| Context7 | **Falhou ao conectar** (erro de túnel do proxy, `ERR_PROXY_TUNNEL`) | Aviso da sessão | Documentação das bibliotecas já usadas no repositório; nenhuma API nova foi integrada nesta entrega |
| Code Review | **Instalado** (`code-review`, `superpowers:requesting-code-review`) | Lista de skills | Usado antes do PR |
| Skill Creator | **Instalado** | Lista de skills | As 4 skills do projeto foram criadas em `.claude/skills/` |
| Acesso de rede a sundayapp.com | **Bloqueado** na nuvem e na VM do Mac (proxy 403) | Registrado em 16/10 (PR #14) | REA no Chrome do Roberto |

## 2. Stack (sem mudança)

TanStack Start (React 19, SSR, Vite 8, nitro → worker Cloudflare), Tailwind 4, shadcn/Radix, React Query, Supabase do Lovable Cloud (Postgres, RLS, Realtime, Auth), Pagar.me v5, gateway de IA do Lovable (Lebre), e-mail do Lovable. Hospedagem no Lovable com domínio `tipe.digital`. Migrações em `drizzle/migrations/0000`–`0022` no `main`; `0023`–`0026` estão em PRs. Testes: Vitest (81 no `main`), cenários de banco em PostgreSQL (`tests/db/run.sh`).

**Variáveis de ambiente** (sem valores, só nomes): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` (cliente); no servidor, `LOVABLE_API_KEY`, `LOVABLE_CRON_SECRET`, chaves Pagar.me e `TIPE_ALLOW_SIMULATED_PAYMENTS` (só teste). Push do garçom (PR #19) vai precisar de chaves VAPID.

## 3. Funcionalidades existentes, por produto da Tipe 2.0

| Produto | No `main` (produção) | Em PR rascunho | Ausente |
|---|---|---|---|
| **Tipe Pay** | QR com token e sessão rotativa; conta ao vivo (5 s); divisão por item com frações, partes iguais, valor livre, percentual; reserva com trava de linha e idempotência (`register_table_payment`); Pix Pagar.me na conta do restaurante; pagar no estabelecimento com troco; taxa de serviço do restaurante (0–20%) e dispensa por conta; gorjeta extra 70/30 depois do pagamento; avaliação + convite ao Google; comprovante por e-mail; estorno/contestação refletidos; reconciliador de status | #12 conta mais curta (5 toques, carteiras visíveis); #16 conta mais leve | Apple Pay e Google Pay no servidor; divisão por lugar; gorjeta antes do pagamento |
| **Tipe Order** | Lançamento TIPE pelo painel; cardápio com importação CSV | #6 balcão com senha; #7 garçom lança pelo celular; #8 cliente pede pela mesa; #9 totem | Alérgenos e adicionais estruturados; repetir pedido; pré-pedido; click & collect remoto |
| **Tipe Kitchen** | KDS por item | #6 KDS por pedido e painel de senhas | Estações separadas e alerta de atraso configurável |
| **Tipe Staff** | Saldo de gorjetas, gráfico de 14 dias, Pix com quarentena, saque quinzenal | #7 mesas no celular; #13 avisos; #17 nota baixa; #19 push com app fechado | Pedido de estorno pelo garçom; metas e treinamentos |
| **Tipe Restaurant** | Início, salão ao vivo, caixa, pendências financeiras, cardápio, relatórios 1/7/30 dias com CSV, desempenho por garçom, fechamento do dia | #15 "O que precisa de você agora"; #18 pagamentos com filtros e planilha | Turnos; várias unidades; conciliação com recebíveis |
| **Tipe Backoffice** | Agregados de restaurantes, assinaturas, volume, leads, privacidade, segurança, saques, catálogo de planos, tetos da Lebre, 2FA obrigatório | — | Feature flags por plano editáveis; incidentes por restaurante |
| **Tipe AI** | Lebre (assistente com teto de custo, propostas tipadas confirmadas pelo usuário); sugestão de divisão de item | — | Resumo diário; respostas a avaliações; conciliação explicada por IA |
| **Tipe Guest** | Identidade local por mesa (nome e sobrenome no aparelho) | — | Perfil opcional, histórico, fidelidade |
| **Integrações** | Contrato de adaptador + Lançamento TIPE + API TIPE + outbox de baixa | — | Adaptador de PDV brasileiro |
| **Site** | Landing, simulador `/simulador`, Central Jurídica, LGPD | #10 landing v3 (fotos, filme da mesa, tipografia) | Páginas por módulo |

## 4. Pilhas de PR em aberto (não mexer sem coordenar)

```
main ─┬─ #10 redesign-landing-v3 ─┬─ #12 conta curta ── #16 conta leve
      │                           └─ #15 restaurante agora ── #18 pagamentos
      ├─ #6 colibri A ── #7 B ─┬─ #8 C ── #9 D
      │                        └─ #13 avisos ── #17 nota baixa ── #19 push
      ├─ #14 pesquisa Sunday (só docs)   ├─ #4 benchmark EUA (só docs)
      └─ #11 backlog único (só docs)
```

A landing (fase 9) pertence à conversa "Prompt do redesign da landing"; avisos, push e painel pertencem à conversa "Execução Sunday e evolução do Tipe". Esta entrega (Tipe 2.0) cria arquivos novos e não altera nenhum arquivo desses PRs, para não gerar conflito.

## 5. Riscos encontrados

1. **A pilha colibri (#6–#9) está há 5 dias sem merge.** Pedido pela mesa, garçom no celular e KDS por pedido existem, mas não estão em produção. É o maior atalho para Tipe Order e Kitchen.
2. **Carteiras visíveis e recusadas no servidor.** Decisão do Roberto (15/10); o cliente que tocar em Apple Pay cai no Pix. Precisa da Pagar.me para virar real.
3. **Aviso de cookies cobre o rodapé no celular** em rotas novas (corrigido para a conta no #12, ainda global no `main`). Na demonstração, a pessoa responde uma vez.
4. **`bun.lock` aponta para o cache privado do Lovable**; build na nuvem exige instalar pelo registro público sem gravar o lockfile.
