#!/usr/bin/env node
// Verificação REAL (sem mocks) do cache do AI Gateway através do Worker.
//
// Uso:
//   node scripts/verify-cache.mjs [BASE_URL]            # padrão: http://localhost:8787
//   node scripts/verify-cache.mjs [BASE_URL] --expiry   # + teste de expiração (≈70 s)
//   node scripts/verify-cache.mjs [BASE_URL] --warm     # cache já aquecido: espera HIT/HIT
//
// Opcional (para consultar os logs do gateway e o teste de expiração), via ambiente:
//   CLOUDFLARE_ACCOUNT_ID, CF_GATEWAY_TOKEN, AI_GATEWAY_ID (padrão "default")
// (CF_GATEWAY_TOKEN e não CLOUDFLARE_API_TOKEN, para não trocar a autenticação do Wrangler.)
// O token nunca é impresso.

const args = process.argv.slice(2);
const baseUrl = (args.find((a) => !a.startsWith("--")) ?? "http://localhost:8787").replace(
  /\/$/,
  "",
);
const runExpiry = args.includes("--expiry");
// --warm: a chave já foi aquecida antes (ex.: teste local), então o esperado é HIT/HIT.
const expectWarm = args.includes("--warm");
const { CLOUDFLARE_ACCOUNT_ID: accountId, CF_GATEWAY_TOKEN: token } = process.env;
const gatewayId = process.env.AI_GATEWAY_ID || "default";
const CF = "https://api.cloudflare.com/client/v4";
const EXPECTED_KEY = "faq:refund:v1";
const EXPECTED_TTL = 3600;

let failures = 0;
const check = (ok, label, detail = "") => {
  console.log(`${ok ? "✔" : "✘"} ${label}${detail ? `  (${detail})` : ""}`);
  if (!ok) failures++;
};

async function callWorker(n) {
  const t0 = Date.now();
  let res;
  try {
    res = await fetch(`${baseUrl}/faq/refund`);
  } catch (err) {
    console.error(
      `\nChamada ${n}: não foi possível conectar em ${baseUrl} (${err.cause?.code ?? err.message}).`,
    );
    console.error("O Worker está rodando? Local: `npm run dev`. Remoto: confira a URL.");
    process.exit(1);
  }
  const ms = Date.now() - t0;
  const text = await res.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {}
  const header = res.headers.get("cf-aig-cache-status");
  console.log(
    `\nChamada ${n}: HTTP ${res.status} em ${ms} ms, cf-aig-cache-status=${header ?? "(ausente)"}`,
  );
  console.log(JSON.stringify(body ?? text, null, 2));
  return { res, body, header, ms };
}

async function gatewayLog(logId) {
  if (!accountId || !token || !logId) return null;
  const url = `${CF}/accounts/${accountId}/ai-gateway/gateways/${gatewayId}/logs/${logId}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return { error: `HTTP ${res.status}` };
  const { result } = await res.json();
  return result;
}

console.log(`Verificando ${baseUrl}/faq/refund (chamadas sequenciais)`);
const first = await callWorker(1);
// O cache do AI Gateway é gravado de forma assíncrona e é volátil: uma pausa curta
// evita que a segunda chamada chegue antes da gravação. Ajuste com VERIFY_DELAY_MS.
const delayMs = Number(process.env.VERIFY_DELAY_MS ?? 3000);
if (delayMs > 0) {
  console.log(`\nAguardando ${delayMs} ms antes da segunda chamada...`);
  await new Promise((r) => setTimeout(r, delayMs));
}
const second = await callWorker(2); // só começa depois que a primeira terminou

console.log("\nResultados");
for (const [i, c] of [first, second].entries()) {
  check(c.res.status === 200, `chamada ${i + 1}: HTTP 200`, `recebido ${c.res.status}`);
  check(c.body?.success === true, `chamada ${i + 1}: JSON válido com success=true`);
  check(c.body?.cache?.key === EXPECTED_KEY, `chamada ${i + 1}: cache.key = ${EXPECTED_KEY}`);
  check(c.body?.cache?.ttl === EXPECTED_TTL, `chamada ${i + 1}: cache.ttl = ${EXPECTED_TTL}`);
  check(c.header !== null, `chamada ${i + 1}: header cf-aig-cache-status presente`);
  check(
    c.header === (c.body?.cache?.status ?? null),
    `chamada ${i + 1}: header = cache.status do JSON`,
  );
}
if (expectWarm) {
  check(first.header === "HIT", "chamada 1 = HIT (cache aquecido antes)", String(first.header));
} else {
  check(
    first.header === "MISS",
    "chamada 1 = MISS",
    first.header === "HIT"
      ? "cache já estava quente (TTL de 1 h); use --warm ou ver README"
      : String(first.header),
  );
}
check(second.header === "HIT", "chamada 2 = HIT", String(second.header));
check(
  !!first.body?.answer && first.body?.answer === second.body?.answer,
  "respostas idênticas entre as duas chamadas",
);

const logs = [
  await gatewayLog(first.body?.gateway?.logId),
  await gatewayLog(second.body?.gateway?.logId),
];
if (logs.every((l) => l === null)) {
  console.log(
    "\nℹ Logs do gateway não consultados (defina CLOUDFLARE_ACCOUNT_ID e CF_GATEWAY_TOKEN, ou sem logId).",
  );
} else {
  console.log("\nLogs do AI Gateway (indicadores do próprio gateway):");
  logs.forEach((l, i) => {
    if (!l || l.error) return console.log(`  chamada ${i + 1}: indisponível ${l?.error ?? ""}`);
    const { cached, cost, tokens_in, tokens_out, model, status_code, duration } = l;
    console.log(
      `  chamada ${i + 1}:`,
      JSON.stringify({ cached, cost, tokens_in, tokens_out, model, status_code, duration }),
    );
  });
  if (logs[1] && !logs[1].error && "cached" in logs[1]) {
    check(logs[1].cached === true, "log da chamada 2 marcado como cached (sem nova inferência)");
  }
}

if (runExpiry) {
  // Testa expiração direto no gateway com uma chave descartável e TTL mínimo (60 s),
  // sem mexer na chave de produção faq:refund:v1. Gera 2 inferências curtas.
  if (!accountId || !token) {
    check(false, "teste de expiração requer CLOUDFLARE_ACCOUNT_ID e CF_GATEWAY_TOKEN");
  } else {
    const key = `faq:refund:verify-${Date.now()}`;
    const direct = async () => {
      const res = await fetch(`${CF}/accounts/${accountId}/ai/v1/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "cf-aig-gateway-id": gatewayId,
          "cf-aig-cache-key": key,
          "cf-aig-cache-ttl": "60",
        },
        body: JSON.stringify({
          model: "@cf/meta/llama-3.1-8b-instruct-fp8-fast",
          messages: [{ role: "user", content: "Responda apenas: ok" }],
          temperature: 0,
          max_tokens: 5,
        }),
      });
      await res.body?.cancel();
      return `${res.status} ${res.headers.get("cf-aig-cache-status") ?? "(ausente)"}`;
    };
    console.log(`\nExpiração (chave ${key}, TTL 60 s)`);
    const a = await direct();
    const b = await direct();
    console.log(`  t=0s: ${a} | t=0s: ${b} | aguardando 70 s...`);
    await new Promise((r) => setTimeout(r, 70_000));
    const c = await direct();
    console.log(`  t=70s: ${c}`);
    check(
      a.endsWith("MISS") && b.endsWith("HIT") && c.endsWith("MISS"),
      "MISS → HIT → (expira) → MISS",
    );
  }
}

console.log(failures ? `\n${failures} verificação(ões) falharam.` : "\nTudo confirmado.");
process.exit(failures ? 1 : 0);
