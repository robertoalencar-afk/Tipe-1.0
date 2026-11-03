#!/usr/bin/env bash
# Pós-processa os renders do HyperFrames (30 quadros/s) nos arquivos da landing:
# V9: o render já sai em 30 quadros/s (sem tmix, que deixava rastro em movimentos rápidos); codifica MP4 + WebM + pôster.
# Uso: ./finalizar.sh <pasta-dos-renders> <saida>
set -euo pipefail
R=$1; O=$2; mkdir -p "$O"
for ar in 16x9 4x5; do
  vf="null"; sc=""
  if [ $ar = 4x5 ]; then vf="$vf,scale=864:1080:flags=lanczos"; sc=",scale=864:1080:flags=lanczos"; fi
  ffmpeg -v error -y -i "$R/hf-$ar.mp4" -vf "$vf" -c:v libx264 -preset veryslow -crf 19 -pix_fmt yuv420p -tune animation -movflags +faststart -an "$O/lebre-tartaruga-$ar.mp4"
  ffmpeg -v error -y -i "$R/hf-$ar.mp4" -vf "$vf" -c:v libvpx-vp9 -b:v 0 -crf 30 -row-mt 1 -deadline good -cpu-used 1 -pix_fmt yuv420p -an "$O/lebre-tartaruga-$ar.webm"
  # pôster: a lebre com o celular, balão de aprovado já na tela
  ffmpeg -v error -y -ss 9.0 -i "$R/hf-$ar.mp4" -frames:v 1 -vf "null$sc" -c:v libwebp -quality 80 "$O/poster-$ar.webp"
done
ls -la "$O"
