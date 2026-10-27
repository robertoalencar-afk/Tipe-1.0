# A lebre e a tartaruga (V7, HyperFrames)

Vídeo da landing refeito em 27/10 como composição **HyperFrames** com personagens articulados,
no lugar do rig WebGL da V6 (`docs/landing-v5/video-lebre/rig.js`), que deformava a foto inteira.

Como funciona:

- `partes.py`: polígonos e pivôs de cada parte, em pixels da ilustração original 1600x893
  (tartaruga: cabeça no pescoço, antebraço no cotovelo, pálpebras, ponteiros do relógio;
  lebre do celular: cabeça, orelhas na base, braços com o celular no ombro, balão de aprovado;
  lebre da gorjeta: cabeça, orelhas, balão do coração). `REMENDOS` tira o rabo "derretido"
  do celular da lebre da gorjeta.
- `camadas.py`: recorta cada parte (PNG com alfa) e gera o prato limpo, preenchendo por
  interpolação suave só o que fica atrás das partes (o fundo azul do estúdio da tartaruga
  é preservado). Pálpebras: a tartaruga usa a pele logo acima do olho; a lebre usa a pele
  interpolada em volta do olho, mais um traço de olho fechado.
- `personagens.js`: a animação (GSAP). Só rotação e alguns pixels de deslocamento por parte,
  com pivôs anatômicos, antecipação e atraso entre cabeça e orelhas. Nada é esticado.
- `build.py`: monta dois projetos HyperFrames (`lebre-16x9`, 1600x900, e `lebre-4x5`,
  1080x1350) com câmera, textos, celular, wipe e assinatura vindos do motor da V6
  (`js.txt`, `render.txt`, `body.txt`, `css.txt`), chamados pela mesma linha do tempo.
- `finalizar.sh`: converte os renders de 60 quadros/s em 30 quadros/s com tmix e gera
  MP4, WebM e pôsteres para `src/assets/video/`.

Passo a passo:

```sh
python3 camadas.py /tmp/lebre
python3 build.py /tmp/lebre /tmp/lebre/out
(cd /tmp/lebre/out/lebre-16x9 && npx hyperframes check && npx hyperframes render --fps 60 --quality delivery -o /tmp/lebre/r/hf-16x9.mp4)
(cd /tmp/lebre/out/lebre-4x5  && npx hyperframes check && npx hyperframes render --fps 60 --quality delivery -o /tmp/lebre/r/hf-4x5.mp4)
./finalizar.sh /tmp/lebre/r /tmp/lebre/final   # depois copie para src/assets/video/
```

HyperFrames 0.8.207 local (CLI de código aberto, sem nuvem e sem custo).
