import os, sys, json, time, urllib.request, urllib.parse
G = "https://graph.facebook.com/v21.0"
T = os.environ["IG_ACCESS_TOKEN"]
def call(path, params=None, post=False):
    p = dict(params or {}); p["access_token"] = T
    data = urllib.parse.urlencode(p).encode()
    url = f"{G}/{path}" + ("" if post else "?" + data.decode())
    try:
        r = urllib.request.urlopen(urllib.request.Request(url, data=data if post else None))
        return json.load(r)
    except urllib.error.HTTPError as e:
        print("ERRO", e.code, e.read().decode()); sys.exit(1)
acc = call("me/accounts", {"fields": "id,name,instagram_business_account"})
print("Páginas:", json.dumps(acc))
ig = next((a["instagram_business_account"]["id"] for a in acc.get("data", []) if a.get("instagram_business_account")), None)
if not ig:
    print("Instagram não está ligado à Página Tipe."); sys.exit(1)
print("IG user id:", ig)
if os.environ.get("TESTE") == "true": sys.exit(0)
cfg = json.load(open(f"social-posts/{os.environ['POST']}.json"))
cap = open(f"social-posts/{cfg['caption_file']}").read()
base = "https://tipe.digital/social/"
kids = [call(f"{ig}/media", {"image_url": base + i, "is_carousel_item": "true"}, True)["id"] for i in cfg["images"]]
car = call(f"{ig}/media", {"media_type": "CAROUSEL", "children": ",".join(kids), "caption": cap}, True)["id"]
for _ in range(20):
    s = call(car, {"fields": "status_code"}).get("status_code")
    if s == "FINISHED": break
    time.sleep(3)
print("Publicado:", call(f"{ig}/media_publish", {"creation_id": car}, True))
