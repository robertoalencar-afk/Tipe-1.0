# Status · landing v3

Branch `redesign-landing-v3`, criada a partir de `integracao/redesign-premium` (PR #5, ainda não mesclado). Quando o PR #5 entrar no `main`, este PR deve ser reapontado para o `main`.

| Fase | Situação |
|---|---|
| 1. Branch, build e estudo com a REA | Feito (01-REFERENCIAS.md) |
| 2. Direção e tipografia | Feito (02-DIRECAO.md) |
| 3. Imagens | Estrutura pronta; **aguardando fotos** (IMAGENS.md, ROTEIRO-ENSAIO.md) |
| 4–5. Seções, filme da mesa | Feito |
| 6. Motion, cookies, mobile | Feito |
| 7. Validação | Feito, com a meta mobile em aberto (VALIDACAO.md) |

Pendências do Roberto: DECISOES-PENDENTES.md.

Arquivos alterados: `src/routes/index.tsx`, `src/components/tipe/landing/{FilmeMesa,EditorialPhoto,motion}.tsx`, `ProductScreens.tsx` (telas de divisão e de leitura do QR), `PrivacyPreferences.tsx`, `LandingCalculator.tsx` (só visual), `src/styles.css` (fontes e motion), `src/routes/__root.tsx` (preload das fontes), `public/fonts/`.
Nada de pagamento, PDV, KDS, banco ou Pagar.me foi tocado. `bun.lock` intocado.
