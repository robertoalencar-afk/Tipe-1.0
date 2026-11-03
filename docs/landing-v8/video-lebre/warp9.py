"""V9: os personagens deixam de ser recortes que giram sobre um prato remendado (o que mostrava borrões
quando a cabeça ou a pata se mexiam) e passam a ser deformados suavemente na própria ilustração, em alta
resolução (Real-ESRGAN 2x, ver nitidez.py). Nada é recortado: cada parte do rig puxa os pixels em volta com
um peso que cai devagar, então nunca aparece um buraco atrás dela.

Entrada: as poses por quadro que o rig GSAP da V8 calcula (poses.mjs), o rig.json e as máscaras das partes
(camadas.py + recortes.py), as ilustrações em alta (nitidez.py) e os pratos (só para o que foi apagado de
propósito: ponteiros do relógio, remendos e os balões que surgem depois).
Saída: um MP4 por cena, do tamanho do painel em 2x, que o index.html toca no lugar do prato + partes.

Uso: python3 warp9.py <assets> <poses.json> <pasta-hi> <saida>"""
import sys, os, json, subprocess, math
import numpy as np, cv2

ASSETS, POSES, HI, OUT = sys.argv[1:5]
K = 2.0
PX, PY = 900, 520
CENAS = {  # cena -> (ilustração, coluna inicial no 1600, janela em s)
    'T-cliente': ('cliente', 0, 0.0, 4.8),
    'T-garcom': ('garcom', 0, 4.2, 7.9),
    'H-cliente': ('cliente', 812, 6.9, 11.0),
    'H-amigos': ('amigos', 806, 10.4, 13.4),
    'T-dono': ('dono', 0, 12.7, 16.1),
    'H-gorjeta': ('gorjeta', 815, 12.7, 16.1),
}
POPS = {'h1-bolha': (0.5, 0.8), 'a-bolhaP': (0.3, 1.0), 'a-bolhaR': (0.3, 1.0), 'h3-coracao': (0.4, 1.0)}
rig = json.load(open(f'{ASSETS}/rig.json'))
P = json.load(open(POSES)); FPS = P['fps']; FR = P['fr']
os.makedirs(OUT, exist_ok=True)


def T(x, y): return np.array([[1, 0, x], [0, 1, y], [0, 0, 1]], float)
def Rz(d):
    a = math.radians(d); c, s = math.cos(a), math.sin(a)
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]], float)
def S(a, b): return np.array([[a, 0, 0], [0, b, 0], [0, 0, 1]], float)


def local(p, pose, origem=None):
    """matriz CSS de uma parte (coords locais da caixa -> coords da caixa do pai), como o GSAP aplica."""
    rot, x, y, sx, sy = pose[:5]
    ox, oy = origem if origem else (p['px'], p['py'])
    return T(p['x'], p['y']) @ T(ox, oy) @ T(x, y) @ Rz(rot) @ S(sx, sy) @ T(-ox, -oy)


def ler(caminho, flags=cv2.IMREAD_UNCHANGED):
    im = cv2.imread(caminho, flags)
    if im is None: raise SystemExit('faltou ' + caminho)
    return im


for nome, (src, x0, t0, t1) in CENAS.items():
    m = rig[nome]; iw, ih = m['iw'], m['ih']; W, H = int(iw * K), int(ih * K)
    hi = ler(f'{HI}/{src}.png', cv2.IMREAD_COLOR)
    base = hi[:H, int(x0 * K):int(x0 * K) + W].astype(np.float32).copy()
    # 1x: original e prato, para achar o que foi apagado de propósito
    orig1 = cv2.resize(hi, (hi.shape[1] // 2, hi.shape[0] // 2), interpolation=cv2.INTER_AREA)[:ih, x0:x0 + iw].astype(np.float32)
    prato = ler(f'{ASSETS}/plates/{nome}.jpg', cv2.IMREAD_COLOR)[PY:PY + ih, PX:PX + iw].astype(np.float32)
    partes = {p['id']: p for p in m['partes']}
    alfa, repouso = {}, {}
    for p in m['partes']:
        a = ler(f'{ASSETS}/partes/{p["id"]}.png')[..., 3].astype(np.float32) / 255
        alfa[p['id']] = a
        ox, oy = (repouso[p['pai']] if p['pai'] else (0, 0))
        repouso[p['id']] = (ox + p['x'], oy + p['y'])
    uniao = np.zeros((ih, iw), np.float32)
    for pid, p in partes.items():
        if pid in POPS: continue
        rx, ry = repouso[pid]; rx -= PX; ry -= PY
        a = alfa[pid]; h, w = a.shape
        ys, xs = slice(max(ry, 0), min(ry + h, ih)), slice(max(rx, 0), min(rx + w, iw))
        uniao[ys, xs] = np.maximum(uniao[ys, xs], a[ys.start - ry:ys.stop - ry, xs.start - rx:xs.stop - rx])
    uniao = cv2.dilate((uniao > 0.05).astype(np.uint8), np.ones((15, 15), np.uint8))
    dif = (np.abs(prato - orig1).max(2) > 18).astype(np.uint8)
    dif = cv2.morphologyEx(dif, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    dif = cv2.dilate(dif, np.ones((5, 5), np.uint8)) * (1 - uniao)
    if dif.any():
        mk = cv2.GaussianBlur(cv2.resize(dif.astype(np.float32), (W, H)), (0, 0), 2.0)[..., None]
        prato_hi = cv2.resize(prato, (W, H), interpolation=cv2.INTER_CUBIC)
        base = base * (1 - mk) + prato_hi * mk
    # sprites dos balões: o recorte em alta, com o alfa da parte
    sprites = {}
    for pid in POPS:
        if pid not in partes: continue
        p = partes[pid]; rx, ry = repouso[pid]; rx -= PX; ry -= PY
        a = cv2.resize(alfa[pid], (int(p['w'] * K), int(p['h'] * K)), interpolation=cv2.INTER_CUBIC)
        rgb = hi[int(ry * K):int(ry * K) + a.shape[0], int((x0 + rx) * K):int((x0 + rx) * K) + a.shape[1]].astype(np.float32)
        sprites[pid] = (rgb, np.clip(a, 0, 1))
    # peso de cada parte: o alfa, alargado e suavizado (a pele em volta acompanha, sem rasgar)
    peso = {}
    for pid, a in alfa.items():
        if pid in POPS: continue
        pad = 40
        b = cv2.copyMakeBorder(a, pad, pad, pad, pad, cv2.BORDER_CONSTANT, 0)
        b = cv2.dilate(b, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
        b = cv2.GaussianBlur(b, (0, 0), 5.0)
        peso[pid] = (np.clip(b * 1.15, 0, 1), pad)
    # tampas (piscar)
    tampas = m['tampas']
    peles = {t['id']: ler(f'{ASSETS}/partes/{t["id"]}.png', cv2.IMREAD_COLOR).astype(np.float32) for t in tampas}

    gy, gx = np.mgrid[0:H, 0:W].astype(np.float32)
    rbx = PX + (gx + 0.5) / K - 0.5; rby = PY + (gy + 0.5) / K - 0.5   # pixel 2x -> coord do rigbox
    HI2R = T(PX, PY) @ S(1 / K, 1 / K)                                    # 2x -> rigbox (aprox. sem meio pixel)
    R2HI = np.linalg.inv(HI2R)
    i0, i1 = int(round(t0 * FPS)), int(round(t1 * FPS))
    ff = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                           '-c:v', 'libx264', '-preset', 'slow', '-crf', '13', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', f'{OUT}/{nome}.mp4'],
                          stdin=subprocess.PIPE)
    for i in range(i0, i1):
        f = FR[max(i, 1)]
        G = {}
        mx, my = rbx.copy(), rby.copy()
        for p in m['partes']:
            pid = p['id']
            Gp = G[p['pai']] if p['pai'] else np.eye(3)
            if pid in POPS: continue
            G[pid] = Gp @ local(p, f[pid])
            # repouso: só translações
            rx, ry = repouso[pid]
            M = T(rx, ry) @ np.linalg.inv(G[pid])             # rigbox (agora) -> rigbox (repouso)
            if np.allclose(M, np.eye(3), atol=1e-6): continue
            sx = M[0, 0] * rbx + M[0, 1] * rby + M[0, 2]; sy = M[1, 0] * rbx + M[1, 1] * rby + M[1, 2]
            pw, pad = peso[pid]
            w = cv2.remap(pw, (sx - rx + pad).astype(np.float32), (sy - ry + pad).astype(np.float32), cv2.INTER_LINEAR, borderValue=0)
            mx = mx * (1 - w) + sx * w; my = my * (1 - w) + sy * w
        quadro = cv2.remap(base, ((mx - PX) * K).astype(np.float32), ((my - PY) * K).astype(np.float32), cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)
        # pálpebras
        for t in tampas:
            yp = f.get(t['id'] + '-pele', 0)
            arco = f.get(t['id'] + '-arco', 0) if t['arco'] else 0
            if yp <= 0.05 and arco <= 0.01: continue
            w, h = t['w'], t['h']; k = 4
            loc = np.zeros((h * k, w * k, 3), np.float32); al = np.zeros((h * k, w * k), np.float32)
            pele = cv2.resize(peles[t['id']], (w * k, h * k), interpolation=cv2.INTER_CUBIC)
            dy = int(round(yp * k))
            if dy > 0:
                loc[:dy] = pele[h * k - dy:]; al[:dy] = 1
            clip = np.zeros_like(al); cv2.fillPoly(clip, [np.int32(np.array(t['clip']) * k)], 1, cv2.LINE_AA)
            al *= clip
            if arco > 0.01:
                pts = [(w * 0.08, h * 0.52), (w / 2, h * 0.86), (w * 0.92, h * 0.52)]
                curva = np.array([[(1 - s) ** 2 * pts[0][0] + 2 * (1 - s) * s * pts[1][0] + s * s * pts[2][0],
                                   (1 - s) ** 2 * pts[0][1] + 2 * (1 - s) * s * pts[1][1] + s * s * pts[2][1]] for s in np.linspace(0, 1, 24)])
                ln = np.zeros_like(al); cv2.polylines(ln, [np.int32(curva * k)], False, 1, int(2.1 * k), cv2.LINE_AA)
                loc = loc * (1 - ln[..., None] * arco) + np.array([42, 35, 36], np.float32) * ln[..., None] * arco
                al = np.maximum(al, ln * arco)
            A = R2HI @ G[t['pai']] @ T(t['x'], t['y']) @ S(1 / k, 1 / k)
            lw = cv2.warpAffine(loc, A[:2], (W, H), flags=cv2.INTER_LINEAR); aw = cv2.warpAffine(al, A[:2], (W, H), flags=cv2.INTER_LINEAR)[..., None]
            quadro = quadro * (1 - aw) + lw * aw
        # balões e coração
        for pid, (oxr, oyr) in POPS.items():
            if pid not in sprites: continue
            p = partes[pid]; pose = f[pid]
            if pose[5] <= 0.003: continue
            Gp = G[p['pai']] if p['pai'] else np.eye(3)
            L = local(p, pose, (p['w'] * oxr, p['h'] * oyr))
            A = R2HI @ Gp @ L @ S(1 / K, 1 / K)
            rgb, a = sprites[pid]
            lw = cv2.warpAffine(rgb, A[:2], (W, H), flags=cv2.INTER_LINEAR); aw = cv2.warpAffine(a, A[:2], (W, H), flags=cv2.INTER_LINEAR)[..., None] * pose[5]
            quadro = quadro * (1 - aw) + lw * aw
        ff.stdin.write(np.clip(quadro, 0, 255).astype(np.uint8).tobytes())
    ff.stdin.close(); ff.wait()
    print(nome, W, H, i1 - i0, 'quadros')
