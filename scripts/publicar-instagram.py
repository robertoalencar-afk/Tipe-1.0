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
def try_(path, params=None):
    p = dict(params or {}); p["access_token"] = T
    try:
        return json.load(urllib.request.urlopen(f"{G}/{path}?" + urllib.parse.urlencode(p)))
    except urllib.error.HTTPError as e:
        return {"erro": e.read().decode()[:300]}
print("me:", try_("me", {"fields": "id,name"}))
print("perms:", try_("me/permissions"))
print("ig direto:", try_("1336689299531224", {"fields": "id,username"}))
print("page direto:", try_("1445302748676142", {"fields": "id,name,instagram_business_account"}))
print("negocio paginas:", try_("1853035621419002/owned_pages", {"fields": "id,name,instagram_business_account"}))
print("negocio ig:", try_("1853035621419002/owned_instagram_accounts", {"fields": "id,username"}))
sys.exit(0)
