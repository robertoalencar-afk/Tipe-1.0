#!/usr/bin/env bash
# Pós-processa os renders do HyperFrames (60 quadros/s) nos arquivos da landing:
# junta cada par de quadros (tmix, desfoque de movimento natural) em 30 quadros/s e codifica MP4 + WebM + pôster.
# Uso: ./finalizar.sh <pasta-dos-renders> <saida>
set -euo pipefail
R=$1; O=$2; mkdir -p "$O"
for ar in 16x9 4x5; do
  vf="tmix=frames=2,fps=30"; sc=""
  if [ $ar = 4x5 ]; then vf="$vf,scale=864:1080:flags=lanczos"; sc=",scale=864:1080:flags=lanczos"; fi
  ffmpeg -v error -y -i "$R/hf-$ar.mp4" -vf "$vf" -c:v libx264 -preset veryslow -crf 23 -pix_fmt yuv420p -tune animation -movflags +faststart -an "$O/lebre-tartaruga-$ar.mp4"
  ffmpeg -v error -y -i "$R/hf-$ar.mp4" -vf "$vf" -c:v libvpx-vp9 -b:v 0 -crf 34 -row-mt 1 -deadline good -cpu-used 1 -pix_fmt yuv420p -an "$O/lebre-tartaruga-$ar.webm"
  # pôster: a lebre com o celular, balão de aprovado já na tela
  ffmpeg -v error -y -ss 6.3 -i "$R/hf-$ar.mp4" -frames:v 1 -vf "null$sc" -c:v libwebp -quality 80 "$O/poster-$ar.webp"
done
ls -la "$O"
