# 00 — Progresso da missão "Benchmark de PDVs e ERPs dos EUA" (v2)

Branch: `research/us-benchmark-pdv-erp` · Início: 14/10/2026 · Base: `main` `e6813a2`.

## Etapas

| Etapa | Situação | Arquivos | Próximo passo |
|---|---|---|---|
| 0 — Linha de base | Concluída | este arquivo | — |
| 1 — Auditoria Tipe | Concluída | `01-AUDITORIA-TIPE.md` | — |
| 2 — PDVs dos EUA | Em andamento | `notas/toast.md`, `square.md`, `lightspeed.md`, `touchbistro.md`, `spoton.md`, `nivel-2-pdv.md` | consolidar em `02-BENCHMARK-PDV-USA.md` |
| 3 — ERPs | Em andamento | `notas/erp-usa.md` | consolidar em `03-BENCHMARK-ERP-USA.md` |
| 4 — Realidade Brasil | Em andamento | `notas/brasil.md` | `04b-REALIDADE-BRASIL.md` |
| 5 a 8 | Pendente | | |
| 9 — Protótipos | Pendente (opcional) | | |

## Etapa 0 — Linha de base (resumo)

1. **Já pesquisado:** benchmark internacional de pagamento na mesa (TIPE 2.0, 13/10/2026: `docs/competitive-research.md`, `feature-gap-matrix.md`, `TIPE-INTERNATIONAL-BENCHMARK.md`, `rea-*.md`, `technical-report.md`, `test-report.md`) cobrindo sunday, qlub, me&u, Toast Pay, Square, SpotOn, Payby, Zonal. Conclusão: o QR não diferencia mais; a Tipe lidera em divisão com frações, Pix nativo e proteção contra pagamento duplicado, e fica atrás em integração com PDVs, carteiras digitais e fidelidade.
2. **Análise Sunday × Tipe** (outra sessão, 14/10/2026, pasta compartilhada `sunday-analise/`): inventário completo do `main` e matriz de 50 itens; destaca que pedido pela mesa, garçom no celular, KDS por pedido, senhas e totem **já estão escritos no ramo `colibri/fase-1-balcao-kds-senhas`**, fora do `main`.
3. **Design system** (`redesign-premium`, documento de design system): tokens semânticos em `src/styles.css`, componentes `ds.tsx` (`StatusBadge`, `StatCard`, `EmptyState`, `PageHeader`, `Panel`), regras "cada estado tem cor e texto", "sem dado real, sem número". Também fora do `main`.
4. **Entregue no código (`main`):** pagamento na mesa completo (Pix, presencial, divisão, gorjeta 70/30, avaliação, comprovante), Lançamento TIPE, KDS por item, caixa, relatórios, fechamento do dia, pendências financeiras, fila de baixa para PDV externo, limite de mesas por plano, backoffice com 2FA.
5. **Próximos passos já registrados:** cartão na conta, políticas de gorjeta, notificações, conciliação, integração com PDVs brasileiros, integrar os ramos `colibri` e `redesign-premium`, multiunidade.
6. **Delta desta missão:** PDV, salão, cozinha e backoffice/ERP. O pagamento na mesa só é referenciado.

## Ferramentas REA

As ferramentas REA aparecem nesta sessão como ferramentas do **computador do usuário** (`mcp__remote-devices__rea__*`), executadas pelo app Claude no desktop, não no ambiente em nuvem onde a pesquisa roda.

| Ferramentas | Decisão | Motivo |
|---|---|---|
| `capture_web_screenshot`, `capture_browser_scenario`, `inspect_web_page`, `compare_web_screenshots`, `export_evidence_bundle` | Permitidas, **não usadas** | rodariam no computador do usuário e pediriam autorização a cada site; a pesquisa precisa de texto de central de ajuda, que WebFetch lê direto; capturas de concorrentes não podem entrar no repositório |
| `analyze_web_bundle`, `export_web_scripts`, `recover_javascript_sources`, `trace_javascript_semantics`, `trace_web_module_imports`, `compare_bundles`, `compare_source_to_bundle` e afins | Não usarei em concorrentes | engenharia reversa de código (proibido pela seção 2.1) |
| `inspect_web_network_capture`, `observe_web_session`, `observe_web_execution`, `inspect_web_event_listeners` | Não usarei em concorrentes | captura de tráfego e execução (proibido) |
| `pull_adb_package`, `decompile_jeb_item`, `open_binary`, `inspect_android_*`, `inspect_macho` e demais de binário/ADB | Não usarei | decompilação de apps (proibido) |
| Análise de bundle no build da Tipe | Não necessária | o código-fonte está no repositório; o build foi verificado diretamente |

**Troca registrada:** a pesquisa usou WebSearch e WebFetch (fontes públicas), por subagentes, como a seção 2.1 permite.

## Verificação técnica

- `bun install` (registro npm público; `bun.lock` restaurado, sem alteração) e `bun run build`: **sucesso** (Nitro gerou `.output`).
- `vitest run`: **81 testes passaram** (8 arquivos).
- Nenhum comando contra o Supabase real.

## Impedimentos

(atualizado ao longo da missão; ver também a seção "Impedimentos" de cada nota em `notas/`)

- Vídeos oficiais de treinamento (YouTube) não podem ser assistidos neste ambiente; só títulos e descrições.
- Ferramentas REA não usadas (acima).
