# Monta animacao.html (tudo embutido em data URIs) numa pasta de trabalho.
# Uso: python3 build.py <pasta-de-trabalho>   (rode antes: python3 plates.py <pasta-de-trabalho>)
import base64, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
A = os.path.join(HERE, '../../../src/assets/')
W = sys.argv[1]
def uri(path, mime):
    return f'data:{mime};base64,' + base64.b64encode(open(path, 'rb').read()).decode()
h = open(os.path.join(HERE, 'template.html')).read()
rep = {'__RIG__': open(os.path.join(HERE, 'rig.js')).read(),
       '__FONT__': uri(os.path.join(HERE, 'inter-tight-latin-var.woff2'), 'font/woff2'),
       '__logo__': uri(A + 'marca/tipe-logo.svg', 'image/svg+xml'),
       '__logoBranco__': uri(A + 'marca/tipe-logo-branco.svg', 'image/svg+xml'),
       '__META__': open(f'{W}/plates/meta.json').read()}
for k in ['T-cliente', 'H-cliente', 'H-gorjeta']:   # V6: sem a cena dos três amigos
    rep[f'__{k}__'] = uri(f'{W}/plates/{k}.jpg', 'image/jpeg')
for k in ['conta', 'metodos', 'pago']:   # telas reais do app (sem o mascote antigo)
    rep[f'__{k}__'] = uri(A + f'telas-reais/{k}-780.webp', 'image/webp')
for k, v in rep.items():
    assert k in h, k
    h = h.replace(k, v)
open(f'{W}/animacao.html', 'w').write(h)
print(len(h))
