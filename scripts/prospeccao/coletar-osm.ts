/**
 * Coletor da prospecção: mapeia restaurantes de uma cidade no OpenStreetMap (Overpass),
 * normaliza, pontua e grava em crm_prospects (sem mexer em status/cadência de quem já existe).
 *
 *   CIDADE=Fortaleza UF=CE DDD=85 bun scripts/prospeccao/coletar-osm.ts            # só arquivos
 *   GRAVAR=1 DATABASE_URL=postgres://... bun scripts/prospeccao/coletar-osm.ts      # grava no banco
 *
 * Saída: SAIDA (padrão ./prospeccao-saida) com <cidade>.csv e <cidade>.json.
 * Dados © colaboradores do OpenStreetMap, licença ODbL (atribuição na Central).
 * Usado pelo workflow .github/workflows/prospeccao.yml. Custo zero.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  consultaOverpass,
  faixa,
  processarOsm,
  type ElementoOsm,
  type Prospect,
} from "../../src/lib/tipe/prospeccao";

const CIDADE = process.env.CIDADE?.trim() || "Fortaleza";
const UF = (process.env.UF?.trim() || "CE").toUpperCase();
const DDD = process.env.DDD?.trim() || "85";
const SAIDA = process.env.SAIDA || "prospeccao-saida";
const GRAVAR = process.env.GRAVAR === "1";
const ENTRADA = process.env.ENTRADA; // JSON do Overpass já baixado (teste/offline)

const ESPELHOS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

async function baixar(): Promise<ElementoOsm[]> {
  if (ENTRADA) return JSON.parse(await Bun.file(ENTRADA).text()).elements;
  const corpo = new URLSearchParams({ data: consultaOverpass(CIDADE, UF) });
  let ultimoErro = "";
  for (const url of ESPELHOS) {
    for (let tentativa = 1; tentativa <= 2; tentativa++) {
      try {
        const r = await fetch(url, {
          method: "POST",
          body: corpo,
          headers: { "User-Agent": "tipe-prospeccao/1.0 (+https://tipe.digital)" },
          signal: AbortSignal.timeout(240_000),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = (await r.json()) as { elements?: ElementoOsm[]; remark?: string };
        if (!j.elements?.length)
          throw new Error(j.remark ?? "nenhum elemento (nome da cidade confere com o OSM?)");
        console.log(`overpass: ${j.elements.length} elementos de ${new URL(url).host}`);
        return j.elements;
      } catch (e) {
        ultimoErro = `${new URL(url).host}: ${(e as Error).message}`;
        console.warn(`falhou ${ultimoErro} (tentativa ${tentativa})`);
        await new Promise((ok) => setTimeout(ok, 5000 * tentativa));
      }
    }
  }
  throw new Error(`Overpass indisponível. Último erro: ${ultimoErro}`);
}

const COLUNAS = [
  "name",
  "category",
  "cuisine",
  "brand",
  "street",
  "number",
  "neighborhood",
  "city",
  "state",
  "postcode",
  "lat",
  "lon",
  "phone",
  "whatsapp",
  "website",
  "instagram",
  "email",
  "opening_hours",
  "score",
] as const;
const csvCampo = (v: unknown) => {
  const s = v == null ? "" : Array.isArray(v) ? v.join(" | ") : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function salvarArquivos(lista: Prospect[]) {
  mkdirSync(SAIDA, { recursive: true });
  const base = CIDADE.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
  const cab = ["faixa", ...COLUNAS, "motivos", "fonte"].join(",");
  const linhas = lista.map((p) =>
    [
      faixa(p.score),
      ...COLUNAS.map((c) => p[c]),
      p.score_reasons,
      `https://www.openstreetmap.org/${p.source_ref}`,
    ]
      .map(csvCampo)
      .join(","),
  );
  writeFileSync(join(SAIDA, `${base}.csv`), "\uFEFF" + [cab, ...linhas].join("\n"));
  writeFileSync(join(SAIDA, `${base}.json`), JSON.stringify(lista, null, 1));
  const por = (f: string) => lista.filter((p) => faixa(p.score) === f).length;
  const com = (k: keyof Prospect) => lista.filter((p) => p[k]).length;
  const resumo = {
    cidade: CIDADE,
    uf: UF,
    total: lista.length,
    A: por("A"),
    B: por("B"),
    C: por("C"),
    comTelefone: com("phone"),
    comWhatsapp: com("whatsapp"),
    comInstagram: com("instagram"),
    comSite: com("website"),
    comHorario: com("opening_hours"),
  };
  writeFileSync(join(SAIDA, `${base}-resumo.json`), JSON.stringify(resumo, null, 1));
  console.log(JSON.stringify(resumo));
  return resumo;
}

async function gravar(lista: Prospect[]) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("GRAVAR=1 exige DATABASE_URL");
  const { default: postgres } = await import("postgres");
  const sql = postgres(url, {
    max: 1,
    ssl: url.includes("localhost") || url.includes("/tmp") ? false : "require",
    onnotice: () => {},
  });
  try {
    const bloqueio = new Set(
      (await sql<{ value: string }[]>`select value from public.crm_optout`).map((r) => r.value),
    );
    const livres = lista.filter(
      (p) =>
        ![p.source_ref, p.phone, p.whatsapp, p.email, p.instagram].some(
          (v) => v && bloqueio.has(v),
        ),
    );
    let inserted = 0;
    let updated = 0;
    for (let i = 0; i < livres.length; i += 400) {
      const lote = livres
        .slice(i, i + 400)
        .map((p) => ({
          ...p,
          score_reasons: `{${p.score_reasons.map((r) => `"${r.replace(/["\\]/g, "")}"`).join(",")}}`,
        }));
      const r = await sql<{ novo: boolean }[]>`
        insert into public.crm_prospects ${sql(lote, "source", "source_ref", "name", "category", "cuisine", "brand", "street", "number", "neighborhood", "city", "state", "postcode", "lat", "lon", "phone", "whatsapp", "website", "instagram", "email", "opening_hours", "rating", "reviews_count", "score", "score_reasons")}
        on conflict (source, source_ref) do update set
          name = excluded.name, category = excluded.category, cuisine = excluded.cuisine, brand = excluded.brand,
          street = excluded.street, number = excluded.number, neighborhood = excluded.neighborhood, city = excluded.city,
          state = excluded.state, postcode = excluded.postcode, lat = excluded.lat, lon = excluded.lon,
          phone = coalesce(excluded.phone, crm_prospects.phone), whatsapp = coalesce(excluded.whatsapp, crm_prospects.whatsapp),
          website = coalesce(excluded.website, crm_prospects.website), instagram = coalesce(excluded.instagram, crm_prospects.instagram),
          email = coalesce(excluded.email, crm_prospects.email), opening_hours = coalesce(excluded.opening_hours, crm_prospects.opening_hours),
          score = excluded.score, score_reasons = excluded.score_reasons, last_seen_at = now(), updated_at = now()
        returning (xmax = 0) as novo`;
      inserted += r.filter((x) => x.novo).length;
      updated += r.length - r.filter((x) => x.novo).length;
    }
    const [{ n: apagados }] = await sql<
      { n: number }[]
    >`select public.crm_prospects_retencao() as n`;
    await sql`insert into public.crm_prospect_runs (source, city, state, found, inserted, updated, suppressed, detail)
      values ('osm', ${CIDADE}, ${UF}, ${lista.length}, ${inserted}, ${updated}, ${lista.length - livres.length}, ${`retenção removeu ${apagados}`})`;
    console.log(
      `banco: ${inserted} novos, ${updated} atualizados, ${lista.length - livres.length} bloqueados por opt-out, ${apagados} removidos pela retenção`,
    );
  } catch (e) {
    await sql`insert into public.crm_prospect_runs (source, city, state, found, status, detail) values ('osm', ${CIDADE}, ${UF}, ${lista.length}, 'failed', ${String((e as Error).message).slice(0, 300)})`.catch(
      () => {},
    );
    throw e;
  } finally {
    await sql.end();
  }
}

const elementos = await baixar();
const lista = processarOsm(elementos, CIDADE, UF, DDD);
salvarArquivos(lista);
if (GRAVAR) await gravar(lista);
