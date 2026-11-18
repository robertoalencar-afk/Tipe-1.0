#!/usr/bin/env bash
# Instala COLMAP (apt) e compila o OpenMVS (CPU) no Ubuntu 24.04. Usado pelo workflow scanner-3d.yml.
# _FORTIFY_SOURCE desligado: com ele o DensifyPointCloud v2.3.0 aborta ("buffer overflow detected") no Ubuntu 24.04.
# PREFIXO padrão: $HOME/openmvs. Se $PREFIXO/bin/OpenMVS/DensifyPointCloud já existe (cache), só instala o apt.
set -euo pipefail
PREFIXO="${PREFIXO:-$HOME/openmvs}"
OPENMVS_TAG="${OPENMVS_TAG:-v2.3.0}"
SUDO=""; [ "$(id -u)" -ne 0 ] && SUDO="sudo"
export DEBIAN_FRONTEND=noninteractive
$SUDO apt-get update -qq
$SUDO apt-get install -y -qq colmap imagemagick ffmpeg \
  libboost-iostreams-dev libboost-program-options-dev libboost-system-dev libboost-serialization-dev \
  libopencv-dev libcgal-dev libeigen3-dev libjpeg-dev libpng-dev libtiff-dev libglu1-mesa-dev \
  cmake git build-essential >/dev/null
if [ -x "$PREFIXO/bin/OpenMVS/DensifyPointCloud" ]; then echo "OpenMVS em cache"; exit 0; fi
TMP="$(mktemp -d)"
git clone -q --depth 1 https://github.com/cdcseacave/VCG.git "$TMP/vcg"
git clone -q --depth 1 --branch "$OPENMVS_TAG" --recurse-submodules https://github.com/cdcseacave/openMVS.git "$TMP/openmvs"
cmake -S "$TMP/openmvs" -B "$TMP/build" -DCMAKE_BUILD_TYPE=Release -DVCG_ROOT="$TMP/vcg" \
  -DCMAKE_INSTALL_PREFIX="$PREFIXO" -DOpenMVS_USE_CUDA=OFF -DOpenMVS_BUILD_VIEWER=OFF \
  -DOpenMVS_USE_PYTHON=OFF -DCMAKE_CXX_FLAGS="-U_FORTIFY_SOURCE -D_FORTIFY_SOURCE=0" >/dev/null
cmake --build "$TMP/build" -j"$(nproc)" >/dev/null
cmake --install "$TMP/build" >/dev/null
ls "$PREFIXO/bin/OpenMVS"
