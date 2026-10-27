#!/usr/bin/env python3
"""Copia as cenas do casting (versão final mais recente de cada formato) para src/assets/cenas.

Origem: /mnt/project-files/casting-tipe/cenas/<id>/<id>_<formato>_final_vN.jpg (4K, Gemini, telas reais
aplicadas por código). Saída: src/assets/cenas/cena-<nome>[-vertical|-larga]-<largura>.webp, nunca ampliada.
Rode de novo sempre que a thread do casting publicar versões novas.
"""
import glob, os, re, sys
from PIL import Image

ORIGEM = sys.argv[1] if len(sys.argv) > 1 else "/mnt/project-files/casting-tipe/cenas"
DESTINO = os.path.join(os.path.dirname(__file__), "..", "src", "assets", "cenas")
NOMES = {
    "01-casal-qr": "casal", "02-amigos-dividindo": "amigos", "03-familia-domingo": "familia",
    "04-executiva-saindo": "executiva", "05-praia-barraca": "praia", "06-garcom-salao": "garcom",
    "07-garconete-celular": "garconete", "08-gerente-tablet": "gerente", "09-caixa-calmo": "caixa",
    "10-cozinha-chef": "cozinha", "11-bartender-caipirinha": "bartender", "12-dono-notebook": "dono",
    "13-mesa-liberada": "mesa-liberada",
}
FORMATOS = {"4x5": "", "9x16": "-vertical", "16x9": "-larga"}
LARGURAS = {"4x5": (800, 1600), "9x16": (720, 1440), "16x9": (1200, 2400)}

os.makedirs(DESTINO, exist_ok=True)
for pasta, nome in NOMES.items():
    for fmt, sufixo in FORMATOS.items():
        achados = glob.glob(f"{ORIGEM}/{pasta}/{pasta}_{fmt}_final_v*.jpg")
        if not achados:
            continue
        ultimo = max(achados, key=lambda f: int(re.search(r"_v(\d+)\.jpg$", f).group(1)))
        im = Image.open(ultimo).convert("RGB")
        for w in LARGURAS[fmt]:
            if w > im.width:
                continue
            c = im.copy()
            c.thumbnail((w, 100000), Image.LANCZOS)
            c.save(f"{DESTINO}/cena-{nome}{sufixo}-{w}.webp", "WEBP", quality=80, method=6)
        print(f"cena-{nome}{sufixo}: {os.path.basename(ultimo)}")
