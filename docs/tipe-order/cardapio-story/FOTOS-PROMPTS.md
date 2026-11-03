# Fotos do cardápio Maré Alta: status (03/11/2026)

## Inventário (este Mac: MacBook Intel i5-8257U, 8 GB de RAM, Intel Iris Plus 645, sem Apple Silicon/MPS, Python 3.9)
- ~/.claude/skills: nenhuma skill gera imagem de graça. A skill `design` usa Gemini, Atlas Cloud e MuAPI, todos pagos e sem chave configurada. Nenhuma skill faz foto → 3D.
- Não estão instalados: Ollama, ComfyUI, DiffusionBee, Draw Things, Blender, ffmpeg, ImageMagick nem modelos baixados.
- Pollinations.ai anônimo (grátis): hoje só oferece o modelo "sana", em 576x1024, com marca d'água e qualidade ruim. Foi DESCARTADO.
- Caminho local escolhido: venv ~/.venvs/tipe-img (torch 2.2.2 CPU, diffusers 0.30.3), com o modelo Lykon/dreamshaper-8-lcm (SD1.5 LCM, licença CreativeML OpenRAIL-M, uso comercial permitido). Script: ~/.venvs/tipe-img/gen.py (contém os prompts), geração em 512x904 e upscale para 1080x1920.
- Foto → 3D: Apple Object Capture exige Apple Silicon ou GPU AMD e várias fotos, então não roda aqui. TRELLIS exige CUDA. Stable Fast 3D usa a Stability Community License e precisa de GPU. Candidato viável: TripoSR (licença MIT, roda na CPU, lento, ~6 GB de RAM). Ainda não foi testado.
- Profundidade: Depth Anything V2 Small (Apache-2.0) via transformers. Ainda não foi rodado.

## Pendente
Fotos finais (só o pastel estava em geração), mapas de profundidade e teste 3D.

## Atualização
- pastel.jpg: gerado (DreamShaper 8 LCM, seed 7, 6 passos, cerca de 10 a 25 min na CPU) e ampliado para 1080x1920 com o sips. Ficou plausível, mas não tem camarão visível e passa de 6 unidades. É PROVISÓRIO.
- Os outros 6 pratos estão sendo gerados em segundo plano para _raw/ (log em _raw/gen.log), cerca de 10 min cada. Ainda falta ampliar e renomear.

## Estado final (03/11/2026)
- Fotos: 7 arquivos <nome>.jpg em 1080x1920 (DreamShaper 8 LCM, CreativeML OpenRAIL-M, gerados em 512x904 e ampliados com o sips). Fracas: coco (saiu como copo verde, não é o coco), peixe (parece cru, sem pirão), cartola (não mostra banana com queijo), pastel (sem camarão visível, mais de 6 unidades). Refações em _raw/*_s21.png: o coco ainda saiu como copo e o peixe_s21 não foi revisado.
- Profundidade: 7 arquivos <nome>-depth.png, PNG de 16 bits, branco = perto (Depth Anything V2 Small, Apache-2.0), cerca de 10 s cada na CPU.
- cardapio-3d.html: efeito 3D de foto única (paralaxe WebGL com mouse, giroscópio ou movimento automático) mais upload de 1 foto com profundidade calculada no navegador (transformers.js; 48 s neste Intel). Servir via HTTP (python3 -m http.server).
- TripoSR (MIT, CPU, sem GPU): 3d/pastel/0/mesh.glb, cerca de 59 min no total (5 min no pré-processamento/rembg, 12 min no modelo, 29 min no marching cubes via scikit-image, porque o torchmcubes não foi compilado). Qualidade não inspecionada visualmente. Coco interrompido, sem GLB.
