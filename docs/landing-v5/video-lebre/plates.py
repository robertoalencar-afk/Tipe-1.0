# Gera os 'pratos' (cada metade do díptico estendida para caber no movimento de câmera).
# Uso: python3 plates.py <pasta-de-trabalho>
import os, sys
from PIL import Image, ImageFilter
import numpy as np, json
HERE=os.path.dirname(os.path.abspath(__file__))
SRC=os.path.join(HERE,'../../../src/assets/cenas/lebre-tartaruga-%s-1600.webp')
OUT=sys.argv[1]; os.makedirs(OUT+'/plates',exist_ok=True)
S={'cliente':(789,809),'amigos':(795,803),'gorjeta':(786,812)}
PX,PY=900,520
meta={}
for f,(l,r) in S.items():
  im=Image.open(SRC%f).convert('RGB')
  for side,box in (('T',(0,0,l-3,893)),('H',(r+3,0,1600,893))):
    h=im.crop(box); a=np.asarray(h)
    p=np.pad(a,((PY,PY),(PX,PX),(0,0)),mode='edge')
    P=Image.fromarray(p).filter(ImageFilter.GaussianBlur(10))
    # paste original with feathered mask
    m=Image.new('L',h.size,0); 
    mm=np.zeros((h.size[1],h.size[0]),float)
    yy,xx=np.mgrid[0:h.size[1],0:h.size[0]]
    d=np.minimum.reduce([xx,yy,h.size[0]-1-xx,h.size[1]-1-yy]).astype(float)
    mm=np.clip(d/8,0,1)
    P.paste(h,(PX,PY),Image.fromarray((mm*255).astype('uint8')))
    # add faint noise to extension to avoid banding
    q=np.asarray(P).astype(float)+np.random.default_rng(1).normal(0,1.2,(P.size[1],P.size[0],1))
    P=Image.fromarray(np.clip(q,0,255).astype('uint8'))
    name=f'{side}-{f}'
    P.save(f'{OUT}/plates/{name}.jpg',quality=88)
    meta[name]={'w':P.size[0],'h':P.size[1],'ix':PX,'iy':PY,'iw':h.size[0],'ih':h.size[1]}
json.dump(meta,open(f'{OUT}/plates/meta.json','w'))
print(meta)
