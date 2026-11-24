"""Publica no Instagram @tipe.digital via Graph API.
POST=<nome em social-posts/> publica na hora. AGENDA=1 publica o que estiver em
social-posts/agenda.json com horário vencido há menos de 75 min (sem repetir).
Só entram na agenda posts aprovados por Roberto."""
import os, sys, json, time, datetime, urllib.request, urllib.parse
G = "https://graph.facebook.com/v21.0"
T = os.environ["IG_ACCESS_TOKEN"]
BASE = "https://tipe.digital/social/"
def call(path, params=None, post=False):
    p = dict(params or {}); p["access_token"] = T
    data = urllib.parse.urlencode(p).encode()
    url = f"{G}/{path}" + ("" if post else "?" + data.decode())
    try:
        return json.load(urllib.request.urlopen(urllib.request.Request(url, data=data if post else None)))
    except urllib.error.HTTPError as e:
        print("ERRO", e.code, e.read().decode()); sys.exit(1)
pg = call("1445302748676142", {"fields": "instagram_business_account"})
ig = (pg.get("instagram_business_account") or {}).get("id")
if not ig: print("Instagram não está ligado à Página Tipe."); sys.exit(1)
print("IG user id:", ig)
if os.environ.get("TESTE") == "true": sys.exit(0)
def espera(cid, n=60):
    for _ in range(n):
        s = call(cid, {"fields": "status_code"}).get("status_code")
        if s == "FINISHED": return
        if s == "ERROR": print("ERRO no processamento", cid, call(cid, {"fields": "status"})); sys.exit(1)
        time.sleep(5)
def item(f, carrossel):
    p = {"video_url": BASE + f, "media_type": "VIDEO"} if f.endswith(".mp4") else {"image_url": BASE + f}
    if carrossel: p["is_carousel_item"] = "true"
    elif f.endswith(".mp4"): p["media_type"] = "REELS"
    return p
def publicar(nome):
    cfg = json.load(open(f"social-posts/{nome}.json")); cap = open(f"social-posts/{cfg['caption_file']}").read()
    recentes = call(f"{ig}/media", {"fields": "caption", "limit": "8"}).get("data", [])
    if any((m.get("caption") or "")[:80] == cap[:80] for m in recentes): print("Já publicado:", nome); return
    arqs = cfg["images"]
    if len(arqs) > 1:
        kids = []
        for f in arqs:
            k = call(f"{ig}/media", item(f, True), True)["id"]; espera(k); kids.append(k)
        cid = call(f"{ig}/media", {"media_type": "CAROUSEL", "children": ",".join(kids), "caption": cap}, True)["id"]
    else:
        p = item(arqs[0], False); p["caption"] = cap; cid = call(f"{ig}/media", p, True)["id"]
    espera(cid)
    print("Publicado:", nome, call(f"{ig}/media_publish", {"creation_id": cid}, True))
if os.environ.get("AGENDA") == "1":
    agora = datetime.datetime.now(datetime.timezone.utc)
    for e in json.load(open("social-posts/agenda.json")):
        q = datetime.datetime.fromisoformat(e["quando"])
        if datetime.timedelta(0) <= agora - q < datetime.timedelta(minutes=75): publicar(e["post"])
else:
    publicar(os.environ["POST"])
