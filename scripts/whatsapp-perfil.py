#!/usr/bin/env python3
"""Atualiza o perfil comercial do WhatsApp da Tipe pela Cloud API oficial da Meta.

Roda no GitHub Actions (workflow "Perfil do WhatsApp"), com WHATSAPP_TOKEN e
WHATSAPP_PHONE_NUMBER_ID do ambiente producao. Nunca imprime o token.
TESTE=true só lê e mostra o perfil atual.
"""
import json, os, sys, urllib.parse, urllib.request

GRAPH = "https://graph.facebook.com/v26.0"
TOKEN = os.environ.get("WHATSAPP_TOKEN", "")
PNID = os.environ.get("WHATSAPP_PHONE_NUMBER_ID", "")
TESTE = os.environ.get("TESTE", "false") == "true"
FOTO = os.path.join(os.path.dirname(__file__), "..", "public", "whatsapp", "perfil-tipe.jpg")

PERFIL = {
    "messaging_product": "whatsapp",
    "about": "Conta paga pelo celular, mesa livre mais rápido.",
    "description": (
        "A Tipe é a plataforma de pagamento e operação para restaurantes, bares e cafés. "
        "O cliente abre a conta pelo QR Code da mesa, escolhe o que vai pagar e paga com Pix "
        "ou carteira digital, sem esperar a maquininha. A casa ainda ganha cardápio com pedido "
        "pelo celular, tela da cozinha, área do garçom com gorjeta e gestão do salão em tempo real. "
        "Fale com a gente por aqui para agendar uma demonstração de 20 minutos. Equipe de segunda "
        "a sexta, das 8h às 18h."
    ),
    "address": "Fortaleza, CE",
    "email": "contato@tipe.digital",
    "websites": ["https://tipe.digital/", "https://tipe.digital/simulador"],
    "vertical": "PROF_SERVICES",
}


def req(method, url, data=None, headers=None, raw=None):
    h = {"Authorization": f"Bearer {TOKEN}"}
    h.update(headers or {})
    body = raw if raw is not None else (json.dumps(data).encode() if data is not None else None)
    if data is not None:
        h["Content-Type"] = "application/json"
    r = urllib.request.Request(url, data=body, method=method, headers=h)
    try:
        with urllib.request.urlopen(r, timeout=60) as resp:
            return resp.status, json.loads(resp.read() or b"{}")
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read() or b"{}")
        except Exception:
            return e.code, {}


def erro(j):
    return (j.get("error") or {}).get("message", "sem detalhe")


def foto_handle():
    """Upload retomável da Meta: precisa do id do app dono do token (lido no debug_token)."""
    s, j = req("GET", f"{GRAPH}/debug_token?input_token={urllib.parse.quote(TOKEN)}")
    app = (j.get("data") or {}).get("app_id")
    if s != 200 or not app:
        print(f"Foto: não achei o app do token ({erro(j)}). Coloque a foto pelo celular.")
        return None
    dados = open(FOTO, "rb").read()
    q = urllib.parse.urlencode({"file_name": "perfil-tipe.jpg", "file_length": len(dados), "file_type": "image/jpeg"})
    s, j = req("POST", f"{GRAPH}/{app}/uploads?{q}")
    sessao = j.get("id")
    if s != 200 or not sessao:
        print(f"Foto: sessão de upload recusada ({erro(j)}).")
        return None
    s, j = req("POST", f"{GRAPH}/{sessao}", raw=dados, headers={"Authorization": f"OAuth {TOKEN}", "file_offset": "0"})
    if s != 200 or not j.get("h"):
        print(f"Foto: envio recusado ({erro(j)}).")
        return None
    return j["h"]


def main():
    if not TOKEN or not PNID:
        sys.exit("Faltam WHATSAPP_TOKEN e WHATSAPP_PHONE_NUMBER_ID no ambiente producao.")
    campos = "about,address,description,email,profile_picture_url,websites,vertical"
    s, j = req("GET", f"{GRAPH}/{PNID}?fields=display_phone_number,verified_name,quality_rating")
    print("Número:", json.dumps({k: j.get(k) for k in ("display_phone_number", "verified_name", "quality_rating")}, ensure_ascii=False) if s == 200 else f"erro {s}: {erro(j)}")
    s, j = req("GET", f"{GRAPH}/{PNID}/whatsapp_business_profile?fields={campos}")
    print("Perfil atual:", json.dumps(j.get("data", j), ensure_ascii=False, indent=1) if s == 200 else f"erro {s}: {erro(j)}")
    if TESTE:
        return
    corpo = dict(PERFIL)
    h = foto_handle()
    if h:
        corpo["profile_picture_handle"] = h
    s, j = req("POST", f"{GRAPH}/{PNID}/whatsapp_business_profile", data=corpo)
    if s != 200 or not j.get("success"):
        sys.exit(f"Meta recusou o perfil ({s}): {erro(j)}")
    s, j = req("GET", f"{GRAPH}/{PNID}/whatsapp_business_profile?fields={campos}")
    print("Perfil novo:", json.dumps(j.get("data", j), ensure_ascii=False, indent=1))
    print("Foto:", "atualizada" if h else "não enviada (ver acima)")


main()
