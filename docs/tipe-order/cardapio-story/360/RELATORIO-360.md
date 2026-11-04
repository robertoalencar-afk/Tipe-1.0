# Prato 3D 360° a partir de uma única foto (Parte B)

Data: 04/11/2026. Executado no Mac do Roberto (Intel i5, 8 GB), só com ferramentas gratuitas, sem login e sem chave nova.

## Resultado

| Prato | Arquivo | Origem | Tamanho | Situação |
|---|---|---|---|---|
| Pastel | `public/modelos/pastel-360.glb` | TRELLIS (Space `trellis-community/TRELLIS`, ZeroGPU) | 220 KB (1,44 MB antes de compactar) | Pronto |
| Cartola | não gerado | — | — | Pendente (veja Bloqueios) |

Vistas do pastel (renderizadas com o `model-viewer` do repositório no Chrome headless): `pastel-trellis-frente.png`, `-45.png`, `-lado.png`, `-topo.png` e o mosaico `pastel-trellis-4vistas.png`. Entrada depois de tirar o fundo: `entrada-sem-fundo.png`.

## O que rodou

1. **Pré-processamento:** rembg (`isnet-general-use`) no venv `~/.venvs/tipe-img`, recorte quadrado com cerca de 15% de margem, 1024 px, uma versão com fundo transparente e outra com fundo branco. Cerca de 1 minuto.
2. **TRELLIS** (`trellis-community/TRELLIS`, endpoint `/generate_and_extract_glb`, seed 0, 12+12 passos, simplificação 0,95, textura 1024):
   - pastel: OK em cerca de 1 minuto;
   - cartola: bloqueada pela cota anônima do ZeroGPU ("exceeded your ZeroGPU quota… Try again in 23:59"). A cota é por IP e vale para todos os Spaces.
   - `JeffreyXiang/TRELLIS`: Space em CONFIG_ERROR.
3. **Hunyuan3D-2** (`tencent/Hunyuan3D-2`, `/generation_all` com textura): falhou no servidor com `NameError`. O `tencent/Hunyuan3D-2.1` pede 270 s de GPU, acima do limite gratuito (só com PRO), então foi pulado.
4. **SF3D** (`stabilityai/stable-fast-3d`, `/run_button`): erro genérico do app (sem detalhes, e consumiu cerca de 14 s da cota). O `stabilityai/stable-point-aware-3d` (SPAR3D) está em BUILD_ERROR.
5. **TripoSR local** (mc-resolution 320, foreground-ratio 0,85, bake de textura 1024), só para a cartola: o modelo carregou em cerca de 2,7 min e a inferência levou cerca de 5,2 min, mas a extração da malha travou por falta de memória (9,3 GB de swap em 8 GB de RAM). Reiniciei com 256 e chunk 2048, mas interrompi porque o Roberto pediu para publicar como está.
6. **Compactação:** `@gltf-transform/cli optimize` com weld, simplify (ratio 0,85, erro 0,0005), textura em WebP com 1024 px e sem meshopt/draco, para abrir sem decodificador extra. O pastel passou de 1,44 MB para 220 KB sem diferença visível nas vistas.

## Qualidade

- **Pastel (TRELLIS):** a forma e a textura batem com a foto: a fileira de pastéis em meia-lua, a borda dourada e o recheio claro aparecem no corte lateral. É bem superior ao `pastel-triposr.glb` anterior, que tinha textura simples. Defeitos: há um pequeno filete escuro solto atrás da fileira (visível no lado e no topo), e a cor fica um pouco mais saturada no render. Como a foto mostrava vários pastéis enfileirados, o 3D também é uma fileira. Para ter um pastel único, a foto precisa mostrar só um.
- **Cartola:** sem resultado nesta rodada.

## Licenças

- **TRELLIS** (Microsoft): MIT. Pode ser usado comercialmente.
- **Hunyuan3D-2 / 2.1** (Tencent): Tencent Hunyuan 3D Community License. Não vale na União Europeia, no Reino Unido nem na Coreia do Sul, e tem limite de usuários mensais para uso comercial. Não foi usado no resultado.
- **SF3D / SPAR3D** (Stability AI): Stability AI Community License. Gratuito para receita anual abaixo de US$ 1 milhão; acima disso exige licença Enterprise. Não foi usado no resultado.
- **TripoSR**: MIT.
- **rembg**: MIT. O modelo isnet-general-use é Apache-2.0.

## Bloqueios e próximo passo para a cartola

- A cota anônima do ZeroGPU renova em cerca de 24 h (a partir de 05/11, por volta das 10h de Brasília). Para fazer a cartola depois, rode de novo o TRELLIS com o mesmo script; é o caminho de melhor qualidade. Com uma conta gratuita do Hugging Face a cota aumenta, mas isso exigiria um token, o que ficou fora do escopo.
- Também dá para tentar o TripoSR local com mc-resolution 192–256, fechando o Chrome e a VM antes para liberar RAM.

## Dicas de foto que ajudam

- **Um prato só e inteiro no quadro**, sem cortar a borda. A cartola tem o prato cortado na margem esquerda, o que atrapalha a reconstrução.
- **Ângulo de 30–45°**, nem de cima nem de frente: o modelo deduz altura e profundidade melhor assim.
- **Fundo liso e contrastante** e luz difusa sem sombra dura: o rembg separa melhor, e a textura sai sem sombra "pintada".
- **Evite repetição** (vários itens enfileirados): o modelo replica o que vê.
- Uma resolução de 1024 px depois do recorte basta. Mais pixels não melhoram o resultado.
