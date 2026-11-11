# Monta os projetos HyperFrames (16x9 e 4x5) da V8 de "A lebre e a tartaruga": a corrida contra o tempo.
# Uso: python3 build8.py <pasta-com-assets-de-camadas.py+recortes.py> <saida>
import json, os, shutil, sys
AQUI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(AQUI, '../../..')) + '/'
CAM, OUT = sys.argv[1], sys.argv[2]
rig = json.load(open(f'{CAM}/assets/rig.json'))
rd = lambda f: open(os.path.join(AQUI, f)).read()
css, motor, pers = rd('estilo.css'), rd('motor.js'), rd('personagens.js')


def cena(nome, host, pid):
    m = rig[nome]
    filhos, tampas = {}, {}
    for p in m['partes']: filhos.setdefault(p['pai'], []).append(p)
    for t in m['tampas']: tampas.setdefault(t['pai'], []).append(t)

    def parte(p):
        # transform-origin = pivô anatômico (pescoço, base da orelha, cotovelo, pés)
        h = (f'<div class="parte" id="{p["id"]}" style="left:{p["x"]}px;top:{p["y"]}px;width:{p["w"]}px;height:{p["h"]}px;transform-origin:{p["px"]}px {p["py"]}px">'
             f'<img src="assets/partes/{p["id"]}.png" alt="">')
        for t in tampas.get(p['id'], []):
            clip = ','.join(f'{x}px {y}px' for x, y in t['clip'])
            h += (f'<div class="tampa" style="left:{t["x"]}px;top:{t["y"]}px;width:{t["w"]}px;height:{t["h"]}px;clip-path:polygon({clip})">'
                  f'<img id="{t["id"]}-pele" src="assets/partes/{t["id"]}.png" style="top:{-t["h"]}px" alt="">')
            if t['arco']:
                w, hh = t['w'], t['h']
                h += (f'<svg id="{t["id"]}-arco" class="arco" viewBox="0 0 {w} {hh}" width="{w}" height="{hh}">'
                      f'<path d="M{w*0.08:.1f} {hh*0.52:.1f} Q{w/2:.1f} {hh*0.86:.1f} {w*0.92:.1f} {hh*0.52:.1f}" fill="none" stroke="#24232a" stroke-width="2.1" stroke-linecap="round"/></svg>')
            h += '</div>'
        for f in filhos.get(p['id'], []): h += parte(f)
        return h + '</div>'

    inner = ''.join(parte(p) for p in filhos.get(None, []))
    if nome == 'T-cliente':
        cx, cy = m['relogio']['c']
        inner += (f'<svg class="relogio" style="left:{cx-50}px;top:{cy-50}px" width="100" height="100" viewBox="-50 -50 100 100">'
                  '<line id="t-hora" x1="0" y1="2" x2="0" y2="-24" stroke="#20190f" stroke-width="4.2" stroke-linecap="round" transform="rotate(124)"/>'
                  '<line id="t-minuto" x1="0" y1="3" x2="0" y2="-35" stroke="#1d170e" stroke-width="3.4" stroke-linecap="round"/>'
                  '<circle r="3.6" fill="#2a2318"/></svg>')
    if nome == 'T-dono':
        # mostrador redesenhado em SVG (o ponteiro original cobria o "12"); o aro continua o da ilustração
        cx, cy = m['relogio']['c']
        inner += (f'<svg class="relogio" style="left:{cx-90}px;top:{cy-90}px" width="180" height="180" viewBox="-90 -90 180 180">'
                  '<defs><radialGradient id="mostrador" cx="40%" cy="35%" r="75%"><stop offset="0" stop-color="#d9dddc"/><stop offset="1" stop-color="#c9cecd"/></radialGradient></defs>'
                  '<ellipse cx="0" cy="4" rx="77" ry="80" fill="url(#mostrador)" stroke="#b7bcbc" stroke-width="2" stroke-opacity=".6"/>'
                  '<circle cx="34.0" cy="-55.9" r="3.3" fill="#a4a9a9"/><circle cx="58.9" cy="-31.0" r="3.3" fill="#a4a9a9"/><circle cx="58.9" cy="37.0" r="3.3" fill="#a4a9a9"/><circle cx="34.0" cy="61.9" r="3.3" fill="#a4a9a9"/><circle cx="-34.0" cy="61.9" r="3.3" fill="#a4a9a9"/><circle cx="-58.9" cy="37.0" r="3.3" fill="#a4a9a9"/><circle cx="-58.9" cy="-31.0" r="3.3" fill="#a4a9a9"/><circle cx="-34.0" cy="-55.9" r="3.3" fill="#a4a9a9"/><text x="3" y="-50" text-anchor="middle" font-family="Inter Tight" font-weight="600" font-size="34" fill="#565b5c" letter-spacing="-1.5">12</text><text x="62" y="13" text-anchor="middle" font-family="Inter Tight" font-weight="600" font-size="34" fill="#565b5c" letter-spacing="-1.5">3</text><text x="3" y="77" text-anchor="middle" font-family="Inter Tight" font-weight="600" font-size="34" fill="#565b5c" letter-spacing="-1.5">6</text><text x="-63" y="11" text-anchor="middle" font-family="Inter Tight" font-weight="600" font-size="34" fill="#565b5c" letter-spacing="-1.5">9</text>'
                  '<line id="d-hora" x1="0" y1="3" x2="0" y2="-34" stroke="#4d5254" stroke-width="7" stroke-linecap="round" transform="rotate(118)"/>'
                  '<line id="d-minuto" x1="0" y1="4" x2="0" y2="-60" stroke="#4d5254" stroke-width="5" stroke-linecap="round" transform="rotate(-14)"/>'
                  '<circle r="5.5" fill="#4d5254"/></svg>')
    vid, cls = '', 'rigbox'
    if os.path.exists(f'{CAM}/assets/vid/{nome}.mp4'):
        # V9: a cena deformada em alta (warp9.py) toca por cima do prato; as partes recortadas ficam ocultas
        t0, t1 = JANELAS[nome]
        vid = (f'<video class="clip painel" id="v-{nome}" src="assets/vid/{nome}.mp4" data-start="{t0}" data-duration="{round(t1 - t0, 3)}" '
               f'data-track-index="{list(JANELAS).index(nome) + 1}" muted playsinline style="left:{m["ix"]}px;top:{m["iy"]}px;width:{m["iw"]}px;height:{m["ih"]}px"></video>')
        cls = 'rigbox com-video'
    return (f'<div class="layer cena" id="{host}"><div class="{cls}" id="{pid}" style="width:{m["w"]}px;height:{m["h"]}px">'
            f'<img class="plate" src="assets/plates/{nome}.jpg" alt="">{vid}{inner}</div></div>')


JANELAS = {'T-cliente': (0.0, 4.8), 'T-garcom': (4.2, 7.9), 'H-cliente': (6.9, 11.0), 'H-amigos': (10.4, 13.4), 'T-dono': (12.7, 16.1), 'H-gorjeta': (12.7, 16.1)}
alturas = {t['id']: t['h'] for m in rig.values() for t in m['tampas']}
meta = {k: {kk: v[kk] for kk in ('w', 'h', 'ix', 'iy', 'iw', 'ih')} for k, v in rig.items()}
DUR = 21.0
for ar, (W, H) in {'16x9': (1600, 900), '4x5': (1080, 1350)}.items():
    d = f'{OUT}/lebre-{ar}'
    if os.path.exists(d): shutil.rmtree(d)
    shutil.copytree(f'{CAM}/assets', f'{d}/assets')
    for sub in ('fonts', 'telas', 'vendor'): os.makedirs(f'{d}/assets/{sub}', exist_ok=True)
    shutil.copy(REPO + 'docs/landing-v5/video-lebre/inter-tight-latin-var.woff2', f'{d}/assets/fonts/inter-tight.woff2')
    shutil.copy(REPO + 'node_modules/gsap/dist/gsap.min.js', f'{d}/assets/vendor/gsap.min.js')
    for f in ('tipe-logo.svg', 'tipe-logo-branco.svg'): shutil.copy(REPO + 'src/assets/marca/' + f, f'{d}/assets/{f}')
    for k in ('conta', 'dividir', 'metodos', 'pago'): shutil.copy(REPO + f'src/assets/telas-reais/{k}-780.webp', f'{d}/assets/telas/{k}.webp')
    html = f'''<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>A lebre e a tartaruga · Tipe</title>
<!-- Composição HyperFrames (V8, "a corrida contra o tempo"). Os personagens são bonecos
     articulados (partes recortadas das ilustrações oficiais, cada uma com seu pivô) animados por
     GSAP; câmera, textos, celular com telas reais e assinatura são desenhados por quadro. -->
<style>{css.replace('__W__', str(W)).replace('__H__', str(H))}</style>
<script src="assets/vendor/gsap.min.js"></script>
</head>
<body>
<div id="root" data-composition-id="lebre" data-start="0" data-duration="{DUR}" data-width="{W}" data-height="{H}" data-fps="30">
<div id="stage">
  {cena('T-cliente', 'scA', 'pA')}
  {cena('T-garcom', 'scB', 'pB')}
  {cena('H-cliente', 'scD', 'pD')}
  {cena('H-amigos', 'scE', 'pE')}
  <div class="layer" id="scF">
    <div class="metade" id="mT">{cena('T-dono', 'scFt', 'pFt')}</div>
    <div class="metade" id="mH">{cena('H-gorjeta', 'scFh', 'pFh')}</div>
    <div id="costura"></div>
  </div>
  <div class="layer" id="scP">
    <div id="phoneWrap"><div class="device" id="device"><div class="screen" id="screen">
      <img id="s0" src="assets/telas/conta.webp" alt=""><img id="s1" src="assets/telas/metodos.webp" alt=""><img id="s2" src="assets/telas/pago.webp" alt="">
      <div class="tap" id="tap"></div></div></div>
      <div id="ring"></div>
      <div id="badge"><svg viewBox="0 0 24 24" width="56%" height="56%"><path id="chk" d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" pathLength="1" stroke-dasharray="1 1.2" stroke-dashoffset="1.1"/></svg></div>
    </div>
  </div>
  <div id="textos"></div>
  <img id="logoTop" src="assets/tipe-logo.svg" alt="Tipe">
  <div id="bar"><div id="barFill"></div></div>
  <svg id="wipe"></svg>
  <div id="end"><div id="iris"></div><img id="endLogo" src="assets/tipe-logo-branco.svg" alt="Tipe">
    <div id="endTag"><span class="w" id="tg1">Pague.</span> <span class="w" id="tg2" style="color:var(--turq)">Sem esperar.</span></div></div>
</div>
</div>
<script>
const META = {json.dumps(meta)};
const RIGH = {json.dumps(alturas)};
const AR = '{ar}', DUR = {DUR};
{motor}
const tl = gsap.timeline({{ paused: true }});
const relogio = {{ t: 0 }};
tl.to(relogio, {{ t: DUR, duration: DUR, ease: 'none', onUpdate: () => quadro(relogio.t) }}, 0);
{pers}
montar();
quadro(0);
window.__timelines = window.__timelines || {{}};
window.__timelines['lebre'] = tl;
document.fonts && document.fonts.ready.then(() => {{ montar(); quadro(relogio.t); }});
</script>
</body>
</html>
'''
    open(f'{d}/index.html', 'w').write(html)
    print(d, len(html))
