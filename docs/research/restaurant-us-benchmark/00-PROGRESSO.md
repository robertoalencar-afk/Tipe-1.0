# 00 — Progresso da missão "Benchmark de PDVs e ERPs dos EUA" (v2)

Branch: `research/us-benchmark-pdv-erp` · Início: 14/10/2026 · Base: `main` `e6813a2`.

## Etapas

| Etapa | Situação | Arquivos | Próximo passo |
|---|---|---|---|
| 0 — Linha de base | Concluída | este arquivo | — |
| 1 — Auditoria Tipe | Concluída | `01-AUDITORIA-TIPE.md` | — |
| 2 — PDVs dos EUA | Concluída | `02-BENCHMARK-PDV-USA.md`, `notas/toast.md`, `square.md`, `lightspeed.md`, `touchbistro.md`, `spoton.md`, `nivel-2-pdv.md` | conferência visual pela REA feita em 20/10/2026 (ver `05` §7) |
| 3 — ERPs | Concluída | `03-BENCHMARK-ERP-USA.md`, `notas/erp-usa.md` | — |
| 4 — Realidade Brasil | Concluída | `04b-REALIDADE-BRASIL.md`, `notas/brasil.md` | ler a Order API da Saipos |
| 5 — Matriz | Concluída | `04-MATRIZ-FUNCIONALIDADES-TIPE.md` | — |
| 6 — Design e UX | Concluída | `05-DESIGN-SYSTEM-BENCHMARK.md` | conferência pela REA feita (§7); faltam Lightspeed pedidos e TouchBistro |
| 7 — Telas | Concluída | `06-TELAS-REFERENCIA-TIPE.md` (com esboços ASCII) | — |
| 8 — Arquitetura, priorização, plano | Concluída | `07` a `10` | — |
| Resumo executivo | Concluído | `11-RESUMO-EXECUTIVO.md` | — |
| 9 — Protótipos HTML | **Não feita** | — | próxima sessão: dashboard, PDV, mapa, KDS, financeiro, a partir dos esboços de `06` |

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
| `list_browser_targets`, `capture_web_screenshot`, `inspect_web_page`, `capture_browser_scenario`, `compare_web_screenshots`, `export_evidence_bundle` | **Usarei** (permitidas) | `list_browser_targets` e `capture_web_screenshot` usadas com sucesso; navegação e o restante ficaram bloqueados (ver Impedimentos). Capturas ficam fora do repositório |
| `analyze_web_bundle`, `export_web_scripts`, `recover_javascript_sources`, `trace_javascript_semantics`, `trace_web_module_imports`, `compare_bundles`, `compare_source_to_bundle` e afins | Não usarei em concorrentes | engenharia reversa de código (proibido pela seção 2.1) |
| `inspect_web_network_capture`, `observe_web_session`, `observe_web_execution`, `inspect_web_event_listeners` | Não usarei em concorrentes | captura de tráfego e execução (proibido) |
| `pull_adb_package`, `decompile_jeb_item`, `open_binary`, `inspect_android_*`, `inspect_macho` e demais de binário/ADB | Não usarei | decompilação de apps (proibido) |
| Análise de bundle no build da Tipe | Não necessária | o código-fonte está no repositório; o build foi verificado diretamente |

**Troca registrada:** o conteúdo da pesquisa veio de WebSearch e WebFetch (fontes públicas), por subagentes, como a seção 2.1 permite quando a REA não abre um site.

## Verificação técnica

- `bun install` (registro npm público; `bun.lock` restaurado, sem alteração) e `bun run build`: **sucesso** (Nitro gerou `.output`).
- `vitest run`: **81 testes passaram** (8 arquivos).
- Nenhum comando contra o Supabase real.

## Impedimentos

Ver também a seção "Impedimentos" de cada nota em `notas/`.

- **REA (conferência visual), atualizado em 20/10/2026:** seis artigos foram capturados inteiros (Toast mesas e KDS, Lightspeed mesas, Square modificadores, mapa e KDS); resultados em `05` §7. Para isso, um comando no Terminal do usuário estica a área visível de cada aba (`Emulation.setDeviceMetricsOverride`, sem executar script da página), porque a REA só captura a área visível e não navega. Ficaram de fora Lightspeed "Adding orders" (imagem acima de 10 MB) e os dois do TouchBistro (aba recusada).
- **Histórico (14/10/2026):** a pedido do usuário (14/10/2026), a REA passou a ser obrigatória nesta pesquisa. Ela foi conectada ao Chrome do usuário com depurador (`127.0.0.1:9222`) e `list_browser_targets` e `capture_web_screenshot` funcionaram (captura da home pública do GoTab, guardada fora do repositório). Duas limitações impediram a conferência completa: (1) `capture_browser_scenario`, a ferramenta de navegação, recusou os parâmetros enviados por esta sessão, então só abas já abertas podem ser capturadas; (2) a conexão com o computador do usuário caiu durante a sessão e as ferramentas REA deixaram de estar disponíveis. **Por isso, toda afirmação `[TELA]` desta missão vem do texto dos artigos de ajuda oficiais, não de captura vista.** Pendente: abrir no Chrome com depurador os artigos de ajuda citados nas notas (Toast "Manage Tables", "Start and Send an Order", "Customize KDS Tickets"; Square 6427, 7944, 8171, 5119; Lightspeed F4/F5/F7; TouchBistro "Taking Orders", "Using the KDS") e capturá-los pela REA para confirmar cores, densidade e alvos de toque de `05-DESIGN-SYSTEM-BENCHMARK.md`.
- Vídeos oficiais de treinamento (YouTube) não puderam ser assistidos; só títulos e descrições.
- Limite de uso da conta interrompeu cinco subagentes de pesquisa por cerca de 4 h; todos foram retomados e concluídos.
- Saipos Order API: robots.txt bloqueou a leitura. Central de ajuda da MarketMan não carregou. Página de ajuda do SpotOn só abre por JavaScript (lida pelo espelho público). Preços de Aloha, Brink, Simphony e R365 não são públicos.
- Uma página pública da ajuda do SpotOn expõe senhas administrativas do handheld; não foram reproduzidas.
