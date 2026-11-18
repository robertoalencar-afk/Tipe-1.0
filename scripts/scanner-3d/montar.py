"""Prepara a malha do OpenMVS para o cardápio, em duas etapas.

recortar (antes da textura, para a textura gastar resolução só no prato):
  acha o ponto para onde as câmeras olham (o prato), ajusta um plano à mesa em volta (RANSAC)
  e mantém só um disco de mesa em volta do prato, sem o que ficou embaixo da mesa.
  No modo "prato" (padrão) fica só o que está acima da mesa: no cardápio, o fundo é a mesa real
  do cliente, pela câmera do celular. Se nada se destaca da mesa, cai no disco ("mesa").
alinhar (depois da textura):
  aplica a transformação calculada no recorte: mesa na horizontal em y=0, câmeras para cima,
  escala aproximada em metros, e exporta .glb.

Uso:
  python3 montar.py recortar --malha mesh.ply --colmap dense/sparse --saida recorte.ply --transformacao T.json
  python3 montar.py alinhar  --malha textured.glb --colmap dense/sparse --saida prato.glb --transformacao T.json
"""
import argparse
import json
import os
import sys

import numpy as np
import trimesh

DIST_REAL_M = 0.40  # distância típica do celular ao prato ao dar a volta (dá a escala real)
RAIO_REL = 0.45  # raio do disco em relação à distância média das câmeras ao prato


def ler_cameras(pasta):
    centros, direcoes = [], []
    with open(os.path.join(pasta, "images.txt")) as f:
        linhas = [l for l in f if l.strip() and not l.startswith("#")]
    for l in linhas[::2]:
        p = l.split()
        qw, qx, qy, qz, tx, ty, tz = map(float, p[1:8])
        R = np.array([
            [1 - 2 * (qy * qy + qz * qz), 2 * (qx * qy - qz * qw), 2 * (qx * qz + qy * qw)],
            [2 * (qx * qy + qz * qw), 1 - 2 * (qx * qx + qz * qz), 2 * (qy * qz - qx * qw)],
            [2 * (qx * qz - qy * qw), 2 * (qy * qz + qx * qw), 1 - 2 * (qx * qx + qy * qy)],
        ])
        t = np.array([tx, ty, tz])
        centros.append(-R.T @ t)
        direcoes.append(R.T @ np.array([0.0, 0.0, 1.0]))
    return np.array(centros), np.array(direcoes)


def ponto_de_mira(c, d):
    """Ponto mais perto de todos os raios das câmeras (mínimos quadrados)."""
    A = np.zeros((3, 3))
    b = np.zeros(3)
    for ci, di in zip(c, d):
        P = np.eye(3) - np.outer(di, di)
        A += P
        b += P @ ci
    return np.linalg.lstsq(A, b, rcond=None)[0]


def plano_ransac(pts, limiar, iter_=500):
    rng = np.random.default_rng(7)
    if len(pts) > 60_000:
        pts = pts[rng.choice(len(pts), 60_000, replace=False)]
    melhor, melhor_n = None, -1
    for _ in range(iter_):
        a, b, c = pts[rng.choice(len(pts), 3, replace=False)]
        n = np.cross(b - a, c - a)
        if np.linalg.norm(n) < 1e-12:
            continue
        n /= np.linalg.norm(n)
        dentro = np.abs((pts - a) @ n) < limiar
        if dentro.sum() > melhor_n:
            melhor_n, melhor = dentro.sum(), dentro
    sel = pts[melhor]
    n = np.linalg.svd(sel - sel.mean(0))[2][-1]
    return n, melhor_n / len(pts)


def rotacao_para_y(n):
    y = np.array([0.0, 1.0, 0.0])
    v = np.cross(n, y)
    s, c = np.linalg.norm(v), float(n @ y)
    if s < 1e-9:
        return np.eye(3) if c > 0 else np.diag([1.0, -1.0, -1.0])
    vx = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
    return np.eye(3) + vx + vx @ vx * ((1 - c) / s**2)


def geometria(colmap, vertices):
    """Centro do prato, rotação que deixa a mesa horizontal, altura da mesa e raio do disco."""
    centros, direcoes = ler_cameras(colmap)
    mira = ponto_de_mira(centros, direcoes)
    dist = float(np.median(np.linalg.norm(centros - mira, axis=1)))
    raio = dist * RAIO_REL
    perto = vertices[np.linalg.norm(vertices - mira, axis=1) < raio * 1.3]
    if len(perto) < 500:
        sys.exit("ERRO: a malha ficou vazia em volta do prato. Grave com o prato no centro da tela.")
    n, frac = plano_ransac(perto, limiar=dist * 0.01)
    if float(np.mean(centros @ n - mira @ n)) < 0:
        n = -n  # câmeras ficam acima da mesa
    R = rotacao_para_y(n)
    alt = ((perto - mira) @ R.T)[:, 1]
    # A mesa é o pico do histograma de alturas (a maior superfície plana em volta do prato).
    passo = dist * 0.004
    cont, bordas = np.histogram(alt, bins=max(10, int((alt.max() - alt.min()) / passo)))
    pico = float(bordas[np.argmax(cont)] + passo / 2)
    perto_pico = np.abs(alt - pico) < dist * 0.01
    mesa = float(np.median(alt[perto_pico])) if perto_pico.any() else pico
    ruido = float(np.std(alt[perto_pico])) if perto_pico.sum() > 10 else dist * 0.003
    return {"mira": mira, "R": R, "mesa": mesa, "ruido": ruido, "raio": raio, "dist": dist, "frac": frac, "cameras": len(centros)}


def separar_prato(malha, g):
    """Só o que está acima da mesa (prato, comida, copo), sem a toalha escaneada: no cardápio o
    fundo é a mesa real do cliente, pela câmera. Devolve None se não achar nada acima da mesa."""
    v2 = (np.asarray(malha.vertices) - g["mira"]) @ g["R"].T
    h = v2[:, 1] - g["mesa"]
    horiz = np.linalg.norm(v2[:, [0, 2]], axis=1)
    limiar = max(4 * g["ruido"], g["dist"] * 0.006)
    acima = (h > limiar) & (horiz < g["raio"]) & (h < g["raio"] * 1.2)
    p = malha.copy()
    p.update_faces(acima[p.faces].all(axis=1))
    p.remove_unreferenced_vertices()
    if len(p.faces) < 2000:
        return None
    partes = p.split(only_watertight=False)
    if not len(partes):
        return None
    maior = max(len(x.faces) for x in partes)

    def perto_do_centro(x):
        c = ((x.vertices.mean(0) - g["mira"]) @ g["R"].T)[[0, 2]]
        return np.linalg.norm(c) < g["raio"] * 0.6

    # Peças soltas do mesmo prato (guarnição, alça do copo) ficam; ruído pequeno sai.
    keep = [x for x in partes if len(x.faces) >= maior * 0.03 and perto_do_centro(x)]
    if not keep:
        return None
    return trimesh.util.concatenate(keep)


def recortar(a):
    malha = trimesh.load(a.malha, force="mesh", process=False)
    g = geometria(a.colmap, np.asarray(malha.vertices))
    prato = separar_prato(malha, g) if a.modo == "prato" else None
    if prato is None:
        # Disco de mesa em volta do prato (modo "mesa" ou quando nada se destacou da mesa).
        v2 = (np.asarray(malha.vertices) - g["mira"]) @ g["R"].T
        h = v2[:, 1] - g["mesa"]
        horiz = np.linalg.norm(v2[:, [0, 2]], axis=1)
        manter = (horiz < g["raio"]) & (h > -g["dist"] * 0.02) & (h < g["raio"] * 1.2)
        malha.update_faces(manter[malha.faces].all(axis=1))
        malha.remove_unreferenced_vertices()
        partes = malha.split(only_watertight=False)
        if len(partes):
            malha = max(partes, key=lambda m: len(m.faces))
        modo = "mesa"
    else:
        malha, modo = prato, "prato"
    if len(malha.faces) < 2000:
        sys.exit("ERRO: sobrou pouco do prato depois do recorte. Grave mais perto e com mais luz.")
    malha.export(a.saida)
    with open(a.transformacao, "w") as f:
        json.dump(transformacao(g).tolist(), f)
    print(json.dumps({"etapa": "recortar", "modo": modo, "faces": int(len(malha.faces)),
                      "cameras": g["cameras"], "mesa_inliers": round(float(g["frac"]), 3)}))


def transformacao(g):
    """Mesa na horizontal em y=0, prato no centro, escala aproximada em metros."""
    escala = DIST_REAL_M / g["dist"]
    T = np.eye(4)
    T[:3, :3] = g["R"] * escala
    T[:3, 3] = -(g["R"] @ g["mira"]) * escala
    T[1, 3] -= g["mesa"] * escala
    return T


def alinhar(a):
    # A transformação vem do recorte, que ainda tinha a mesa para achar o plano.
    with open(a.transformacao) as f:
        T = np.array(json.load(f))
    cena = trimesh.load(a.malha, force="mesh", process=False)
    cena.apply_transform(T)
    lados = cena.bounds[1] - cena.bounds[0]
    cena.export(a.saida)
    print(json.dumps({"etapa": "alinhar", "faces": int(len(cena.faces)),
                      "tamanho_cm": [round(float(x) * 100, 1) for x in lados]}))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("etapa", choices=["recortar", "alinhar"])
    ap.add_argument("--malha", required=True)
    ap.add_argument("--colmap", required=True)
    ap.add_argument("--saida", required=True)
    ap.add_argument("--modo", choices=["prato", "mesa"], default="prato")
    ap.add_argument("--transformacao", required=True, help="JSON 4x4 gravado no recorte")
    a = ap.parse_args()
    recortar(a) if a.etapa == "recortar" else alinhar(a)


if __name__ == "__main__":
    main()
