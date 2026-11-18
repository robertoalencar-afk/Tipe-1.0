#!/usr/bin/env bash
# Fotos de um prato -> modelo 3D (.glb) com textura real. Só CPU, só software livre:
# COLMAP (BSD) acha as câmeras, OpenMVS (AGPL, roda como programa separado) monta a malha
# texturizada e montar.py alinha a mesa, recorta em volta do prato e exporta o .glb.
#
#   scripts/scanner-3d/reconstruir.sh PASTA_FOTOS PASTA_TRABALHO SAIDA.glb
set -euo pipefail
FOTOS="$(realpath "$1")"; W="$(realpath -m "$2")"; SAIDA="$(realpath -m "$3")"
MVS="${OPENMVS_BIN:-$HOME/openmvs/bin/OpenMVS}"
AQUI="$(cd "$(dirname "$0")" && pwd)"
N=$(find "$FOTOS" -maxdepth 1 -iname '*.jpg' | wc -l)
mkdir -p "$W/sparse" "$W/dense"
t0=$(date +%s); passo() { echo "[$(( $(date +%s) - t0 ))s] $*"; }

passo "COLMAP: pontos-chave ($N fotos)"
colmap feature_extractor --database_path "$W/db.db" --image_path "$FOTOS" \
  --ImageReader.single_camera 1 --ImageReader.camera_model OPENCV \
  --SiftExtraction.use_gpu 0 --SiftExtraction.max_image_size 1600 --SiftExtraction.max_num_features 4096 >"$W/log-features.txt" 2>&1
passo "COLMAP: pares"
if [ "$N" -le 90 ]; then
  colmap exhaustive_matcher --database_path "$W/db.db" --SiftMatching.use_gpu 0 >"$W/log-match.txt" 2>&1
else
  colmap sequential_matcher --database_path "$W/db.db" --SiftMatching.use_gpu 0 --SequentialMatching.overlap 15 >"$W/log-match.txt" 2>&1
fi
passo "COLMAP: câmeras"
colmap mapper --database_path "$W/db.db" --image_path "$FOTOS" --output_path "$W/sparse" >"$W/log-mapper.txt" 2>&1
# Fica com o maior modelo (o mapper pode quebrar em pedaços).
MAIOR=$(for d in "$W"/sparse/*/; do colmap model_analyzer --path "$d" 2>&1 | awk -v d="$d" '/Registered images/{print $NF, d}'; done | sort -n | tail -1)
REG=${MAIOR%% *}; MODELO=${MAIOR#* }
passo "câmeras encontradas: $REG de $N"
if [ -z "$REG" ] || [ "$REG" -lt $(( N * 6 / 10 )) ]; then
  echo "ERRO: só ${REG:-0} de $N fotos se encaixaram. Grave mais devagar, com mais luz e o prato sempre na tela." >&2
  exit 3
fi
colmap image_undistorter --image_path "$FOTOS" --input_path "$MODELO" --output_path "$W/dense" \
  --output_type COLMAP --max_image_size 1600 >"$W/log-undistort.txt" 2>&1
colmap model_converter --input_path "$W/dense/sparse" --output_path "$W/dense/sparse" --output_type TXT >/dev/null 2>&1

cd "$W"
passo "OpenMVS: cena"
"$MVS/InterfaceCOLMAP" -i dense -o scene.mvs --image-folder dense/images -w "$W" >log-mvs.txt 2>&1
passo "OpenMVS: nuvem densa"
"$MVS/DensifyPointCloud" scene.mvs --resolution-level 1 --max-resolution 1600 --estimate-roi 2 --crop-to-roi 1 \
  --remove-dmaps 1 -w "$W" >>log-mvs.txt 2>&1
passo "OpenMVS: malha"
"$MVS/ReconstructMesh" scene_dense.mvs -p scene_dense.ply --smooth 1 -w "$W" >>log-mvs.txt 2>&1
passo "separando o prato da mesa"
RECORTE=$(python3 -I "$AQUI/montar.py" recortar --malha "$W/scene_dense_mesh.ply" --colmap "$W/dense/sparse" --saida "$W/recorte.ply" \
  --transformacao "$W/T.json" --modo "${MODO:-prato}")
echo "$RECORTE"
FACES=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["faces"])' "$RECORTE")
DECIMAR=$(python3 -c "print(min(1.0, round(${FACES_ALVO:-150000}/$FACES, 4)))")
passo "OpenMVS: textura com as fotos"
"$MVS/TextureMesh" scene_dense.mvs -m recorte.ply --export-type glb --decimate "$DECIMAR" \
  --max-texture-size 4096 -o textured.mvs -w "$W" >>log-mvs.txt 2>&1
passo "alinhando a mesa"
python3 -I "$AQUI/montar.py" alinhar --malha "$W/textured.glb" --colmap "$W/dense/sparse" --saida "$W/alinhado.glb" --transformacao "$W/T.json"
passo "comprimindo (textura webp)"
npx --yes @gltf-transform/cli@4.1.1 webp "$W/alinhado.glb" "$W/webp.glb" --quality 88 >/dev/null
npx --yes @gltf-transform/cli@4.1.1 resize "$W/webp.glb" "$SAIDA" --width 4096 --height 4096 >/dev/null
passo "pronto: $(du -h "$SAIDA" | cut -f1)"
