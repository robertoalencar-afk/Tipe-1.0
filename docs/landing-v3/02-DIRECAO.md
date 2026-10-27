# 02 · Direção da landing v3

**Conceito:** a Tipe acontece no meio do jantar. Pessoas reais primeiro, a tela do produto entra na cena só para resolver a conta.

## Tipografia
Comparação renderizada (desktop e 390px) de Sora + Manrope (atual), Inter Tight, Geist, Instrument Sans, Plus Jakarta Sans, DM Sans, Outfit, Bricolage Grotesque e Hanken Grotesk, com título, parágrafo, preço em R$ e botão.

**Escolha: Bricolage Grotesque nos títulos + Manrope no texto.**
- Bricolage tem o impacto de uma grotesca grande (como a Helvetica do Sunday), mas com terminais e curvas mais amigáveis, o que dá personalidade sem perder legibilidade.
- Manrope continua no texto: lê bem no mobile e evita mexer no corpo de texto do painel, da conta e da área do garçom.
- Licença SIL OFL 1.1 (Fontsource). Arquivos WOFF2 variáveis, subconjunto latino (cobre ç, ã, õ, é), auto-hospedados em `public/fonts/` (41 KB + 25 KB), com `preload` e fallback com métricas ajustadas para não haver salto de layout. A chamada ao Google Fonts saiu.
- Escala: hero `clamp(2.9rem → 5.1rem)`, seções `text-headline`, fechamento até 7rem; tracking −0,045em; entrelinha 0,92–0,96.

## Cores
Turquesa `--brand-primary` como destaque e em uma superfície cheia (plano recomendado); azul-marinho como base escura (filme da mesa, ecossistema, conversão); laranja `--highlight` só em detalhes; dois fundos claros novos e suaves (creme no "problema", turquesa-claro em "para quem atende") para variar o ritmo sem gradientes.

## Fotografia
Editorial e espontânea, com pessoas brasileiras (ver ROTEIRO-ENSAIO.md). Enquanto as fotos não chegam, cada espaço mostra a lebre sobre um fundo da marca, sem quebrar a página. Trocar uma foto é só colocar o arquivo em `src/assets/fotos/` (ver IMAGENS.md).

## Motion
- Só `transform` e `opacity`; scroll nativo, sem smooth scroll artificial e sem biblioteca nova.
- Hero: entrada por linha em CSS (não depende de JavaScript, para não atrasar o LCP).
- Títulos de seção sobem de uma máscara linha a linha; fotos abrem de uma máscara com leve zoom-out; notificações entram com mola.
- Filme da mesa: a antiga `MesaViva` virou uma seção "sticky" de 5 cenas que acompanham a rolagem, com as telas reais da conta.
- Parallax leve só em desktop; tudo desligado com `prefers-reduced-motion`.

## Mapa das seções
1. **Hero** — "Tipe — Pague. Sem esperar." + "A conta chega. A espera não."; foto do garçom com notificações.
2. **A parte chata** — "O melhor do restaurante não é esperar para pagar."; conversa da mesa chamando o garçom, com a lebre segurando a maquininha.
3. **Como funciona (filme da mesa)** — Aponte a câmera · A conta, ao vivo · Cada um paga o seu · Pix e pronto · Gostou? Agradeça.
4. **Para quem está na mesa** — "Menos espera. Mais bons momentos."; foto dos amigos com o cartão "R$ 0,00".
5. **Para quem atende** — "Mais tempo para servir. Menos tempo para cobrar."; foto editorial com notificações de gorjeta e avaliação.
6. **Para quem gerencia** — "Seu salão inteiro, numa tela só."; painel de demonstração.
7. **Ecossistema** — "Do pedido ao pagamento, tudo conversa."; disponível hoje × em desenvolvimento.
8. **Calculadora de giro** — mantida, com o novo visual.
9. **Planos** — "Preço simples. Sem surpresa."
10. **Dúvidas** e **Conversão** — "Pague. Sem esperar." com o formulário da lista de espera.
