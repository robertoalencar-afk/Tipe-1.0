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

## Rodada 15/10/2026 (tarde), após o retorno do Roberto
- Estilo Sunday na landing inteira (classe `.sunday`): fundo branco, preto, Inter Tight (a Sunday usa Helvetica Neue LT, identificada pelo REA nos arquivos de fonte carregados pela página), títulos em peso médio de uma cor, rótulo grande na cor da marca, botões pretos em pílula, avisos de vidro sobre as fotos. Painel e conta do cliente não mudam.
- Mesa Viva de volta no lugar do FilmeMesa: as mesmas cenas da versão publicada, agora guiadas pela rolagem (seção presa na tela, linha do tempo GSAP com amortecimento), com a arte real do totem na cena do QR Code e só promessas reais ("aprovado pelo banco" no lugar de "em 3 s").
- Fotos refeitas por IA com a arte real do totem (renderizada do TotemStudio, modelo Clássico, suporte acrílico): garçom vendo a gorjeta extra no relógio, amigos lendo o QR do totem, casal pagando pelo celular sem maquininha, salão com totens nas mesas.
