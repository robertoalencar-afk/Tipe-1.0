"""Prepara a malha do OpenMVS para o cardápio, em duas etapas.

recortar (antes da textura, para a textura gastar resolução só no prato):
  acha o ponto para onde as câmeras olham (o prato), ajusta um plano à mesa em volta (RANSAC)
  e mantém só um disco de mesa em volta do prato, sem o que ficou embaixo da mesa.
alinhar (depois da textura):
  gira a cena para a mesa ficar na horizontal (câmeras para cima), põe a mesa em y=0 e o prato
  na escala aproximada real (disco com ~44 cm) e exporta .glb.

Uso:
  python3 montar.py recortar --malha mesh.ply --colmap dense/sparse --saida recorte.ply
  python3 montar.py alinhar  --malha textured.glb --colmap dense/sparse --saida prato.glb
"""
import argparse
import json
import os
import sys

import numpy as np
import trimesh

RAIO_REAL_M = 0.22  # raio do disco recortado (prato + um pouco de mesa)
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
    # A mesa é o plano: altura = mediana dos pontos dentro do limiar do plano.
    mesa = float(np.median(alt[np.abs(alt - np.median(alt)) < dist * 0.05])) if len(alt) else 0.0
    mesa = float(np.median(alt[np.abs(alt - mesa) < dist * 0.01])) if np.any(np.abs(alt - mesa) < dist * 0.01) else mesa
    return {"mira": mira, "R": R, "mesa": mesa, "raio": raio, "dist": dist, "frac": frac, "cameras": len(centros)}


def recortar(a):
    malha = trimesh.load(a.malha, force="mesh", process=False)
    g = geometria(a.colmap, np.asarray(malha.vertices))
    v2 = (np.asarray(malha.vertices) - g["mira"]) @ g["R"].T
    h = v2[:, 1] - g["mesa"]
    horiz = np.linalg.norm(v2[:, [0, 2]], axis=1)
    manter = (horiz < g["raio"]) & (h > -g["dist"] * 0.02) & (h < g["raio"] * 1.2)
    malha.update_faces(manter[malha.faces].all(axis=1))
    malha.remove_unreferenced_vertices()
    partes = malha.split(only_watertight=False)
    if len(partes):
        malha = max(partes, key=lambda m: len(m.faces))
    if len(malha.faces) < 2000:
        sys.exit("ERRO: sobrou pouco do prato depois do recorte. Grave mais perto e com mais luz.")
    malha.export(a.saida)
    print(json.dumps({"etapa": "recortar", "faces": int(len(malha.faces)), "cameras": g["cameras"],
                      "mesa_inliers": round(float(g["frac"]), 3)}))


def alinhar(a):
    cena = trimesh.load(a.malha, force="mesh", process=False)
    g = geometria(a.colmap, np.asarray(cena.vertices))
    escala = RAIO_REAL_M / g["raio"]
    T = np.eye(4)
    T[:3, :3] = g["R"] * escala
    T[:3, 3] = -(g["R"] @ g["mira"]) * escala
    T[1, 3] -= g["mesa"] * escala
    cena.apply_transform(T)
    cena.export(a.saida)
    print(json.dumps({"etapa": "alinhar", "faces": int(len(cena.faces)), "raio_m": RAIO_REAL_M}))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("etapa", choices=["recortar", "alinhar"])
    ap.add_argument("--malha", required=True)
    ap.add_argument("--colmap", required=True)
    ap.add_argument("--saida", required=True)
    a = ap.parse_args()
    recortar(a) if a.etapa == "recortar" else alinhar(a)


if __name__ == "__main__":
    main()
