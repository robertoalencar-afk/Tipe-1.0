# Relatório REA: o que foi efetivamente executado

Data: 13/10/2026, entre 15h08 e 16h05 (horário de Fortaleza).
Executor: servidor MCP `rea` no Mac do usuário, conectado a um Chrome separado aberto pelo usuário com `--remote-debugging-port=9222 --user-data-dir=/tmp/rea-chrome`.
Pacote de evidências exportado pelo próprio REA: **`/tmp/rea-tipe-2.0-evidencias`** no Mac (10 registros, 4,79 MB, 0 incógnitas).

## 1. Limites aplicados

- Apenas páginas públicas abertas pelo usuário. Nenhum login, nenhuma área autenticada, nenhum ambiente privado.
- **Não** foram executadas contra concorrentes: decompilação, recuperação de fontes JavaScript, extração de bundles, captura de corpo de rede. A única análise estática de bundle (`analyze_web_bundle`) foi feita **no próprio app TIPE** (tipe.digital).
- O REA reteve só formas e metadados: ele próprio descarta cabeçalhos, corpos, cookies e valores de armazenamento.

## 2. Operações executadas

| # | Ferramenta REA | Alvo | Evidência | Resultado |
|---|---|---|---|---|
| 1 | `list_browser_targets` | `127.0.0.1:9222` (antes do Chrome) | — | `endpoint_unreachable`: REA exige Chrome com depuração |
| 2 | `list_browser_targets` | Chrome de depuração | `ev_9d61ec8e…` | Chrome 155 conectado, nenhuma página aberta |
| 3 | `list_browser_targets` | Chrome com 6 abas | `ev_8eee6f41…` | 6 páginas públicas listadas |
| 4 | `inspect_web_page` | sundayapp.com/digital-bill | `ev_78062843…` | 5.600 nós DOM, 1.997 nós de acessibilidade, 28 scripts, 1 h1 / 31 h2 / 8 botões. Texto de acessibilidade **não autorizado** pela política padrão (ver §4) |
| 5 | `capture_web_screenshot` | sundayapp.com/digital-bill | `ev_d5bf5324…` | Recibo com QR impresso e saldo indo a zero como peça central da página; consentimento de cookies com "continuar sem consentir" |
| 6 | `capture_web_screenshot` | tipe.digital/simulador | `ev_cfd14355…` | Simulador público: QR da "Mesa 12 · Maré Alta", banner de cookies com "Aceitar tudo / Recusar opcionais / Escolher" |
| 7 | `capture_web_screenshot` | qlub.io/br/pt | `ev_2af3b4d2…` | **qlub opera em português no Brasil** e se apresenta como "nº 1 em soluções de pagamento para restaurantes no Brasil" (alegação comercial). Peça central: cartão "Scan to Pay" com QR |
| 8 | `capture_web_screenshot` | pos.toasttab.com/products/toast-pay | `ev_7579a63a…` | Página 404 (URL antiga). Dados do Toast Pay vieram da central de ajuda oficial |
| 9 | `capture_web_screenshot` | meandu.com | `ev_fd730a3f…` | Captura registrada |
| 10 | `capture_web_screenshot` | gotab.com | `ev_fafcd07f…` | Captura registrada |
| 11 | `analyze_web_bundle` | **tipe.digital/simulador (app próprio)** | `ev_8b150ad1…` | 50 scripts analisados, 0 falhas, 257.120 nós de AST. React + Vite identificados |
| 12 | `export_evidence_bundle` | Mac: `/tmp/rea-tipe-2.0-evidencias` | — | 10 registros exportados |

## 3. Achados

### Sobre o próprio TIPE (análise do bundle — evidência `ev_8b150ad1…`)
1. **A página pública do simulador carrega 847 KB de JavaScript em 48 arquivos** só por importação estática (fechamento calculado a partir do chunk `simulador`). Isso pesa no 4G fraco, justamente o cenário que o código do cliente tenta proteger.
2. O texto integral da Central Jurídica (`legal-content`, 45 KB) está no **caminho crítico** do simulador, por importação estática. Candidato óbvio a carregamento sob demanda.
3. O chunk do simulador puxa `createServerFn` (funções de servidor) — origem provável: a sugestão de divisão por IA do `SplitPicker`. Não lê dados de restaurante (regra do `AGENTS.md` mantida), mas vale confirmar que o simulador não deveria gastar cota da Lebre.
4. Nenhuma URL de API em texto puro nos bundles (o REA só encontrou 4 chamadas com cabeçalhos genéricos). Nenhum segredo observado.

### Sobre concorrentes (observação visual pública)
5. sunday e qlub colocam o **QR + saldo zerando** como mensagem principal — mesma promessa do TIPE ("Pague. Sem esperar."). A diferenciação do TIPE não pode ser só o QR; precisa ser Pix, divisão por item com frações e saldo transparente.
6. **qlub tem operação brasileira em português** e já disputa o mesmo cliente. É o concorrente direto mais relevante no Brasil, junto com a Payby (Salvador).

## 4. Limitações reais encontradas

| Limitação | Efeito | Contorno |
|---|---|---|
| A ponte desta sessão envia como texto parâmetros que o REA espera como objeto ou booleano | `capture_browser_scenario` (navegar, clicar, executar fluxos) e qualquer opção como `include_accessibility_text=true` são rejeitados com "Invalid input" | Usar só chamadas com parâmetros simples; páginas abertas pelo usuário |
| Texto de acessibilidade bloqueado pela política padrão | Não foi possível extrair rótulos de botões e títulos pelo REA | Pesquisa textual feita em documentação oficial (`competitive-research.md`) |
| O REA não navega sozinho | Fluxos de pagamento de concorrentes (que exigem QR real de um restaurante) não puderam ser percorridos | Não há forma legítima de percorrer sem uma mesa real; registrado como não verificado |
| Uma URL do Toast estava desatualizada | Captura de página 404 | Dados do Toast Pay vieram da central de ajuda oficial |

## 5. O que o REA **não** fez (de propósito)
- Não leu código-fonte de concorrentes, nem tentou recuperar fontes por source map.
- Não capturou corpo de requisições de nenhum site.
- Não interagiu com pagamentos reais.
