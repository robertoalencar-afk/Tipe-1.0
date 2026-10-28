#!/usr/bin/env python3
"""Gera as três propostas do selo Restaurante Fundador a partir do símbolo oficial da Tipe.

Uso: python3 gerar.py <caminho/tipe-simbolo.svg> <pasta de saída>
Cada proposta sai em: icone e assinatura completa, cada uma em cor (fundo claro),
cor (fundo escuro), uma cor preta e uma cor branca.
"""
import os, re, sys

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
D = re.search(r' d="([^"]+)"', open(src).read()).group(1)
# Caixa do símbolo no arquivo oficial (viewBox do tipe-simbolo.svg).
LX, LY, LW, LH = 62.3, 57.3, 141.1, 138.5

TEAL, NAVY, WHITE, BLACK = "#0FC9BD", "#021E34", "#FFFFFF", "#021E34"
FONT = "Sora, 'Manrope', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"


def leaf(cx, cy, size, fill, extra=""):
    k = size / max(LW, LH)
    return (f'<path fill="{fill}" fill-rule="evenodd" {extra} transform="translate({cx - LW * k / 2:.2f} {cy - LH * k / 2:.2f}) '
            f'scale({k:.5f}) translate({-LX} {-LY})" d="{D}"/>')


def svg(vb, body, title, mono=False):
    w, h = vb
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" role="img" aria-labelledby="t">'
            f'<title id="t">{title}</title>{body}</svg>\n')


# ---------- Ícones (120 x 120): o que aparece de 24 a 48 px ----------

def icon_a(mode):
    """Proposta A · Broto: o símbolo nascendo de uma linha de base, dentro do bloco da marca."""
    if mode in ("claro", "escuro"):
        tile, fg = (NAVY, TEAL) if mode == "claro" else (TEAL, NAVY)
        return (f'<rect x="4" y="4" width="112" height="112" rx="30" fill="{tile}"/>'
                + leaf(60, 52, 60, fg)
                + f'<rect x="32" y="90" width="56" height="7" rx="3.5" fill="{fg}"/>')
    c = BLACK if mode == "preto" else WHITE
    return ('<defs><mask id="ma"><rect width="120" height="120" fill="#fff"/>'
            + leaf(60, 52, 60, "#000")
            + '<rect x="32" y="90" width="56" height="7" rx="3.5" fill="#000"/></mask></defs>'
            + f'<rect x="4" y="4" width="112" height="112" rx="30" fill="{c}" mask="url(#ma)"/>')


def icon_b(mode):
    """Proposta B · Encontro: dois blocos sobrepostos, o do restaurante (contorno) e o da Tipe
    (cheio, com o símbolo). Duas partes juntas, nenhuma por cima da outra como carimbo."""
    back = '<rect x="8" y="8" width="70" height="70" rx="20" fill="none" stroke-width="10" {s}/>'
    front = '<rect x="40" y="40" width="74" height="74" rx="22" {f}/>'
    if mode in ("claro", "escuro"):
        line, tile, fg = (NAVY, TEAL, NAVY) if mode == "claro" else (WHITE, TEAL, NAVY)
        return (back.format(s=f'stroke="{line}"') + front.format(f=f'fill="{tile}"') + leaf(77, 77, 46, fg))
    c = BLACK if mode == "preto" else WHITE
    return ('<defs><mask id="mb"><rect width="120" height="120" fill="#fff"/>'
            '<rect x="33" y="33" width="88" height="88" rx="28" fill="#000"/></mask>'
            '<mask id="mb2"><rect width="120" height="120" fill="#fff"/>' + leaf(77, 77, 46, "#000") + '</mask></defs>'
            + back.format(s=f'stroke="{c}" mask="url(#mb)"')
            + front.format(f=f'fill="{c}" mask="url(#mb2)"'))


def icon_c(mode):
    """Proposta C · Alicerce: o símbolo sobre dois blocos de base, a pedra fundamental."""
    if mode in ("claro", "escuro"):
        base = NAVY if mode == "claro" else WHITE
        lf = TEAL
    else:
        base = lf = BLACK if mode == "preto" else WHITE
    return (leaf(60, 44, 62, lf)
            + f'<rect x="30" y="82" width="60" height="12" rx="4" fill="{base}"/>'
            + f'<rect x="14" y="99" width="92" height="13" rx="4" fill="{base}"/>')


# ---------- Assinaturas completas: de 128 a 512 px ----------

def text_color(mode):
    return {"claro": (NAVY, "#3B5268"), "escuro": (WHITE, "#B9C6D3"),
            "preto": (BLACK, BLACK), "branco": (WHITE, WHITE)}[mode]


def full_horizontal(icon_body, mode, ident):
    main, sub = text_color(mode)
    accent = TEAL if mode in ("claro", "escuro") else main
    icon = icon_body.replace('id="ma"', f'id="ma{ident}"').replace("url(#ma)", f"url(#ma{ident})") \
                    .replace('id="mb"', f'id="mb{ident}"').replace("url(#mb)", f"url(#mb{ident})") \
                    .replace('id="mb2"', f'id="mb2{ident}"').replace("url(#mb2)", f"url(#mb2{ident})")
    return (f'<g transform="translate(8 10)">{icon}</g>'
            f'<text x="148" y="66" font-family="{FONT}" font-size="34" font-weight="600" fill="{main}" letter-spacing="-0.4">Restaurante</text>'
            f'<text x="148" y="104" font-family="{FONT}" font-size="34" font-weight="700" fill="{main}" letter-spacing="-0.4">Fundador</text>'
            f'<rect x="316" y="91" width="3" height="16" rx="1.5" fill="{accent}"/>'
            f'<text x="328" y="104" font-family="{FONT}" font-size="17" font-weight="500" fill="{sub}">com a Tipe</text>')


def full_vertical(icon_body, mode):
    main, sub = text_color(mode)
    return (f'<g transform="translate(70 6)">{icon_body}</g>'
            f'<text x="130" y="160" text-anchor="middle" font-family="{FONT}" font-size="15" font-weight="700" fill="{main}" letter-spacing="2.6">RESTAURANTE</text>'
            f'<text x="130" y="186" text-anchor="middle" font-family="{FONT}" font-size="22" font-weight="700" fill="{main}" letter-spacing="1.2">FUNDADOR</text>'
            f'<text x="130" y="210" text-anchor="middle" font-family="{FONT}" font-size="13" font-weight="500" fill="{sub}">com a Tipe</text>')


PROPOSALS = {
    "a-broto": ("Proposta A · Broto", icon_a, "h"),
    "b-encontro": ("Proposta B · Encontro", icon_b, "h"),
    "c-alicerce": ("Proposta C · Alicerce", icon_c, "v"),
}
MODES = ["claro", "escuro", "preto", "branco"]

for key, (name, icon, layout) in PROPOSALS.items():
    for mode in MODES:
        title = f"Restaurante Fundador com a Tipe · {name}"
        open(f"{out}/{key}-icone-{mode}.svg", "w").write(svg((120, 120), icon(mode), title))
        if layout == "h":
            body = full_horizontal(icon(mode), mode, key[0])
            open(f"{out}/{key}-completo-{mode}.svg", "w").write(svg((440, 140), body, title))
        else:
            open(f"{out}/{key}-completo-{mode}.svg", "w").write(svg((260, 220), full_vertical(icon(mode), mode), title))
print("ok", len(os.listdir(out)), "arquivos")
