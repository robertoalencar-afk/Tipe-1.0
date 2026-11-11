"""Real-ESRGAN (pesos públicos do GitHub do projeto) para deixar nítidas as ilustrações da lebre e da tartaruga.
Uso: python3 nitidez.py <pesos.pth> <modelo: compacto|plus> <entrada> <saida> [escala_final=2]
A imagem sai `escala_final` vezes maior (o modelo sobe 4x e o resultado é reduzido com Lanczos). PNG com alfa: o alfa sobe por bicúbica."""
import sys, numpy as np, torch, torch.nn as nn, torch.nn.functional as F
from PIL import Image
torch.set_num_threads(4)

class Compacto(nn.Module):  # SRVGGNetCompact
    def __init__(s, nf=64, nc=32, up=4):
        super().__init__(); s.up = up
        b = [nn.Conv2d(3, nf, 3, 1, 1), nn.PReLU(nf)]
        for _ in range(nc): b += [nn.Conv2d(nf, nf, 3, 1, 1), nn.PReLU(nf)]
        b += [nn.Conv2d(nf, 3 * up * up, 3, 1, 1)]
        s.body = nn.ModuleList(b); s.ps = nn.PixelShuffle(up)
    def forward(s, x):
        o = x
        for m in s.body: o = m(o)
        return s.ps(o) + F.interpolate(x, scale_factor=s.up, mode='nearest')

class RDB(nn.Module):
    def __init__(s, nf=64, gc=32):
        super().__init__()
        for i in range(5): setattr(s, f'conv{i+1}', nn.Conv2d(nf + i * gc, gc if i < 4 else nf, 3, 1, 1))
    def forward(s, x):
        f = [x]
        for i in range(4): f.append(F.leaky_relu(getattr(s, f'conv{i+1}')(torch.cat(f, 1)), 0.2))
        return getattr(s, 'conv5')(torch.cat(f, 1)) * 0.2 + x
class RRDB(nn.Module):
    def __init__(s, nf=64):
        super().__init__(); s.rdb1, s.rdb2, s.rdb3 = RDB(nf), RDB(nf), RDB(nf)
    def forward(s, x): return s.rdb3(s.rdb2(s.rdb1(x))) * 0.2 + x
class Plus(nn.Module):  # RRDBNet x4
    def __init__(s, nf=64, nb=23):
        super().__init__()
        s.conv_first = nn.Conv2d(3, nf, 3, 1, 1); s.body = nn.Sequential(*[RRDB(nf) for _ in range(nb)])
        s.conv_body = nn.Conv2d(nf, nf, 3, 1, 1); s.conv_up1 = nn.Conv2d(nf, nf, 3, 1, 1); s.conv_up2 = nn.Conv2d(nf, nf, 3, 1, 1)
        s.conv_hr = nn.Conv2d(nf, nf, 3, 1, 1); s.conv_last = nn.Conv2d(nf, 3, 3, 1, 1)
    def forward(s, x):
        f = s.conv_first(x); f = f + s.conv_body(s.body(f)); a = lambda t: F.leaky_relu(t, 0.2)
        f = a(s.conv_up1(F.interpolate(f, scale_factor=2, mode='nearest')))
        f = a(s.conv_up2(F.interpolate(f, scale_factor=2, mode='nearest')))
        return s.conv_last(a(s.conv_hr(f)))

def carregar(pesos, tipo):
    m = Compacto() if tipo == 'compacto' else Plus()
    sd = torch.load(pesos, map_location='cpu'); sd = sd.get('params_ema', sd.get('params', sd))
    if tipo == 'compacto': sd = {k.replace('body.', 'body.'): v for k, v in sd.items()}
    m.load_state_dict(sd, strict=True); return m.eval()

@torch.no_grad()
def subir(m, rgb, tile=256, pad=16):
    x = torch.from_numpy(rgb.astype(np.float32) / 255).permute(2, 0, 1)[None]
    _, _, H, W = x.shape; out = torch.zeros(1, 3, H * 4, W * 4)
    for y in range(0, H, tile):
        for xx in range(0, W, tile):
            y0, x0 = max(y - pad, 0), max(xx - pad, 0); y1, x1 = min(y + tile + pad, H), min(xx + tile + pad, W)
            o = m(x[:, :, y0:y1, x0:x1])
            oy, ox = (y - y0) * 4, (xx - x0) * 4; th, tw = min(tile, H - y) * 4, min(tile, W - xx) * 4
            out[:, :, y * 4:y * 4 + th, xx * 4:xx * 4 + tw] = o[:, :, oy:oy + th, ox:ox + tw]
    return (out[0].permute(1, 2, 0).clamp(0, 1).numpy() * 255 + 0.5).astype(np.uint8)

if __name__ == '__main__':
    pesos, tipo, ent, sai = sys.argv[1:5]; k = float(sys.argv[5]) if len(sys.argv) > 5 else 2
    im = Image.open(ent); m = carregar(pesos, tipo)
    tem_alfa = im.mode in ('RGBA', 'LA') or 'transparency' in im.info
    im = im.convert('RGBA' if tem_alfa else 'RGB'); W, H = im.size
    rgb = np.asarray(im)[..., :3]
    big = Image.fromarray(subir(m, rgb)).resize((round(W * k), round(H * k)), Image.LANCZOS)
    if tem_alfa:
        a = im.getchannel('A').resize(big.size, Image.BICUBIC); big.putalpha(a)
    if sai.lower().endswith('.jpg'): big.save(sai, quality=92)
    else: big.save(sai, optimize=True)
