# Troca as telas inventadas dos celulares das três lebres pela tela real "Pagamento realizado"
# (homografia de 4 pontos, cantos arredondados, leve brilho de vidro). Gera a cena corrigida
# em src/assets/cenas/lebre-tartaruga-amigos-{1600,800}.webp a partir da original guardada aqui.
import os, sys
import numpy as np, cv2
from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(AQUI, '../../..'))
ORIG = os.path.join(AQUI, 'fontes/lebre-tartaruga-amigos-original-1600.webp')
TELA = os.path.join(REPO, 'src/assets/telas-reais/pago-780.webp')
# cantos da tela (sup.esq, sup.dir, inf.dir, inf.esq) na imagem 1600x893; o notch fica no topo
QUADS = [
    [(855.0, 420.8), (890.0, 414.2), (915.8, 500.8), (875.8, 510.0)],
    [(1500.0, 420.8), (1534.2, 430.0), (1520.0, 520.0), (1480.8, 510.8)],
]

def compor(img, tela, quad):
    H, W = img.shape[:2]; th, tw = tela.shape[:2]
    src = np.float32([(0, 0), (tw, 0), (tw, th), (0, th)])
    M = cv2.getPerspectiveTransform(src, np.float32(quad))
    rgb = cv2.warpPerspective(tela, M, (W, H), flags=cv2.INTER_AREA, borderMode=cv2.BORDER_REPLICATE)
    # máscara com cantos arredondados, desenhada no espaço da tela e projetada
    m = np.zeros((th, tw), np.uint8); r = int(tw*0.11)
    cv2.rectangle(m, (r, 0), (tw-r, th), 255, -1); cv2.rectangle(m, (0, r), (tw, th-r), 255, -1)
    for cx, cy in ((r, r), (tw-r, r), (tw-r, th-r), (r, th-r)): cv2.circle(m, (cx, cy), r, 255, -1)
    a = cv2.warpPerspective(m, M, (W, H), flags=cv2.INTER_LINEAR).astype(float)/255
    a = cv2.GaussianBlur(a, (0, 0), 0.6)[..., None]
    rgb = rgb.astype(float)
    # acabamento: tela um pouco menos saturada que a ilustração, brilho diagonal do vidro
    cinza = rgb.mean(2, keepdims=True); rgb = rgb*0.9 + cinza*0.1
    yy, xx = np.mgrid[0:H, 0:W]; (x0, y0), (x2, y2) = quad[0], quad[2]
    t = ((xx-x0)*(x2-x0) + (yy-y0)*(y2-y0)) / ((x2-x0)**2 + (y2-y0)**2)
    brilho = np.exp(-((t-0.28)/0.09)**2)*14
    rgb = np.clip(rgb*0.97 + brilho[..., None], 0, 255)
    return img*(1-a) + rgb*a

def main():
    img = np.asarray(Image.open(ORIG).convert('RGB')).astype(float)
    tela = np.asarray(Image.open(TELA).convert('RGB'))
    for q in QUADS: img = compor(img, tela, q)
    out = Image.fromarray(np.clip(img, 0, 255).astype('uint8'))
    dest = sys.argv[1] if len(sys.argv) > 1 else os.path.join(REPO, 'src/assets/cenas')
    out.save(os.path.join(dest, 'lebre-tartaruga-amigos-1600.webp'), quality=90)
    out.resize((800, 447), Image.LANCZOS).save(os.path.join(dest, 'lebre-tartaruga-amigos-800.webp'), quality=88)

if __name__ == '__main__':
    main()
