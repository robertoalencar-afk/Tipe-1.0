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

## 15/10 (fim da tarde)

- Simulador funcionando de volta na landing (seção "Experimente", iframe do `/simulador` dentro de um celular; banner de cookies e WhatsApp escondidos dentro do iframe).
- Telas reais do app em celulares nítidos no hero e numa galeria de 4 passos.
- Apple Pay e Google Pay ativos também no simulador (decisão registrada).
- Mesa Viva com o azul da Tipe, lebre em três cenas, divisão e gorjeta clicáveis.

## 15/10 (noite)

- Frase principal: "A conta já está na mesa.", com bigodes da lebre (focinho verde) no lugar dos três tracinhos.
- Lebre minimalista em traço (`landing/Lebre.tsx`), derivada das folhas do logo, no lugar dos mascotes ilustrados na landing. O app do cliente continua com os mascotes oficiais.
- Mesa Viva refeita: capítulos guiados pela rolagem, nome do restaurante digitado pelo visitante em todas as telas, celular clicável (escolher itens, pagar, avaliar, gorjeta), relógio do garçom e a lebre comentando.
- Frases grandes com a rolagem: faixas que andam para os lados (após "Problema") e manifesto que acende palavra por palavra (antes de "Ecossistema").
- Nova página `/teste-gratis` (inspirada na página de demonstração da sunday): formulário de teste grátis em destaque e carrossel de benefícios. O formulário saiu da home; todos os botões de conversão e o cabeçalho ("Teste grátis") levam para lá. Leads continuam com origem "home".

## 15/10 (noite, segunda rodada)

- Lebre em traço descartada a pedido do Roberto: voltaram os mascotes oficiais em toda a landing e na Mesa Viva.
- Bigodes refeitos com traço grosso e focinho verde, para ler claramente como a lebre.
- `/teste-gratis` refeita na estrutura da página de demonstração da sunday, lida com o REA (inspect_web_page, só estrutura): título e formulário no topo, faixa rolando, frases grandes com foto embutida guiadas pela rolagem e carrosséis por público (cliente, equipe, caixa, dono) com navegação em pílulas.
- Nova foto da dona do restaurante (Gemini, com o painel real da Tipe como referência na tela do tablet). Original em `fotos-ia/gestor.jpg`; versão anterior em `gestor-v2.jpg`.

## Rodada 15/10 19:48
- Título curto "Pague. Sem esperar." na mesma fonte, com bigodes finos (três fios e um ponto de focinho).
- Símbolo oficial recortado do logo (src/assets/tipe-simbolo.png) nas faixas e na página de teste grátis.
- Mesa Viva voltou à versão anterior (GSAP), com CTA para /teste-gratis, mascotes maiores e fechamento "A conta já está na mesa." para não repetir o título.
- Nova foto da dona: mulher simples, de pele branca, trabalhando no tablet do balcão (fotos-ia/gestor-v4a.jpg).
- Celulares no estilo do vídeo da página Digital Bill da sunday (capturado com o REA em 16/10): painel preto com brilho da marca, celular inclinado em 3D, moedas flutuando e barra branca de passos; a tela troca pelos 4 passos reais conforme a rolagem (PalcoCelular.tsx).
