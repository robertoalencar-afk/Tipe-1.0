# Gera os pratos limpos e as camadas articuladas (PNG com alfa) para a composição HyperFrames.
# Uso: python3 camadas.py <saida>   (lê src/assets/cenas/lebre-tartaruga-{cliente,gorjeta}-1600.webp)   -> <saida>/assets/{plates,partes}/... e <saida>/assets/rig.json
import sys, os, json, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from partes import CENAS, REMENDOS
AQUI = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1]; os.makedirs(OUT+'/assets/plates', exist_ok=True); os.makedirs(OUT+'/assets/partes', exist_ok=True)
PX, PY, HH = 900, 520, 893
SS = 4

def raster(poly, W, H):
    m = Image.new('L', (W*SS, H*SS), 0)
    ImageDraw.Draw(m).polygon([(x*SS, y*SS) for x, y in poly], fill=255)
    return np.asarray(m.resize((W, H), Image.BOX)).astype(float)/255

def feather(a, s):
    return np.asarray(Image.fromarray((a*255).astype('uint8')).filter(ImageFilter.GaussianBlur(s))).astype(float)/255

def harm(I, M, it=60):
    """preenche I[M] resolvendo Laplace (membrana) com pirâmide multiescala."""
    H, W = M.shape
    if M.sum() == 0: return I
    if min(H, W) <= 6:
        k = ~M
        mean = I[k].mean(0) if k.any() else np.full(3, 200.)
        I = I.copy(); I[M] = mean
    else:
        h2, w2 = (H+1)//2, (W+1)//2
        Ip = np.zeros((h2*2, w2*2, 3)); Kp = np.zeros((h2*2, w2*2))
        Ip[:H, :W] = I*(~M)[..., None]; Kp[:H, :W] = (~M)
        s = Ip.reshape(h2, 2, w2, 2, 3).sum((1, 3)); c = Kp.reshape(h2, 2, w2, 2).sum((1, 3))
        I2 = s/np.maximum(c, 1)[..., None]; M2 = c == 0
        I2 = harm(I2, M2, it)
        up = np.repeat(np.repeat(I2, 2, 0), 2, 1)[:H, :W]
        I = I.copy(); I[M] = up[M]
    for _ in range(it):
        P = np.pad(I, ((1, 1), (1, 1), (0, 0)), mode='edge')
        av = (P[:-2, 1:-1]+P[2:, 1:-1]+P[1:-1, :-2]+P[1:-1, 2:])/4
        I[M] = av[M]
    return I

def preencher(img, mask):
    ys, xs = np.where(mask)
    if len(ys) == 0: return img
    y0, y1, x0, x1 = max(ys.min()-6, 0), min(ys.max()+7, img.shape[0]), max(xs.min()-6, 0), min(xs.max()+7, img.shape[1])
    sub = harm(img[y0:y1, x0:x1].copy(), mask[y0:y1, x0:x1], 80)
    rng = np.random.default_rng(7)
    sub = sub + rng.normal(0, 0.9, sub.shape[:2])[..., None]*mask[y0:y1, x0:x1][..., None]
    out = img.copy(); out[y0:y1, x0:x1] = np.where(mask[y0:y1, x0:x1][..., None], sub, img[y0:y1, x0:x1]); return out

def dilata(m, r):
    return np.asarray(Image.fromarray((m*255).astype('uint8')).filter(ImageFilter.MaxFilter(2*r+1))) > 0

rig = {}
for nome, c in CENAS.items():
    src = np.asarray(Image.open(os.path.join(AQUI, '../../../src/assets/cenas/lebre-tartaruga-%s-1600.webp' % c['src'].split('.')[0])).convert('RGB')).astype(float)
    H, W = src.shape[:2]
    limpa = src.copy()
    # remendos (defeitos da imagem original)
    for poly in REMENDOS.get(nome, []):
        limpa = preencher(limpa, raster(poly, W, H) > 0.01)
    alfas = {}
    uniao = np.zeros((H, W), bool)
    for p in c['partes']:
        a = feather(raster(p['poly'], W, H), p['fe'])
        if 'radial' in p:
            cx, cy, r0, r1 = p['radial']; yy, xx = np.mgrid[0:H, 0:W]; r = np.hypot(xx-cx, yy-cy)
            a = a*np.clip((r1-r)/(r1-r0), 0, 1)
        if 'croma' in p:
            # só o objeto colorido (o glow claro em volta fica na base)
            lo, hi = p['croma']; cr = src.max(2)-src.min(2)
            obj = np.clip((cr-lo)/(hi-lo), 0, 1)*raster(p['poly'], W, H)
            obj = np.maximum(obj, np.asarray(Image.fromarray((obj*255).astype('uint8')).filter(ImageFilter.MaxFilter(3))).astype(float)/255*0.9)
            a = feather(obj, p['fe'])
            alfas[p['id']] = a
            uniao |= dilata(obj > 0.3, 2)
            continue
        if 'fadeY' in p:
            # a base do antebraço se funde com a imagem original (o cotovelo quase não se move)
            y0f, y1f = p['fadeY']; yy = np.arange(H)[:, None]
            a = a*np.clip((y1f-yy)/(y1f-y0f), 0, 1)
            m = dilata(raster(p['poly'], W, H) > 0.01, int(p['fe']*2+3)); m[y0f:] = False
            alfas[p['id']] = a; uniao |= m
            continue
        alfas[p['id']] = a
        uniao |= dilata(raster(p['poly'], W, H) > 0.01, int(p['fe']*2+3))
    # ponteiros do relógio
    rl = c.get('relogio')
    if rl:
        m = Image.new('L', (W, H), 0); d = ImageDraw.Draw(m)
        for q in ('min', 'hora'): d.line([rl['c'], rl[q]], fill=255, width=7)
        d.ellipse([rl['c'][0]-6, rl['c'][1]-6, rl['c'][0]+6, rl['c'][1]+6], fill=255)
        yy, xx = np.mgrid[0:H, 0:W]
        mm = (np.asarray(m) > 0) & (np.hypot(xx-rl['c'][0], yy-rl['c'][1]) < rl['r'])
        limpa = preencher(limpa, mm)
    if c.get('fundo'):
        # fundo de estúdio (azul-claro) fica como está: só os pixels do personagem são preenchidos
        fundo = (src[..., 2]-src[..., 0] >= 2) & (src[..., 1] > 208)
        uniao &= ~fundo
    limpa = preencher(limpa, uniao)
    # prato estendido (mesma lógica de plates.py)
    h = Image.fromarray(np.clip(limpa[:, c['x0']:c['x1']], 0, 255).astype('uint8'))
    a = np.asarray(h); pp = np.pad(a, ((PY, PY), (PX, PX), (0, 0)), mode='edge')
    P = Image.fromarray(pp).filter(ImageFilter.GaussianBlur(10))
    yy, xx = np.mgrid[0:h.size[1], 0:h.size[0]]
    dd = np.minimum.reduce([xx, yy, h.size[0]-1-xx, h.size[1]-1-yy]).astype(float)
    P.paste(h, (PX, PY), Image.fromarray((np.clip(dd/8, 0, 1)*255).astype('uint8')))
    q = np.asarray(P).astype(float)+np.random.default_rng(1).normal(0, 1.2, (P.size[1], P.size[0], 1))
    P = Image.fromarray(np.clip(q, 0, 255).astype('uint8'))
    P.save(f'{OUT}/assets/plates/{nome}.jpg', quality=90)
    ox, oy = PX - c['x0'], PY   # origem: coordenada da imagem -> coordenada do prato
    info = {'w': P.size[0], 'h': P.size[1], 'ix': PX, 'iy': PY, 'iw': h.size[0], 'ih': h.size[1], 'partes': [], 'tampas': []}
    if rl: info['relogio'] = {'c': [rl['c'][0]+ox, rl['c'][1]+oy]}
    caixas = {}
    for p in c['partes']:
        al = alfas[p['id']]; ys, xs = np.where(al > 0.004)
        x0, x1, y0, y1 = xs.min(), xs.max()+1, ys.min(), ys.max()+1
        rgba = np.dstack([src[y0:y1, x0:x1], al[y0:y1, x0:x1]*255]).clip(0, 255).astype('uint8')
        Image.fromarray(rgba, 'RGBA').save(f'{OUT}/assets/partes/{p["id"]}.png', optimize=True)
        caixas[p['id']] = (x0, y0)
        pai = p.get('pai'); bx, by = (caixas[pai] if pai else (-ox, -oy))
        info['partes'].append({'id': p['id'], 'pai': pai, 'x': int(x0-bx), 'y': int(y0-by), 'w': int(x1-x0), 'h': int(y1-y0),
                               'px': round(p['piv'][0]-x0, 1), 'py': round(p['piv'][1]-y0, 1)})
    for t in c['tampas']:
        xs = [x for x, _ in t['poly']]; ys = [y for _, y in t['poly']]
        x0, x1, y0, y1 = int(math.floor(min(xs)))-1, int(math.ceil(max(xs)))+1, int(math.floor(min(ys)))-1, int(math.ceil(max(ys)))+1
        hh = y1-y0
        dx = t.get('dx', 0)
        dy = t.get('dy', 0)
        faixa = src[y0-hh-dy:y0-dy, x0+dx:x1+dx]
        if 'pele' in t:
            # pálpebra = a pele que estaria ali sem o olho (interpolada do contorno)
            mm = raster(t['pele'], W, H) > 0.01
            faixa = preencher(src, mm)[y0:y1, x0:x1]
        Image.fromarray(faixa.clip(0, 255).astype('uint8')).save(f'{OUT}/assets/partes/{t["id"]}.png')
        bx, by = caixas[t['pai']]
        info['tampas'].append({'id': t['id'], 'pai': t['pai'], 'x': x0-bx, 'y': y0-by, 'w': x1-x0, 'h': hh,
                               'clip': [[round(x-x0, 1), round(y-y0, 1)] for x, y in t['poly']], 'arco': t.get('arco', False)})
    rig[nome] = info
    print(nome, P.size, [p['id'] for p in c['partes']])
json.dump(rig, open(f'{OUT}/assets/rig.json', 'w'), indent=1, default=lambda o: o.item())
