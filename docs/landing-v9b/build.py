# Estilo B do filme "A lebre e a tartaruga": a corrida da conta, em motion graphics (HyperFrames).
# Sem cenário ilustrado: fundo creme da marca, tipografia cinética, uma pista de corrida e os mascotes
# oficiais inteiros (recortes PNG que só andam, pulam e giram inteiros, nada é deformado), mais as telas reais.
# Uso: python3 build.py <pasta-com-assets-dos-sprites> <saida>
import os, shutil, sys
AQUI = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.abspath(os.path.join(AQUI, '../..')) + '/'
SPR, OUT = sys.argv[1], sys.argv[2]
DUR = 20.0
for ar, (W, H) in {'16x9': (1600, 900), '4x5': (1080, 1350)}.items():
    d = f'{OUT}/lebre-b-{ar}'
    if os.path.exists(d): shutil.rmtree(d)
    shutil.copytree(SPR, f'{d}/assets')
    for sub in ('fonts', 'telas', 'vendor'): os.makedirs(f'{d}/assets/{sub}', exist_ok=True)
    shutil.copy(REPO + 'docs/landing-v5/video-lebre/inter-tight-latin-var.woff2', f'{d}/assets/fonts/inter-tight.woff2')
    shutil.copy(REPO + 'node_modules/gsap/dist/gsap.min.js', f'{d}/assets/vendor/gsap.min.js')
    for f in ('tipe-logo.svg', 'tipe-logo-branco.svg'): shutil.copy(REPO + 'src/assets/marca/' + f, f'{d}/assets/{f}')
    for k in ('conta', 'metodos', 'pago'): shutil.copy(REPO + f'src/assets/telas-reais/{k}-780.webp', f'{d}/assets/telas/{k}.webp')
    css = open(os.path.join(AQUI, 'estilo.css')).read().replace('__W__', str(W)).replace('__H__', str(H))
    js = open(os.path.join(AQUI, 'cenas.js')).read()
    html = f'''<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>A corrida da conta · Tipe</title>
<style>{css}</style>
<script src="assets/vendor/gsap.min.js"></script>
</head>
<body>
<div id="root" data-composition-id="lebre-b" data-start="0" data-duration="{DUR}" data-width="{W}" data-height="{H}" data-fps="30">
<div id="stage">
  <img id="logoTop" src="assets/tipe-logo.svg" alt="Tipe">
  <!-- 1: a espera -->
  <div class="cena" id="c1">
    <div class="eyebrow" id="c1eb"><i></i><span>A tartaruga</span></div>
    <div class="titulo" id="c1t"><span class="w">Pediu</span> <span class="w">a</span> <span class="w">conta.</span></div>
    <div class="relogio" id="c1r"><span id="c1min">00</span><b>:</b><span id="c1seg">00</span></div>
    <div class="legenda" id="c1l">e a maquininha estava na <em>mesa 9</em>.</div>
    <img class="spr" id="c1tart" src="assets/tartaruga-garcom.png" alt="">
  </div>
  <!-- 2: a corrida -->
  <div class="cena" id="c2">
    <div class="titulo menor" id="c2t"><span class="w">A</span> <span class="w">corrida</span> <span class="w">da</span> <span class="w hl">conta<span class="ul"></span></span></div>
    <div class="pista" id="p1"><div class="rot">Maquininha</div><div class="faixa"></div><div class="chegada"></div><div class="tempo" id="p1t">0 min</div></div>
    <div class="pista" id="p2"><div class="rot tq">Tipe</div><div class="faixa"></div><div class="chegada"></div><div class="tempo tq" id="p2t">0 s</div></div>
    <img class="spr" id="c2tart" src="assets/tartaruga-garcom.png" alt="">
    <img class="spr" id="c2lebre" src="assets/lebre-correndo.png" alt="">
    <div id="vel"><i></i><i></i><i></i></div>
    <div id="estouro"></div>
  </div>
  <!-- 3: o celular -->
  <div class="cena" id="c3">
    <div class="eyebrow" id="c3eb"><i class="tq"></i><span>A lebre, com a Tipe</span></div>
    <div class="passos" id="c3p"><div class="p" id="s1">Confira.</div><div class="p" id="s2">Escolha.</div><div class="p" id="s3">Pague.</div></div>
    <div id="fone"><div class="tela"><img id="t0" src="assets/telas/conta.webp" alt=""><img id="t1" src="assets/telas/metodos.webp" alt=""><img id="t2" src="assets/telas/pago.webp" alt=""><div id="toque"></div></div></div>
    <img class="spr" id="c3lebre" src="assets/lebre-celular.png" alt="">
  </div>
  <!-- 4: dividir -->
  <div class="cena" id="c4">
    <div class="titulo" id="c4t"><span class="w">Dividiu</span> <span class="w">em</span> <span class="w">três.</span></div>
    <div class="legenda" id="c4l">Cada um paga a sua parte, do próprio celular.</div>
    <div class="fatias" id="fat">
      <div class="fatia"><b>R$ 118,80</b><span>Pix</span></div>
      <div class="fatia"><b>R$ 118,80</b><span>Apple Pay</span></div>
      <div class="fatia"><b>R$ 118,80</b><span>Google Pay</span></div>
    </div>
    <img class="spr" id="c4lebre" src="assets/lebre-brinde.png" alt="">
  </div>
  <!-- 5: moral -->
  <div class="cena" id="c5">
    <img class="spr" id="c5lebre" src="assets/lebre-comemorando.png" alt="">
    <div class="eyebrow centro" id="c5eb"><i class="tq"></i><span>Moral da história</span></div>
    <div class="titulo centro" id="c5t"><span class="w">Quem</span> <span class="w">não</span> <span class="w">espera,</span> <span class="w hl">ganha.<span class="ul"></span></span></div>
    <div id="confete"></div>
  </div>
  <!-- 6: assinatura -->
  <div id="fim"><div id="iris"></div><img id="fimLogo" src="assets/tipe-logo-branco.svg" alt="Tipe">
    <div id="fimTag"><span class="w" id="g1">Pague.</span> <span class="w tq" id="g2">Sem esperar.</span></div></div>
  <div id="barra"><div id="barraF"></div></div>
</div>
</div>
<script>
const W = {W}, H = {H}, AR = '{ar}', DUR = {DUR};
{js}
window.__timelines = window.__timelines || {{}};
window.__timelines['lebre-b'] = tl;
</script>
</body>
</html>
'''
    open(f'{d}/index.html', 'w').write(html)
    print(d, len(html))
