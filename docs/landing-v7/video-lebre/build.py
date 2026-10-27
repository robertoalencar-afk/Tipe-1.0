# Monta os projetos HyperFrames (16x9 e 4x5) da animação "A lebre e a tartaruga".
# Uso: python3 build.py <pasta-com-assets-de-camadas.py> <saida>
import json, os, shutil, sys
AQUI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(AQUI, '../../..')) + '/'
CAM, OUT = sys.argv[1], sys.argv[2]
rig = json.load(open(f'{CAM}/assets/rig.json'))
rd = lambda f: open(os.path.join(AQUI, f)).read()
css, js, rend, body, pers = rd('css.txt'), rd('js.txt'), rd('render.txt'), rd('body.txt'), rd('personagens.js')

def cena(nome, host, pid):
    m = rig[nome]
    filhos = {}
    for p in m['partes']: filhos.setdefault(p['pai'], []).append(p)
    tampas = {}
    for t in m['tampas']: tampas.setdefault(t['pai'], []).append(t)
    def parte(p):
        h = (f'<div class="parte" id="{p["id"]}" style="left:{p["x"]}px;top:{p["y"]}px;width:{p["w"]}px;height:{p["h"]}px">'
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
    if 'relogio' in m:
        cx, cy = m['relogio']['c']
        inner += (f'<svg class="relogio" style="left:{cx-50}px;top:{cy-50}px" width="100" height="100" viewBox="-50 -50 100 100">'
                  '<g filter="url(#sombraP)"><line id="t-hora" x1="0" y1="2" x2="0" y2="-24" stroke="#20190f" stroke-width="4.2" stroke-linecap="round" transform="rotate(124)"/>'
                  '<line id="t-minuto" x1="0" y1="3" x2="0" y2="-35" stroke="#1d170e" stroke-width="3.4" stroke-linecap="round"/>'
                  '<circle r="3.6" fill="#2a2318"/></g>'
                  '<defs><filter id="sombraP" x="-60" y="-60" width="120" height="120" filterUnits="userSpaceOnUse"><feDropShadow dx="0.6" dy="1" stdDeviation="0.8" flood-color="#000" flood-opacity=".22"/></filter></defs></svg>')
    return (f'<div class="layer" id="{host}"><div class="rigbox" id="{pid}" style="width:{m["w"]}px;height:{m["h"]}px">'
            f'<img class="plate" src="assets/plates/{nome}.jpg" alt="">{inner}</div></div>')

alturas = {t['id']: t['h'] for m in rig.values() for t in m['tampas']}
meta = {k: {kk: v[kk] for kk in ('w', 'h', 'ix', 'iy', 'iw', 'ih')} for k, v in rig.items()}
for ar, (W, H) in {'16x9': (1600, 900), '4x5': (1080, 1350)}.items():
    d = f'{OUT}/lebre-{ar}'
    if os.path.exists(d): shutil.rmtree(d)
    shutil.copytree(f'{CAM}/assets', f'{d}/assets')
    os.makedirs(f'{d}/assets/fonts', exist_ok=True); os.makedirs(f'{d}/assets/telas', exist_ok=True); os.makedirs(f'{d}/assets/vendor', exist_ok=True)
    shutil.copy(REPO + 'docs/landing-v5/video-lebre/inter-tight-latin-var.woff2', f'{d}/assets/fonts/inter-tight.woff2')
    shutil.copy(REPO + 'node_modules/gsap/dist/gsap.min.js', f'{d}/assets/vendor/gsap.min.js')
    for f in ('tipe-logo.svg', 'tipe-logo-branco.svg'): shutil.copy(REPO + 'src/assets/marca/' + f, f'{d}/assets/{f}')
    for k in ('conta', 'metodos', 'pago'): shutil.copy(REPO + f'src/assets/telas-reais/{k}-780.webp', f'{d}/assets/telas/{k}.webp')
    b = (body.replace('__conta__', 'assets/telas/conta.webp').replace('__metodos__', 'assets/telas/metodos.webp')
             .replace('__pago__', 'assets/telas/pago.webp').replace('__logo__', 'assets/tipe-logo.svg')
             .replace('__logoBranco__', 'assets/tipe-logo-branco.svg'))
    c = css.replace('url(__FONT__)', 'url(assets/fonts/inter-tight.woff2)') + '''<style>
.rigbox{position:absolute;left:0;top:0;transform-origin:0 0}
.rigbox>.plate{position:absolute;left:0;top:0;width:100%;height:100%}
.parte{position:absolute}
.parte>img{position:absolute;left:0;top:0;width:100%;height:100%}
.tampa{position:absolute;overflow:hidden}
.tampa>img{position:absolute;left:0}
.arco{position:absolute;left:0;top:0;opacity:0}
.relogio{position:absolute;overflow:visible}
#root{position:relative;width:WWpx;height:HHpx;overflow:hidden}
</style>'''.replace('WW', str(W)).replace('HH', str(H))
    r = rend.replace("  if (t < T_WIPE1) drawRig('pT', 'T-cliente', t);\n", '').replace("    if (o > 0) drawRig(img, key, t);\n", '')
    html = f'''<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>A lebre e a tartaruga · Tipe</title>
<!-- Composição HyperFrames. Os personagens são bonecos articulados (partes recortadas da ilustração,
     cada uma com seu pivô) animados por GSAP; o resto (câmera, textos, celular, wipe, assinatura)
     vem do motor da V6, chamado pela mesma linha do tempo. -->
{c}
<script src="assets/vendor/gsap.min.js"></script>
</head>
<body>
<div id="root" data-composition-id="lebre" data-start="0" data-duration="14.85" data-width="{W}" data-height="{H}" data-fps="30">
<div id="stage">
  {cena('T-cliente', 'scT', 'pT')}
  {cena('H-cliente', 'scH1', 'pH1')}
  {cena('H-gorjeta', 'scH3', 'pH3')}
  {b}
</div>
</div>
<script>
const META = {json.dumps(meta)};
const RIGH = {json.dumps(alturas)};
const AR = '{ar}';
const DUR = 14.85;
{js}
{r}
const tl = gsap.timeline({{ paused: true }});
const relogio = {{ t: 0 }};
tl.to(relogio, {{ t: DUR, duration: DUR, ease: 'none', onUpdate: () => render(relogio.t) }}, 0);
{pers}
placeText();
render(0);
window.__timelines = window.__timelines || {{}};
window.__timelines['lebre'] = tl;
document.fonts && document.fonts.ready.then(() => {{ placeText(); render(relogio.t); }});
</script>
</body>
</html>
'''
    open(f'{d}/index.html', 'w').write(html)
    print(d, len(html))
