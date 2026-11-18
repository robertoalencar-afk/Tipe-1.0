#!/usr/bin/env node
// Processa a fila do Scanner 3D (tabela menu_item_scans). Roda no workflow scanner-3d.yml.
// Pega um prato "na_fila" de cada vez (troca de status condicional = ninguém pega o mesmo),
// baixa as fotos do bucket privado, roda reconstruir.sh e grava o .glb no bucket público.
//
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/scanner-3d/fila.mjs [--max 3]
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const URL_ = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) {
  console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const MAX = Number(process.argv[process.argv.indexOf("--max") + 1]) || 3;
const AQUI = dirname(fileURLToPath(import.meta.url));
const TMP = process.env.RUNNER_TEMP || "/tmp";
const H = { apikey: KEY, authorization: `Bearer ${KEY}` };

async function rest(caminho, init = {}) {
  const r = await fetch(`${URL_}/rest/v1/${caminho}`, {
    ...init,
    headers: { ...H, "content-type": "application/json", prefer: "return=representation", ...init.headers },
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
}
const agora = () => new Date().toISOString();
const atualizar = (id, campos, cond = "") =>
  rest(`menu_item_scans?id=eq.${id}${cond}`, {
    method: "PATCH",
    body: JSON.stringify({ ...campos, atualizado_em: agora() }),
  });

async function storage(caminho, init = {}) {
  const r = await fetch(`${URL_}/storage/v1/${caminho}`, { ...init, headers: { ...H, ...init.headers } });
  if (!r.ok) throw new Error(`storage ${r.status} ${await r.text()}`);
  return r;
}

// Prato preso em "processando" por mais de 3 h (job morto) volta para a fila.
await rest(
  `menu_item_scans?status=eq.processando&atualizado_em=lt.${new Date(Date.now() - 3 * 3600e3).toISOString()}`,
  { method: "PATCH", body: JSON.stringify({ status: "na_fila", atualizado_em: agora() }) },
);

for (let feitos = 0; feitos < MAX; feitos++) {
  const [prox] = await rest(
    "menu_item_scans?status=eq.na_fila&select=id,restaurant_id,total_fotos&order=criado_em.asc&limit=1",
  );
  if (!prox) {
    console.log("fila vazia");
    break;
  }
  const pego = await atualizar(prox.id, { status: "processando" }, "&status=eq.na_fila");
  if (!pego.length) continue;
  const { id, restaurant_id: rid } = prox;
  const w = join(TMP, `scan-${id}`);
  const fotos = join(w, "fotos");
  rmSync(w, { recursive: true, force: true });
  mkdirSync(fotos, { recursive: true });
  console.log(`== ${id} (${prox.total_fotos} fotos)`);
  try {
    const lista = await (
      await storage(`object/list/scans-3d`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prefix: `${rid}/${id}/`, limit: 200 }),
      })
    ).json();
    for (const f of lista) {
      const r = await storage(`object/authenticated/scans-3d/${rid}/${id}/${f.name}`);
      writeFileSync(join(fotos, f.name), Buffer.from(await r.arrayBuffer()));
    }
    const glb = join(w, "prato.glb");
    try {
      execFileSync(join(AQUI, "reconstruir.sh"), [fotos, join(w, "trabalho"), glb], {
        stdio: ["ignore", "inherit", "pipe"],
        timeout: 150 * 60e3,
      });
    } catch (e) {
      const msg = String(e.stderr ?? "").split("\n").find((l) => l.startsWith("ERRO:"));
      throw new Error(msg ? msg.slice(5).trim() : "A reconstrução falhou. Tente gravar de novo com mais luz.");
    }
    if (!existsSync(glb)) throw new Error("A reconstrução não gerou o modelo.");
    const destino = `${rid}/${id}.glb`;
    await storage(`object/modelos-3d/${destino}`, {
      method: "POST",
      headers: { "content-type": "model/gltf-binary", "x-upsert": "true", "cache-control": "max-age=31536000" },
      body: readFileSync(glb),
    });
    await atualizar(id, {
      status: "pronto",
      model_url: `${URL_}/storage/v1/object/public/modelos-3d/${destino}`,
      detalhe: null,
      processado_em: agora(),
    });
    console.log(`ok ${id}`);
  } catch (e) {
    console.error(`falhou ${id}:`, e);
    await atualizar(id, { status: "erro", detalhe: String(e.message ?? e).slice(0, 300), processado_em: agora() });
  } finally {
    rmSync(w, { recursive: true, force: true });
  }
}
