# Cenas novas da V8 (tartaruga garçom com a maquininha e tartaruga no caixa): recorta os
# personagens e os braços do fundo, gera o prato limpo (LaMa, local e gratuito) e acrescenta
# as cenas ao rig.json no mesmo formato de ../../landing-v7/video-lebre/camadas.py.
# Uso: python3 recortes.py <saida-do-camadas.py> <big-lama.pt>
import sys, os, json
import numpy as np, cv2, torch
from PIL import Image, ImageFilter
AQUI = os.path.dirname(os.path.abspath(__file__))
OUT, LAMA = sys.argv[1], sys.argv[2]
PX, PY = 900, 520
modelo = torch.jit.load(LAMA, map_location='cpu').eval()

def lama(img, mask, pad=96):
    ys, xs = np.where(mask > 0)
    y0, y1 = max(ys.min()-pad, 0), min(ys.max()+pad, img.shape[0]); x0, x1 = max(xs.min()-pad, 0), min(xs.max()+pad, img.shape[1])
    c, m = img[y0:y1, x0:x1], mask[y0:y1, x0:x1]; h, w = m.shape; Hh, Ww = (h+7)//8*8, (w+7)//8*8
    c = cv2.copyMakeBorder(c, 0, Hh-h, 0, Ww-w, cv2.BORDER_REFLECT); m2 = cv2.copyMakeBorder(m, 0, Hh-h, 0, Ww-w, cv2.BORDER_CONSTANT, value=0)
    t = torch.from_numpy(c).permute(2, 0, 1)[None].float()/255; tm = torch.from_numpy((m2 > 0).astype(np.float32))[None, None]
    with torch.no_grad(): o = modelo(t, tm)[0].permute(1, 2, 0).numpy()[:h, :w]
    r = img.copy(); sel = m > 0; r[y0:y1, x0:x1][sel] = np.clip(o*255, 0, 255).astype(np.uint8)[sel]; return r

def fundo_por_linha(img, colunas):
    # parede de estúdio: varia quase só na vertical
    return np.median(np.concatenate([img[:, a:b] for a, b in colunas], 1), axis=1).astype(float)

def mascara_dif(img, bg, caixa, lim, ymax=None):
    x0, y0, x1, y1 = caixa
    d = np.abs(img[y0:y1, x0:x1].astype(float) - bg[y0:y1, None, :]).max(2)
    m = np.zeros(img.shape[:2], np.uint8); m[y0:y1, x0:x1] = (d > lim)*255
    if ymax: m[ymax:] = 0
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)); m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    if n > 1: m = ((lab == 1+np.argmax(st[1:, cv2.CC_STAT_AREA]))*255).astype(np.uint8)
    return m

def grabcut(img, caixa, extra_fg=None, extra_bg=None):
    m = np.zeros(img.shape[:2], np.uint8); bgd = np.zeros((1, 65)); fgd = np.zeros((1, 65))
    x0, y0, x1, y1 = caixa
    cv2.grabCut(img, m, (x0, y0, x1-x0, y1-y0), bgd, fgd, 6, cv2.GC_INIT_WITH_RECT)
    if extra_fg is not None or extra_bg is not None:
        if extra_fg is not None: m[extra_fg > 0] = cv2.GC_FGD
        if extra_bg is not None: m[extra_bg > 0] = cv2.GC_BGD
        cv2.grabCut(img, m, None, bgd, fgd, 4, cv2.GC_INIT_WITH_MASK)
    out = np.where((m == cv2.GC_FGD) | (m == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    out = cv2.morphologyEx(out, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(out)
    out = ((lab == 1+np.argmax(st[1:, cv2.CC_STAT_AREA]))*255).astype(np.uint8)
    return encher(out)

def encher(m):
    # olhos e narinas escuros não são fundo: preenche os buracos internos
    cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    out = np.zeros_like(m); cv2.drawContours(out, cs, -1, 255, -1); return out

def prato(img, nome, espelho=False):
    # espelho: o salão continua dos lados (mesas refletidas, desfocadas e clareadas, como profundidade
    # de campo) em vez de esticar a última coluna, que vira listras quando há mesas na borda
    h = Image.fromarray(img); a = np.asarray(h)
    pp = np.pad(a, ((PY, PY), (PX, PX), (0, 0)), mode='symmetric' if espelho else 'edge')
    P = Image.fromarray(pp).filter(ImageFilter.GaussianBlur(14 if espelho else 10))
    if espelho:
        q = np.asarray(P).astype(float); fundo = np.median(a[:40].reshape(-1, 3), 0)
        P = Image.fromarray(np.clip(q*0.55 + fundo*0.45, 0, 255).astype('uint8'))
    yy, xx = np.mgrid[0:h.size[1], 0:h.size[0]]
    dd = np.minimum.reduce([xx, yy, h.size[0]-1-xx, h.size[1]-1-yy]).astype(float)
    P.paste(h, (PX, PY), Image.fromarray((np.clip(dd/(150 if espelho else 8), 0, 1)**(1.6 if espelho else 1)*255).astype('uint8')))
    q = np.asarray(P).astype(float)+np.random.default_rng(1).normal(0, 1.2, (P.size[1], P.size[0], 1))
    Image.fromarray(np.clip(q, 0, 255).astype('uint8')).save(f'{OUT}/assets/plates/{nome}.jpg', quality=90)
    return {'w': P.size[0], 'h': P.size[1], 'ix': PX, 'iy': PY, 'iw': h.size[0], 'ih': h.size[1], 'partes': [], 'tampas': []}

def parte(img, mask, pid, piv, pai=None, base=(PX, PY), soft=1.2, borda=0):
    ys, xs = np.where(mask > 0); x0, y0, x1, y1 = xs.min()-3, ys.min()-3, xs.max()+4, ys.max()+4
    a = cv2.GaussianBlur(mask.astype(np.float32), (0, 0), soft)[y0:y1, x0:x1]
    if borda:   # some junto com o prato nas bordas da ilustração (o prato esmaece ali)
        xx = np.arange(x0, x1)[None, :].astype(float); a = a*np.clip(np.minimum(xx, img.shape[1]-1-xx)/borda, 0, 1)**1.6
    rgba = np.dstack([img[y0:y1, x0:x1], np.clip(a, 0, 255).astype(np.uint8)])
    Image.fromarray(rgba).save(f'{OUT}/assets/partes/{pid}.png')
    bx, by = base
    return {'id': pid, 'pai': pai, 'x': int(x0+bx), 'y': int(y0+by), 'w': int(x1-x0), 'h': int(y1-y0), 'px': float(round(piv[0]-x0, 1)), 'py': float(round(piv[1]-y0, 1))}

def corte(nome):
    im = np.asarray(Image.open(os.path.join(AQUI, '../../../src/assets/cenas/lebre-tartaruga-%s-1600.webp' % nome)).convert('RGB'))
    a = im.astype(int); g = (a[:, :, 1]-a[:, :, 0])[:, 760:840].mean(0)   # linha turquesa do meio
    x = 760+int(np.argmax(g)); return np.ascontiguousarray(im[:, :x-4])

rig = json.load(open(f'{OUT}/assets/rig.json'))

# ---------- T-garcom: tartaruga com a maquininha, braços pedindo a conta ao fundo ----------
im = corte('garcom'); H, W = im.shape[:2]
bg = fundo_por_linha(im, [(170, 215), (585, 625)])
tart = grabcut(im, (222, 268, 668, 822))
# a fita de papel fica no prato: a tartaruga só balança no lugar, sem andar
bracos = {'g-bracoA': ((22, 320, 100, 512), (62, 512)), 'g-bracoB': ((100, 378, 170, 515), (128, 515)),
          'g-bracoC': ((628, 382, 702, 515), (662, 515)), 'g-bracoD': ((700, 330, 790, 505), (745, 505))}
masks = {k: mascara_dif(im, bg, cx, 16, ymax=515) & ~cv2.dilate(tart, np.ones((5, 5), np.uint8)) for k, (cx, _) in bracos.items()}
todo = tart.copy()
for m in masks.values(): todo |= m
limpo = lama(im, cv2.dilate(todo, np.ones((9, 9), np.uint8)))
info = prato(limpo, 'T-garcom', espelho=True)
for k, (cx, piv) in bracos.items(): info['partes'].append(parte(im, masks[k], k, piv, borda=150))
info['partes'].append(parte(im, tart, 'g-tart', (420, 808)))
rig['T-garcom'] = info
Image.fromarray(np.dstack([im, todo])).save(f'{OUT}/debug-garcom.png')

# ---------- T-dono: tartaruga cochilando no caixa, relógio de parede ----------
im = corte('dono')
cab = grabcut(im, (400, 318, 592, 500))
cab[492:] = 0                                   # o pescoço continua no corpo
relogio_c, r = (198, 178), 70                   # mostrador: os ponteiros serão desenhados em SVG
pont = np.zeros(im.shape[:2], np.uint8)
cv2.line(pont, (198, 178), (180, 104), 255, 19); cv2.line(pont, (198, 178), (238, 199), 255, 15); cv2.circle(pont, (198, 178), 10, 255, -1)
limpo = lama(im, cv2.dilate(cab, np.ones((11, 11), np.uint8)) | pont)
info = prato(limpo, 'T-dono')
info['partes'].append(parte(im, cab, 'd-cabeca', (440, 492)))
info['relogio'] = {'c': [relogio_c[0]+PX, relogio_c[1]+PY]}
rig['T-dono'] = info
Image.fromarray(np.dstack([im, cab | pont])).save(f'{OUT}/debug-dono.png')

json.dump(rig, open(f'{OUT}/assets/rig.json', 'w'))
print('ok', list(rig))
