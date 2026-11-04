# Modelos 3D de exemplo

- `abacate.glb`: "Avocado" do Khronos glTF-Sample-Assets, de Microsoft (2017), licença CC0-1.0 (domínio público). As texturas foram reduzidas para 1024 px e convertidas para WebP com `@gltf-transform/cli` (8,1 MB → 75 KB). Serve só de exemplo no simulador; os pratos reais virão da Fase 6 e da Fase 7 (Tipe 3D Studio).

O `public/vendor/model-viewer/model-viewer.min.js` é o `@google/model-viewer` 4.0.0, licença Apache-2.0 (veja o LICENSE na mesma pasta).

- `pastel-triposr.glb`: gerado de graça a partir de uma única foto (pastel-1080.webp) com o TripoSR (licença MIT), na CPU do Mac do Roberto. É teste de qualidade: a forma é reconhecível, mas a textura é simples.

As fotos `src/assets/cardapio/*-1080.webp` foram geradas localmente com DreamShaper 8 LCM (CreativeML OpenRAIL-M), e os mapas `*-depth.png` com Depth Anything V2 Small (Apache-2.0). Detalhes em docs/tipe-order/cardapio-story/FOTOS-PROMPTS.md. O peixe e o coco seguem com recortes do casting, porque as versões geradas saíram erradas (peixe cru e coco como vitamina).

- `pastel-360.glb`: gerado de graça a partir de uma única foto (pastel-1080.webp, fundo removido com rembg) com o TRELLIS (Microsoft, licença MIT), no Space público `trellis-community/TRELLIS` (ZeroGPU), e compactado com `@gltf-transform/cli` (1,44 MB → 220 KB, textura WebP 1024). Detalhes em docs/tipe-order/cardapio-story/360/RELATORIO-360.md.
