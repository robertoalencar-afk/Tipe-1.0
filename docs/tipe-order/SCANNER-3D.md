# Scanner 3D de pratos

O restaurante grava o prato de verdade com o celular e a Tipe monta um modelo 3D fotográfico
(malha com a textura das próprias fotos, mesa incluída) para o cardápio do cliente.

## Fluxo

1. **Gestão → Cardápio → Scanner 3D** (`Scanner3D.tsx`, só o dono). Escolhe o prato e grava um
   vídeo de 40 a 60 s dando duas voltas (uma baixa, uma mais alta) ou envia de 20 a 150 fotos.
2. **No celular** (`src/lib/tipe/scanner/`): o vídeo é amostrado (3 candidatos por quadro), cada
   candidato recebe nota de nitidez (variância do laplaciano) e fica o mais nítido de cada trecho.
   Saem até 60 JPEG de 1600 px. Trecho tremido demais é descartado.
3. **Envio** (`scanner3d.functions.ts`): `iniciarScan` cria a linha em `menu_item_scans` e devolve
   URLs assinadas do bucket privado `scans-3d`; as fotos vão direto ao Storage (4 por vez, com
   nova tentativa). `concluirEnvioScan` confere quantas chegaram e põe na fila.
4. **Reconstrução** (`.github/workflows/scanner-3d.yml` → `scripts/scanner-3d/fila.mjs` →
   `reconstruir.sh`), só CPU e software livre:
   - COLMAP 3.9 (BSD): pontos SIFT, pares, posição das câmeras. Se menos de 60% das fotos se
     encaixam, o scan vira "erro" com o motivo para a equipe.
   - OpenMVS 2.3 (AGPL-3.0, roda como programa separado no CI, nada dele vai para o site):
     nuvem densa, malha.
   - `montar.py recortar`: acha o ponto para onde as câmeras olham (o prato), ajusta o plano da
     mesa (RANSAC) e recorta um disco de mesa em volta do prato. Recortar antes da textura faz a
     textura de 4096 px gastar resolução só no prato.
   - OpenMVS TextureMesh (≈150 mil faces) → `montar.py alinhar` (mesa na horizontal, y=0, disco de
     ~44 cm) → gltf-transform (textura WebP). O `.glb` vai para o bucket público `modelos-3d`.
5. **Revisão**: o scan fica "Pronto para revisar"; o dono gira o modelo no Gestão e toca em
   "Publicar no cardápio", que grava `pdv_menu_items.model_url`. O cardápio do cliente
   (`MesaPedido` → `StoryCardapio`) já mostra "Ver em 3D" e "Ver na minha mesa" (AR) com o
   `<model-viewer>`. "Tirar do cardápio" limpa o `model_url` e apaga as fotos.

## Quando roda

- Na hora, se o Worker tiver o segredo `GITHUB_SCANNER_TOKEN` (token fine-grained deste
  repositório com permissão **Actions: write**; o deploy envia para o Worker se existir no
  ambiente `producao`).
- Sem o token, o agendamento do workflow (a cada 6 h) pega a fila. Também dá para rodar à mão em
  Actions → Scanner 3D.
- Prato preso em "processando" por mais de 3 h volta para a fila.

## Custo e tempo

- Grátis: minutos do GitHub Actions do plano. Medido aqui (4 vCPU): 50 fotos → ~12 min
  (COLMAP 3 min, nuvem densa 7 min, malha e textura 2 min). O runner de repositório privado tem
  menos CPU: conte 20 a 40 min por prato. A primeira rodada compila o OpenMVS (~5 min, depois fica
  em cache).
- Uma rodada sem prato na fila gasta ~1 min de Actions (4 por dia no agendamento).
- Se quiser mais rápido ou o visual Gaussian splat (mais fotográfico ainda), o caminho é GPU paga
  (decisão do Roberto, com custo antes).

## Teste feito

Conjunto público "fox" (50 fotos de celular, instant-ngp, NVIDIA): 50/50 câmeras, `.glb` de
4,2 MB, 150 mil faces, textura fotográfica, mesa alinhada e recortada em disco. A separação de
quadros foi testada no Chromium com um vídeo: 60 quadros JPEG.

## Dicas de captura (estão na tela)

Prato no centro, luz clara sem sombra dura, não mexer no prato, prato inteiro sempre na tela,
duas voltas devagar. Prato brilhante (caldo, calda) e vidro reconstroem pior.
