# Design system da Tipe 2.0

Este arquivo não cria um design system novo: ele aponta para o que já existe e diz como as telas da Tipe 2.0 o usam. Duas versões convivem hoje:

| Versão | Onde | Situação |
|---|---|---|
| Redesign premium | `docs/design-system.md`, `src/components/tipe/ds.tsx`, tokens em `src/styles.css` (`main`) | Em produção. Sora (títulos) + Manrope (texto), turquesa `oklch(0.77 0.14 178)` e azul-marinho `oklch(0.2 0.04 250)` |
| Redesign v3 (landing) | `landing-v3/rodada-1750/design-system.md` na pasta do projeto, PR #10 | Em PR. Inter Tight, preto e branco com turquesa só na ação de pagar, pílulas pretas, cartões de 20–36 px sem sombra |

**Decisão desta entrega:** as telas de `/demo` usam só os tokens e utilitários do `main` (`surface-card`, `bg-ink`, `bg-brand`, `brand-soft`, `font-display`, `StatCard`, `Button`), sem cores novas. Quando o PR #10 entrar, a troca de fonte e de botão vale automaticamente para elas.

## Identidade (preservada)

- Logo oficial vetorizado: `marca/tipe-logo.svg` e `tipe-logo-branco.svg` na pasta do projeto; no código, `TipeLogo` e `TipeSymbol`.
- Mascote lebre: poses oficiais em `src/assets/mascot-*` e situações em `mascotes/lebre-situacoes/` (aparece em espera e agradecimento, nunca como hero).
- Turquesa = ação de pagamento, progresso e marca. Azul-marinho/preto = navegação e seleção.

## Padrões usados nas telas da Tipe 2.0

| Padrão | Regra | Exemplo em `/demo` |
|---|---|---|
| Faixa de demonstração | Sempre visível em telas com dado fictício, cor de aviso, texto curto | `DemoShell` |
| Troca de perfil | Pílulas roláveis; ativa em `bg-ink` | Cabeçalho do `/demo` |
| Valor principal | `font-display` grande, classe `money` (algarismos tabulares) | "Falta pagar R$ 176,00" |
| Seleção | Pílula preta ou borda turquesa com marca de seleção | Divisão, gorjeta, meio de pagamento |
| Botão de pagar | Turquesa, largura total, altura 48–56 px, valor e meio no texto | "Pagar R$ 96,00 com Pix" |
| Estado | `Pill`/`StatusBadge` com 5 tons (neutro, marca, aviso, sucesso, erro) | Status do item na cozinha e do pagamento |
| Aviso em tempo real | Lista com `aria-live="polite"`, não lidos com fundo de marca, nota baixa em vermelho claro | Avisos do garçom e do gerente |
| Atraso | Borda e fundo vermelho claro + minutos em vermelho | Cartão da cozinha |
| Vazio | Diz o que vai aparecer ali | "Nenhum pedido ainda..." |
| Gráfico | Uma série em barras, grade discreta, dica ao passar o mouse e tabela oculta para leitor de tela | "Faturamento por hora" (`BarChart`) |
| Marca | Logo oficial SVG (`src/assets/marca/`), nunca "Tipe 2.0" na interface | Cabeçalho do `/demo` |
| Papel das cores | Turquesa = dinheiro e pagar; azul-marinho = navegar, selecionar, continuar | Botões "Continuar" e "Pagar" |
| Folha (sheet) | De baixo no celular, centralizada no computador; Esc e fundo fecham | Item do cardápio, mesa do garçom |
| Componentes da demo | `src/components/tipe/demo/ui.tsx` | Todas as telas do `/demo` |

## Acessibilidade

Alvos de toque ≥ 36 px nas telas de equipe e ≥ 44 px no fluxo do cliente; abas com `role="tablist"`/`aria-selected`; mesas do garçom com nome acessível ("Mesa 1: Ocupada, 1 pronto para servir"); `prefers-reduced-motion` já respeitado pelos utilitários de animação. Auditoria WCAG 2.2 AA com ferramenta automática ainda não feita (ver `testing-plan.md`).
