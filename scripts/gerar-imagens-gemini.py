"""Gera imagens com o Gemini a partir de social-ia/<lote>.json e salva em social-ia/<lote>/<nome>.jpg.
Uso (GitHub Actions, workflow "Gerar imagens com Gemini"): GEMINI_API_KEY no ambiente producao.
Formato do lote: {"base": "texto comum", "cenas": {"nome": {"aspecto": "4:5", "texto": "..."}}, "versoes": 2}"""
import base64, json, os, sys, urllib.request, urllib.error
lote = sys.argv[1]
cfg = json.load(open(f"social-ia/{lote}.json"))
key = os.environ["GEMINI_API_KEY"]
model = cfg.get("modelo", "gemini-3-pro-image-preview")
try:
    ms = json.load(urllib.request.urlopen(urllib.request.Request("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", headers={"x-goog-api-key": key}), timeout=60))
    print("modelos de imagem:", [m["name"] for m in ms.get("models", []) if "image" in m["name"]])
except urllib.error.HTTPError as e:
    print("lista de modelos: erro", e.code, e.read().decode()[:600])
saida = f"social-ia/{lote}"; os.makedirs(saida, exist_ok=True)
falhas = 0
for nome, c in cfg["cenas"].items():
    for v in range(1, cfg.get("versoes", 1) + 1):
        body = {"contents": [{"parts": [{"text": cfg.get("base", "") + c["texto"]}]}],
                "generationConfig": {"responseModalities": ["IMAGE"], "imageConfig": {"aspectRatio": c.get("aspecto", "4:5")}}}
        req = urllib.request.Request(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                                     data=json.dumps(body).encode(), headers={"Content-Type": "application/json", "x-goog-api-key": key})
        try:
            out = json.load(urllib.request.urlopen(req, timeout=280))
            img = next(p["inlineData"]["data"] for p in out["candidates"][0]["content"]["parts"] if "inlineData" in p)
            open(f"{saida}/{nome}-v{v}.jpg", "wb").write(base64.b64decode(img)); print("ok", nome, v)
        except urllib.error.HTTPError as e:
            falhas += 1; print("erro", e.code, nome, v, e.read().decode()[:900].replace("\n", " "))
        except Exception as e:
            falhas += 1; print("erro", nome, v, str(e)[:300])
print("falhas:", falhas)
