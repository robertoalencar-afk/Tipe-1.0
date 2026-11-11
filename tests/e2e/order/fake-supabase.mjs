// Supabase falso para testes de ponta a ponta locais: um subconjunto do
// PostgREST (/rest/v1) e do GoTrue (/auth/v1) por cima de um Postgres local
// montado pelos scripts de tests/db. Cada requisição roda com o papel do JWT
// (anon, authenticated ou service_role), então RLS e GRANTs valem de verdade.
//
// Nunca aponte para produção. Uso: node tests/e2e/order/fake-supabase.mjs
//   PGHOST, PGPORT, PGUSER, TIPE_E2E_DB (padrão tipe_e2e), FAKE_SUPABASE_PORT (54321)
import http from "node:http";
import postgres from "postgres";
import { SignJWT, jwtVerify } from "jose";

export const JWT_SECRET = "tipe-e2e-local-secret-nao-usar-em-producao-0123456789";
const secret = new TextEncoder().encode(JWT_SECRET);
export const TEST_PASSWORD = "demo1234";

export async function signKey(role, extra = {}) {
  return new SignJWT({ role, ...extra })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret);
}

const sql = postgres({
  host: process.env.PGHOST ?? "/var/tmp/pg",
  port: Number(process.env.PGPORT ?? 5432),
  user: process.env.PGUSER ?? "postgres",
  database: process.env.TIPE_E2E_DB ?? "tipe_e2e",
  max: 8,
  onnotice: () => {},
});

const ident = (s) => {
  if (!/^[a-z_][a-z0-9_]*$/i.test(s)) throw httpError(400, `identificador inválido: ${s}`);
  return `"${s}"`;
};
function httpError(status, message, code = "PGRST100") {
  const e = new Error(message);
  e.status = status;
  e.code = code;
  return e;
}

async function claimsFrom(req) {
  const auth = req.headers["authorization"]?.replace(/^Bearer /, "") || req.headers["apikey"];
  if (!auth) return { role: "anon" };
  try {
    const { payload } = await jwtVerify(auth, secret);
    return payload;
  } catch {
    throw httpError(401, "JWT inválido", "PGRST301");
  }
}

// ---------------- select com recursos embutidos ----------------
function splitTop(s) {
  const out = [];
  let depth = 0,
    cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

const fkCache = new Map();
async function relation(from, to) {
  const key = `${from}->${to}`;
  if (fkCache.has(key)) return fkCache.get(key);
  const rows = await sql`
    SELECT c.conrelid::regclass::text AS src, c.confrelid::regclass::text AS dst,
      (SELECT array_agg(a.attname ORDER BY k.n) FROM unnest(c.conkey) WITH ORDINALITY k(attnum, n) JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum) AS src_cols,
      (SELECT array_agg(a.attname ORDER BY k.n) FROM unnest(c.confkey) WITH ORDINALITY k(attnum, n) JOIN pg_attribute a ON a.attrelid = c.confrelid AND a.attnum = k.attnum) AS dst_cols
    FROM pg_constraint c
    WHERE c.contype = 'f' AND ((c.conrelid = ${"public." + from}::regclass AND c.confrelid = ${"public." + to}::regclass)
       OR (c.conrelid = ${"public." + to}::regclass AND c.confrelid = ${"public." + from}::regclass))`;
  if (!rows.length) throw httpError(400, `sem relação entre ${from} e ${to}`, "PGRST200");
  const r = rows[0];
  const strip = (t) => t.replace(/^public\./, "");
  const rel =
    strip(r.src) === from
      ? { kind: "one", on: r.src_cols.map((c, i) => [c, r.dst_cols[i]]) } // from.c = to.d
      : { kind: "many", on: r.dst_cols.map((c, i) => [c, r.src_cols[i]]) }; // from.c = to.d (to referencia from)
  fkCache.set(key, rel);
  return rel;
}

async function selectList(table, alias, select) {
  const parts = splitTop(select || "*");
  const cols = [];
  for (const p of parts) {
    const m = p.match(/^(?:([a-z_][a-z0-9_]*):)?([a-z_][a-z0-9_]*)(?:!inner)?\((.*)\)$/i);
    if (m) {
      const [, as, rel, inner] = m;
      const r = await relation(table, rel);
      const sub = `${alias}_${rel}`;
      const innerCols = await selectList(rel, sub, inner);
      const on = r.on.map(([a, b]) => `${sub}.${ident(b)} = ${alias}.${ident(a)}`).join(" AND ");
      const body = `SELECT ${innerCols} FROM public.${ident(rel)} ${sub} WHERE ${on}`;
      cols.push(
        r.kind === "one"
          ? `(SELECT row_to_json(x) FROM (${body} LIMIT 1) x) AS ${ident(as ?? rel)}`
          : `(SELECT coalesce(json_agg(x), '[]'::json) FROM (${body}) x) AS ${ident(as ?? rel)}`,
      );
    } else if (p === "*") {
      cols.push(`${alias}.*`);
    } else {
      const [name, as] = p.includes(":") ? p.split(":").reverse() : [p, null];
      const clean = name.replace(/::.*$/, "");
      cols.push(`${alias}.${ident(clean)}${as ? ` AS ${ident(as)}` : ""}`);
    }
  }
  return cols.join(", ");
}

// ---------------- filtros ----------------
const RESERVED = new Set(["select", "order", "limit", "offset", "on_conflict", "columns"]);
function parseValue(v) {
  return decodeURIComponent(v);
}
function filterSql(alias, col, expr, params) {
  let not = false;
  if (expr.startsWith("not.")) {
    not = true;
    expr = expr.slice(4);
  }
  const dot = expr.indexOf(".");
  const op = expr.slice(0, dot),
    raw = expr.slice(dot + 1);
  const c = `${alias}.${ident(col)}`;
  const p = (v) => {
    params.push(v);
    return `$${params.length}`;
  };
  let s;
  switch (op) {
    case "eq":
      s = `${c}::text = ${p(raw)}`;
      break;
    case "neq":
      s = `${c}::text <> ${p(raw)}`;
      break;
    case "gt":
      s = `${c} > ${p(raw)}`;
      break;
    case "gte":
      s = `${c} >= ${p(raw)}`;
      break;
    case "lt":
      s = `${c} < ${p(raw)}`;
      break;
    case "lte":
      s = `${c} <= ${p(raw)}`;
      break;
    case "like":
      s = `${c}::text LIKE ${p(raw.replace(/\*/g, "%"))}`;
      break;
    case "ilike":
      s = `${c}::text ILIKE ${p(raw.replace(/\*/g, "%"))}`;
      break;
    case "is":
      s = raw === "null" ? `${c} IS NULL` : raw === "true" ? `${c} IS TRUE` : `${c} IS FALSE`;
      break;
    case "in": {
      const items = raw
        .replace(/^\(|\)$/g, "")
        .split(",")
        .map((x) => x.replace(/^"|"$/g, ""));
      s = items.length ? `${c}::text IN (${items.map((x) => p(x)).join(", ")})` : "false";
      break;
    }
    case "cs":
      s = `${c} @> ${p(raw)}`;
      break;
    default:
      throw httpError(400, `operador não suportado: ${op}`);
  }
  return not ? `NOT (${s})` : s;
}
function whereFrom(url, alias, params) {
  const conds = [];
  for (const [k, v] of url.searchParams) {
    if (RESERVED.has(k)) continue;
    if (k === "or") {
      const inner = v.replace(/^\(|\)$/g, "");
      const ors = splitTop(inner).map((part) => {
        const [col, ...rest] = part.split(".");
        return filterSql(alias, col, rest.join("."), params);
      });
      conds.push(`(${ors.join(" OR ")})`);
      continue;
    }
    conds.push(filterSql(alias, k, v, params));
  }
  return conds.length ? `WHERE ${conds.join(" AND ")}` : "";
}
function orderFrom(url, alias) {
  const o = url.searchParams.get("order");
  if (!o) return "";
  return (
    "ORDER BY " +
    o
      .split(",")
      .map((part) => {
        const [col, dir, nulls] = part.split(".");
        return `${alias}.${ident(col)} ${dir === "desc" ? "DESC" : "ASC"}${nulls === "nullsfirst" ? " NULLS FIRST" : nulls === "nullslast" ? " NULLS LAST" : ""}`;
      })
      .join(", ")
  );
}

// ---------------- execução com papel ----------------
async function asRole(claims, fn) {
  const role = ["anon", "authenticated", "service_role"].includes(claims.role)
    ? claims.role
    : "anon";
  return sql.begin(async (tx) => {
    await tx.unsafe(`SET LOCAL ROLE ${role}`);
    await tx`SELECT set_config('request.jwt.claims', ${JSON.stringify(claims)}, true),
                    set_config('request.jwt.claim.sub', ${claims.sub ?? ""}, true),
                    set_config('request.jwt.claim.role', ${role}, true),
                    set_config('search_path', 'public, extensions', true)`;
    return fn(tx);
  });
}

async function handleRest(req, res, url, body) {
  const claims = await claimsFrom(req);
  const path = url.pathname.replace(/^\/rest\/v1\//, "");
  const prefer = req.headers["prefer"] ?? "";
  const wantObject = (req.headers["accept"] ?? "").includes("vnd.pgrst.object");

  if (path.startsWith("rpc/")) {
    const fn = path.slice(4);
    const args = body ? JSON.parse(body) : Object.fromEntries(url.searchParams);
    const procs = await sql`
      SELECT p.proretset, p.proargnames, p.pronargs,
        (SELECT array_agg(format_type(t, NULL) ORDER BY n) FROM unnest(p.proargtypes) WITH ORDINALITY u(t, n)) AS types,
        format_type(p.prorettype, NULL) AS rettype
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = ${fn}`;
    const keys = Object.keys(args);
    const proc =
      procs.find((p) => keys.every((k) => (p.proargnames ?? []).includes(k))) ?? procs[0];
    if (!proc) throw httpError(404, `função ${fn} não encontrada`, "PGRST202");
    const params = [];
    const named = keys.map((k) => {
      const i = proc.proargnames.indexOf(k);
      const v = args[k];
      params.push(v === null ? null : typeof v === "object" ? JSON.stringify(v) : String(v));
      return `${ident(k)} => $${params.length}::text::${proc.types[i]}`;
    });
    const call = `public.${ident(fn)}(${named.join(", ")})`;
    const q = proc.proretset
      ? `SELECT coalesce(json_agg(x), '[]'::json) AS v FROM ${call} x`
      : proc.rettype === "void"
        ? `SELECT ${call}, null::json AS v`
        : `SELECT to_json(${call}) AS v`;
    const rows = await asRole(claims, (tx) => tx.unsafe(q, params));
    return send(res, 200, rows[0]?.v ?? null);
  }

  const table = path;
  ident(table);
  const params = [];
  if (req.method === "GET" || req.method === "HEAD") {
    const cols = await selectList(table, "t0", url.searchParams.get("select"));
    const where = whereFrom(url, "t0", params);
    const order = orderFrom(url, "t0");
    const limit = url.searchParams.get("limit")
      ? `LIMIT ${Number(url.searchParams.get("limit"))}`
      : "";
    const offset = url.searchParams.get("offset")
      ? `OFFSET ${Number(url.searchParams.get("offset"))}`
      : "";
    const q = `SELECT coalesce(json_agg(x), '[]'::json) AS v, (SELECT count(*) FROM public.${ident(table)} t0 ${where}) AS n
      FROM (SELECT ${cols} FROM public.${ident(table)} t0 ${where} ${order} ${limit} ${offset}) x`;
    const rows = await asRole(claims, (tx) => tx.unsafe(q, params));
    const data = rows[0].v;
    const headers = prefer.includes("count=")
      ? { "content-range": `0-${Math.max(0, data.length - 1)}/${rows[0].n}` }
      : {};
    if (wantObject) {
      if (data.length !== 1)
        return send(res, 406, {
          code: "PGRST116",
          message: "JSON object requested, multiple (or no) rows returned",
          details: `${data.length} rows`,
          hint: null,
        });
      return send(res, 200, data[0], headers);
    }
    return send(res, 200, req.method === "HEAD" ? null : data, headers);
  }

  const returning = prefer.includes("return=representation");
  const sel = returning ? await selectList(table, "t0", url.searchParams.get("select")) : null;
  if (req.method === "POST") {
    const rowsIn = [].concat(JSON.parse(body || "[]"));
    if (!rowsIn.length) return send(res, 201, []);
    const keys = [...new Set(rowsIn.flatMap((r) => Object.keys(r)))];
    params.push(JSON.stringify(rowsIn));
    const conflict = url.searchParams.get("on_conflict");
    const upsert = prefer.includes("resolution=merge-duplicates");
    const ignore = prefer.includes("resolution=ignore-duplicates");
    const onConflict =
      upsert || ignore
        ? ` ON CONFLICT ${conflict ? `(${conflict.split(",").map(ident).join(", ")})` : ""} DO ${ignore ? "NOTHING" : `UPDATE SET ${keys.map((k) => `${ident(k)} = EXCLUDED.${ident(k)}`).join(", ")}`}`
        : "";
    const q = `WITH t0 AS (INSERT INTO public.${ident(table)} (${keys.map(ident).join(", ")})
        SELECT ${keys.map(ident).join(", ")} FROM json_populate_recordset(null::public.${ident(table)}, $1::text::json)${onConflict} RETURNING *)
      SELECT coalesce(json_agg(x), '[]'::json) AS v FROM (SELECT ${sel ?? "t0.*"} FROM t0) x`;
    const rows = await asRole(claims, (tx) => tx.unsafe(q, params));
    const data = rows[0].v;
    return send(res, 201, returning ? (wantObject ? (data[0] ?? null) : data) : null);
  }
  if (req.method === "PATCH") {
    const patch = JSON.parse(body || "{}");
    const keys = Object.keys(patch);
    params.push(JSON.stringify(patch));
    const where = whereFrom(url, "u", params);
    const q = `WITH t0 AS (UPDATE public.${ident(table)} u SET ${keys.map((k) => `${ident(k)} = n.${ident(k)}`).join(", ")}
        FROM json_populate_record(null::public.${ident(table)}, $1::text::json) n ${where} RETURNING u.*)
      SELECT coalesce(json_agg(x), '[]'::json) AS v FROM (SELECT ${sel ?? "t0.*"} FROM t0) x`;
    const rows = await asRole(claims, (tx) => tx.unsafe(q, params));
    const data = rows[0].v;
    return send(res, 200, returning ? (wantObject ? (data[0] ?? null) : data) : null);
  }
  if (req.method === "DELETE") {
    const where = whereFrom(url, "u", params);
    const q = `WITH t0 AS (DELETE FROM public.${ident(table)} u ${where} RETURNING u.*)
      SELECT coalesce(json_agg(x), '[]'::json) AS v FROM (SELECT ${sel ?? "t0.*"} FROM t0) x`;
    const rows = await asRole(claims, (tx) => tx.unsafe(q, params));
    return send(res, 200, returning ? rows[0].v : null);
  }
  throw httpError(405, "método não suportado");
}

// ---------------- auth ----------------
async function session(user, extra = {}) {
  const access_token = await signKey("authenticated", {
    sub: user.id,
    email: user.email,
    aud: "authenticated",
    aal: extra.aal ?? "aal1",
    session_id: crypto.randomUUID(),
  });
  const now = Math.floor(Date.now() / 1000);
  return {
    access_token,
    token_type: "bearer",
    expires_in: 43200,
    expires_at: now + 43200,
    refresh_token: `${user.id}.${crypto.randomUUID()}`,
    user: userJson(user),
  };
}
const userJson = (u) => ({
  id: u.id,
  aud: "authenticated",
  role: "authenticated",
  email: u.email,
  email_confirmed_at: new Date().toISOString(),
  app_metadata: { provider: "email" },
  user_metadata: {},
  identities: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});
async function handleAuth(req, res, url, body) {
  const p = url.pathname.replace(/^\/auth\/v1/, "");
  if (p === "/token") {
    const grant = url.searchParams.get("grant_type");
    const b = JSON.parse(body || "{}");
    let user;
    if (grant === "password") {
      if (b.password !== TEST_PASSWORD)
        return send(res, 400, {
          error: "invalid_grant",
          error_description: "Invalid login credentials",
          msg: "Invalid login credentials",
        });
      [user] = await sql`SELECT id, email FROM auth.users WHERE email = ${b.email}`;
    } else if (grant === "refresh_token") {
      [user] =
        await sql`SELECT id, email FROM auth.users WHERE id = ${String(b.refresh_token).split(".")[0]}`;
    }
    if (!user)
      return send(res, 400, {
        error: "invalid_grant",
        error_description: "Invalid login credentials",
        msg: "Invalid login credentials",
      });
    // Fundador de teste entra com 2FA já validado (aal2), para o backoffice abrir.
    const [founder] =
      await sql`SELECT 1 FROM user_roles WHERE user_id = ${user.id} AND role = 'founder'`;
    return send(res, 200, await session(user, { aal: founder ? "aal2" : "aal1" }));
  }
  if (p === "/user") {
    const claims = await claimsFrom(req);
    if (!claims.sub) return send(res, 401, { msg: "not authenticated" });
    const [user] = await sql`SELECT id, email FROM auth.users WHERE id = ${claims.sub}`;
    return user ? send(res, 200, userJson(user)) : send(res, 401, { msg: "user not found" });
  }
  if (p === "/logout") return send(res, 204, null);
  if (p.startsWith("/factors") || p === "/factors")
    return send(res, 200, { all: [], totp: [], phone: [] });
  if (p === "/.well-known/jwks.json") return send(res, 200, { keys: [] });
  return send(res, 404, { msg: `auth ${p} não implementado` });
}

function send(res, status, data, headers = {}) {
  res.writeHead(status, {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "access-control-expose-headers": "content-range",
    ...headers,
  });
  res.end(data === null || status === 204 ? "" : JSON.stringify(data));
}

export function start(port = Number(process.env.FAKE_SUPABASE_PORT ?? 54321)) {
  const server = http.createServer(async (req, res) => {
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "*",
        "access-control-allow-methods": "*",
      });
      return res.end();
    }
    let body = "";
    for await (const chunk of req) body += chunk;
    const url = new URL(req.url, "http://localhost");
    try {
      if (url.pathname.startsWith("/rest/v1/")) return await handleRest(req, res, url, body);
      if (url.pathname.startsWith("/auth/v1/")) return await handleAuth(req, res, url, body);
      return send(res, 404, { message: "não implementado" });
    } catch (e) {
      const status = e.status ?? 400;
      if (process.env.FAKE_SUPABASE_DEBUG) console.error(req.method, req.url, e.message);
      return send(res, status, {
        code: e.code ?? "P0001",
        message: e.message,
        details: e.detail ?? null,
        hint: e.hint ?? null,
      });
    }
  });
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve(server)));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await start();
  console.log(`fake supabase em http://127.0.0.1:${process.env.FAKE_SUPABASE_PORT ?? 54321}`);
  if (process.argv.includes("--print-keys")) {
    console.log("ANON=" + (await signKey("anon")));
    console.log("SERVICE=" + (await signKey("service_role")));
  }
}
