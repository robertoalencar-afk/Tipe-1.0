# V62: propostas de vídeo e ferramentas (27/10)

Nada aqui foi gerado com serviço pago. Os quadros do storyboard em `/interno/videos` usam só
fotos do casting, ilustrações e telas reais que já estão no repositório.

## 1. Ferramentas: o que existe de verdade neste ambiente

| Nome pedido | O que encontrei | Serve para quê |
|---|---|---|
| "HyperGen" | Não existe nenhuma ferramenta com esse nome aqui. O mais próximo é a **HeyGen**, dona do HyperFrames. | — |
| HyperFrames (conector "HyperFrames by HeyGen") | Conectado. A conta tem **0 projetos**. Para agentes de código, o próprio conector **desliga** `compose` e `render_video`; só leitura funciona. | Projetos HTML hospedados na HeyGen. |
| HyperFrames CLI (`npx hyperframes`) | Funciona localmente. Foi o que gerou o vídeo da lebre da V7 e da V6.1. | Composição HTML/GSAP renderizada em vídeo. É exatamente o processo que você não quer repetir para personagens. |
| HeyGen (avatares, vídeo com IA) | Não está conectada. | Avatares falantes. Não serve para lebre e tartaruga. |
| Gemini (imagem) | Chave sem créditos desde 27/10 (erro 402). Preço observado neste projeto: ~US$ 9 por 68 imagens Pro, cerca de **US$ 0,13 por imagem**. | Fotos do casting. |
| Veo (vídeo do Gemini) | Mesma conta do Gemini. Nunca usado aqui; preço por segundo **precisa ser consultado** no AI Studio. | Vídeo gerado a partir de foto ou texto. |
| OpenArt CLI (no seu Mac) | Instalado no seu Mac (21/10). Regra: mostrar custo e prompt antes. Créditos **a consultar** na conta. | Imagem e vídeo por vários modelos (Kling, Veo, etc.). |
| Hugging Face Spaces gratuitos | Bloqueados pela rede desta sessão. | Modelos abertos de vídeo, com fila e limite. |

**Conclusão.** HyperFrames é ótimo para telas de produto (movimento de interface, textos,
transições), e ruim para personagens: mexer recortes de uma imagem parada sempre vai
denunciar o recorte. Para lebre e tartaruga, a alternativa tecnicamente superior é **vídeo
gerado a partir de imagem (image-to-video)**, partindo das ilustrações oficiais dos
personagens, com o relógio e as telas aplicados depois por composição controlada (como nas
fotos). Para o "Como funciona", o melhor resultado é **híbrido**: cenas reais geradas a partir
das fotos do casting (Veo ou Kling) e a interface real composta por cima em HyperFrames ou
After Effects, nunca desenhada pela IA.

## 2. Vídeo "Como funciona": três propostas

Regras comuns: telas reais do app (src/assets/telas-reais) sempre compostas depois, nunca
geradas. Cardápio e pedido só aparecem com o selo "Tipe Order · em desenvolvimento" enquanto
o Order não estiver disponível. Casting: Camila e Diego (casal), mesa 12 do Maré Alta, Joyce
como garçonete. Formatos 16:9 e 9:16.

### Proposta 1 · Mesa Viva ("A mesa ganha vida.")

- **Duração:** 30 s.
- **Narrativa:** a mesa física e a interface são a mesma coisa. Cada toque no celular acende
  algo no restaurante.
- **Cenas:**
  1. (0–4 s) Plano aberto do Maré Alta à noite; mesa 12 com Camila e Diego. O totem real em
     primeiro plano. *Quadro inicial.*
  2. (4–8 s) Close na mão de Camila aproximando o celular do totem. Um anel turquesa fino nasce
     do QR e "contorna" a mesa (a mesa foi reconhecida).
  3. (8–13 s) A conta aparece no celular (tela real "conta"). Linhas finas saem dos pratos
     reais na mesa e encontram os itens na tela.
  4. (13–17 s) Com Order: cardápio (tela real, selo "em desenvolvimento"). Ela toca em
     "+". Corte seco para a cozinha: o pedido entra no KDS.
  5. (17–22 s) Volta à mesa: dividir em 2 (tela real "dividir"), Apple Pay, "Pagamento
     realizado".
  6. (22–27 s) O mapa do salão (tela real "salão") vira a mesa 12 de turquesa; Joyce sente o
     celular vibrar e sorri.
  7. (27–30 s) A mesa vazia, limpa, com o totem. "A mesa ganha vida." + logotipo. *Quadro final.*
- **Direção de arte:** fotografia documental quente (mesmo estilo X100V do casting),
  interface limpa por cima, turquesa só nos elos entre mesa e tela.
- **Câmera:** dolly lento de aproximação; macro no QR; whip pan para a cozinha.
- **Transições:** match cut do totem para a tela; as linhas turquesa conduzem o olho.
- **Narração (sugestão):** "Toda mesa tem um QR. Encosta o celular… e a mesa acorda. A conta
  chega sozinha. O pedido vai direto para a cozinha. Divide, paga, pronto. A Joyce já sabe. A
  mesa já está livre."
- **Trilha e efeitos:** pulso eletrônico leve (90–100 bpm), "tic" suave a cada elo, vibração
  do celular, som ambiente de restaurante baixo.
- **Recursos:** 5 a 6 clipes image-to-video de 4–6 s a partir das fotos do casting (cena 01
  casal, 07 garçonete, 10 cozinha, 13 mesa liberada); composição das telas reais; locução
  (voz humana ou TTS a definir).

### Proposta 2 · Um único movimento ("Do QR ao pagamento, sem interrupções.")

- **Duração:** 25 s.
- **Narrativa:** um plano-sequência aparente. A câmera nunca corta, só atravessa camadas.
- **Cenas:**
  1. (0–3 s) Macro no QR do totem. *Quadro inicial.*
  2. (3–8 s) A câmera "entra" no QR e sai dentro da tela do celular: cardápio (Order, com selo)
     ou conta (só Pay).
  3. (8–16 s) A interface rola sozinha: conta, dividir, métodos, Pix aprovado. Movimento de
     interface real, na velocidade de um dedo.
  4. (16–21 s) A câmera recua de dentro do celular e revela a mesa, depois o salão inteiro.
  5. (21–25 s) No tablet do gerente, a mesa 12 fica livre. Logotipo. *Quadro final.*
- **Direção de arte:** apresentação de produto de tecnologia: fundo neutro, luz suave, muito
  espaço vazio.
- **Câmera:** um único movimento contínuo (zoom de entrada e recuo).
- **Transições:** zoom-through, sem cortes.
- **Narração:** opcional; legenda de quatro palavras, uma por etapa ("Escaneou. Escolheu.
  Pagou. Pronto.").
- **Trilha:** piano e sintetizador, crescendo no recuo final.
- **Recursos:** parte de interface toda em HyperFrames (é onde ele é forte), com 2 clipes
  image-to-video (entrada no QR e recuo para o salão).

### Proposta 3 · Duas experiências, uma plataforma ("O cliente aproveita. O restaurante acompanha.")

- **Duração:** 30 s.
- **Narrativa:** tela dividida. À esquerda, a mesa; à direita, a operação. Cada ação de um lado
  gera um resultado no outro.
- **Cenas:**
  1. (0–4 s) Split: Camila e Diego rindo | cozinha calma. *Quadro inicial.*
  2. (4–10 s) Ela escaneia | a mesa 12 abre no salão.
  3. (10–16 s) Com Order: pede | o KDS mostra a comanda e o chef começa.
  4. (16–22 s) Paga com Pix | o caixa recebe, a Joyce é avisada.
  5. (22–27 s) Gorjeta extra de R$ 37,80 | "R$ 26,46 no seu saldo" (70%).
  6. (27–30 s) As duas metades se fecham no símbolo da Tipe. *Quadro final.*
- **Direção de arte:** duas paletas: quente no salão, fria e limpa na operação.
- **Câmera:** planos fixos, simétricos, o divisor anda conforme quem age.
- **Transições:** o divisor central desliza; fechamento em íris no símbolo.
- **Narração:** "Enquanto você aproveita… a cozinha já sabe. O garçom já sabe. O caixa já
  fechou. A Tipe junta os dois lados."
- **Trilha:** ritmo em dois instrumentos que se encontram no final.
- **Recursos:** 8 clipes curtos image-to-video (4 de cada lado) + composição das telas.

## 3. Lebre e tartaruga: três propostas

Exigências comuns: relógio com ponteiros no sentido horário e passagem de tempo coerente,
composto em vetor depois (nunca gerado pela IA); orelhas girando a partir da base; olhos e
boca expressivos; mesmo modelo dos personagens em todas as cenas. Base visual: as ilustrações
oficiais em `src/assets/cenas/lebre-tartaruga-*`. Se o image-to-video deformar os
personagens nos testes, o plano B é reconstruí-los em 3D (o estilo já é de massinha/vinil, o
que favorece um modelo 3D simples em Blender, com rig de verdade).

### Proposta 1 · A corrida contra o tempo

- **Duração:** 18 s. **Final:** "Desta vez, a lebre ganha."
- **Cenas:** (1) tartaruga à mesa, olhando o relógio; (2) passagem de tempo: ponteiro dos
  minutos dá uma volta, a luz da janela muda; (3) ela leva a mão ao queixo, suspira; (4) corte
  para a lebre: QR, divide, paga, balão de aprovado; (5) a lebre já se levanta, acena; a
  tartaruga ainda espera; (6) assinatura.
- **Narração:** "A tartaruga pediu a conta às oito. … Às oito e quarenta, a maquininha ainda
  estava em outra mesa. A lebre pagou pelo celular. Desta vez, a lebre ganha."
- **Câmera:** plano fixo da tartaruga (o tempo é o personagem), câmera viva na lebre.

### Proposta 2 · O mesmo restaurante, dois tempos

- **Duração:** 22 s. **Final:** "Seu tempo é para aproveitar. Não para esperar."
- **Cenas:** split com duas mesas lado a lado, cada uma com um relógio. Tartaruga: chama o
  garçom, espera a conta, espera a maquininha. Lebre: paga em segundos e usa o tempo que sobrou
  (sobremesa, conversa, vai embora para a praia). Os relógios mostram a diferença em minutos.
- **Narração:** "Mesma comida. Mesma mesa. Quarenta minutos de diferença."
- **Câmera:** dois planos fixos simétricos; no fim, a câmera abre e as duas mesas são a mesma.

### Proposta 3 · A fábula reinventada

- **Duração:** 20 s. **Final:** "Com a Tipe, quem chega depois pode pagar primeiro."
- **Cenas:** a tartaruga já está quase pagando, confiante, olha a lebre chegar; a lebre senta,
  escaneia, paga e sai; a tartaruga fica de boca aberta, a maquininha ainda carregando; a lebre
  pisca da porta.
- **Narração:** "Ela tinha certeza de que desta vez ia ganhar. Chegou primeiro, pediu
  primeiro… Mas a lebre tinha a Tipe."
- **Câmera:** linguagem de cinema mudo/comédia: plano e contraplano, um zoom rápido na reação.

## 4. Orçamento (estimativa sem valores inventados)

Preço por imagem do Gemini medido neste projeto: **~US$ 0,13** (68 imagens Pro por ~US$ 9).
Preços de vídeo (Veo, Kling, OpenArt) **dependem da conta** e precisam ser consultados antes;
abaixo estão as quantidades, que não dependem de preço.

| Frente | Ferramenta | Entregas | Tentativas prováveis | Resolução / duração | Custo |
|---|---|---|---|---|---|
| 1. Correção de imagens | Gemini (Nano Banana Pro) + composição local | 3 a 5 fotos a refazer (lista na auditoria) | 3 a 4 por foto, 2 proporções | 4K | ~15 a 40 imagens × US$ 0,13 = **US$ 2 a 5** |
| 2. "Como funciona" (proposta escolhida) | Veo ou Kling via OpenArt (image-to-video) + HyperFrames local (grátis) | 2 a 8 clipes de 4–6 s, conforme a proposta | 3 a 4 por clipe | 1080p, 16:9 e 9:16 | **a consultar**: 30 a 190 s gerados × preço por segundo |
| 3. Lebre e tartaruga (proposta escolhida) | Image-to-video a partir das ilustrações oficiais; relógio e telas compostos localmente | 5 a 7 clipes de 3–5 s | 4 a 6 por clipe (personagens exigem mais) | 1080p | **a consultar**: 60 a 210 s gerados × preço por segundo |

O que eu preciso para fechar os valores: o preço por segundo do Veo no seu AI Studio e o
saldo/preço de vídeo no OpenArt (dá para ver com o OpenArt CLI no seu Mac). Nenhuma geração
paga será feita antes da sua autorização.
