// Teste ponta a ponta do programa Restaurante Fundador no /crm (modo demonstração).
// Uso: com o servidor de desenvolvimento rodando (npx vite dev --port 5181),
//   BASE=http://127.0.0.1:5181 SHOTS=docs/tipe-guest/capturas/fase-3 node tests/e2e/fundador.e2e.mjs
import { createRequire } from "node:module";

// require (e não import) para achar também o Playwright global do ambiente (NODE_PATH).
const { chromium } = createRequire(import.meta.url)("playwright");

const BASE = process.env.BASE ?? "http://127.0.0.1:5181";
const SHOTS = process.env.SHOTS;
const results = [];
const consoleErrors = [];
const browser = await chromium.launch();

async function newPage(viewport) {
  const ctx = await browser.newContext({ viewport, locale: "pt-BR" });
  const page = await ctx.newPage();
  page.on("console", (m) => {
    if (m.type() === "error" && !/favicon|Download the React DevTools/.test(m.text()))
      consoleErrors.push(`${viewport.width}px ${page.url()} :: ${m.text()}`);
  });
  page.on("pageerror", (e) => consoleErrors.push(`${page.url()} :: PAGEERROR ${e.message}`));
  return page;
}
async function step(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`ok   ${name}`);
  } catch (e) {
    results.push({ name, ok: false });
    console.log(
      `FAIL ${name}\n     ${String(e.message ?? e)
        .split("\n")
        .slice(0, 3)
        .join("\n     ")}`,
    );
  }
}
const ready = async (p) => {
  await p.waitForLoadState("networkidle");
  await p.waitForTimeout(900);
};
const go = async (p, path) => {
  await p.goto(BASE + path);
  await ready(p);
};
const shot = async (p, name, full = true) => {
  if (SHOTS) await p.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: full });
};
const assert = (c, m) => {
  if (!c) throw new Error(m);
};
async function login(p, email) {
  await go(p, "/crm/entrar");
  const btn = p
    .getByRole("button", { name: /^(Aceitar|Recusar|Entendi|Aceitar todos|Rejeitar)/i })
    .first();
  if (await btn.isVisible().catch(() => false)) await btn.click();
  await p.evaluate(() => localStorage.removeItem("tipe-crm-demo-v1"));
  await go(p, "/crm/entrar");
  await p.getByLabel("E-mail").fill(email);
  await p.getByLabel("Senha").fill("demo1234");
  await p.getByRole("button", { name: /Entrar no CRM da Tipe/ }).click();
  await p.waitForURL(/\/crm\/?$/, { timeout: 15000 });
  await ready(p);
}

const desk = await newPage({ width: 1280, height: 900 });
const mobile = await newPage({ width: 390, height: 844 });

await step("Desktop: visão do programa com regras pendentes e lista por estado", async () => {
  await login(desk, "helena@tipe.demo");
  await desk.getByRole("link", { name: "Restaurantes" }).first().click();
  await desk.getByRole("link", { name: "Restaurante Fundador" }).first().click();
  await desk.waitForURL(/\/crm\/fundador/);
  await ready(desk);
  assert((await desk.locator("main h1").first().innerText()) === "Restaurante Fundador", "título");
  const pending = await desk.getByText("Pendente de aprovação comercial").count();
  assert(pending >= 3, `esperava vagas, período e vantagens pendentes (achou ${pending})`);
  await shot(desk, "01-desktop-fundador-lista");
});

await step("Desktop: filtro por estado mostra só participantes", async () => {
  await desk.getByRole("radio", { name: /^Participante/ }).click();
  await desk.waitForURL(/estado=participante/);
  await ready(desk);
  const rows = await desk.locator("main ul li button").allInnerTexts();
  assert(rows.length > 0 && rows.every((t) => t.includes("Participante")), "filtro");
  await shot(desk, "02-desktop-filtro-participante");
});

await step("Desktop: ficha mostra trilha e nenhum benefício concedido", async () => {
  await desk.locator("main ul li button").first().click();
  await desk.waitForURL(/conta=/);
  await ready(desk);
  await desk.getByText("Trilha de auditoria").waitFor();
  await desk.getByText(/Nenhum benefício concedido/).waitFor();
  await shot(desk, "03-desktop-ficha-participante");
});

await step(
  "Desktop: mudança de estado pede confirmação nomeada e motivo, e entra na trilha",
  async () => {
    await go(desk, "/crm/fundador?estado=convidado");
    await desk.locator("main ul li button").first().click();
    await ready(desk);
    const name = (
      await desk.locator("main ul li button").first().locator("span span").first().innerText()
    ).trim();
    await desk.getByRole("button", { name: "Encerrar participação" }).click();
    const dialog = desk.getByRole("dialog");
    await dialog.getByText(`Encerrar participação de ${name}?`).waitFor();
    await shot(desk, "04-desktop-confirmacao-nomeada", false);
    await dialog.getByRole("button", { name: `Encerrar participação de ${name}` }).click();
    await dialog.getByText(/Escreva o motivo/).waitFor();
    await dialog.getByRole("button", { name: "Manter como está" }).click();
    await desk.getByRole("button", { name: "Marcar como interessado" }).click();
    await desk
      .getByRole("dialog")
      .getByRole("button", { name: `Marcar como interessado de ${name}` })
      .click();
    await ready(desk);
    await desk.getByText("Convidado → Interessado").first().waitFor();
    await shot(desk, "05-desktop-apos-transicao");
  },
);

await step("Desktop: card do Restaurante Fundador na página da conta", async () => {
  await go(desk, "/crm/fundador?estado=selecionado_piloto");
  await desk.locator("main ul li button").first().click();
  await ready(desk);
  await desk.getByRole("link", { name: /Abrir|/ }).first();
  const href = await desk.locator('a[href^="/crm/contas/acc_"]').first().getAttribute("href");
  await go(desk, href);
  const card = desk.locator("section", {
    has: desk.getByRole("heading", { name: "Restaurante Fundador" }),
  });
  await card.waitFor();
  await card.getByText("Selecionado para o piloto").first().waitFor();
  await card.scrollIntoViewIfNeeded();
  await card.screenshot({ path: SHOTS ? `${SHOTS}/06-desktop-card-conta.png` : "/dev/null" });
});

await step("Desktop: conta fora do programa oferece convite", async () => {
  await go(desk, "/crm/contas");
  const links = await desk
    .locator('a[href^="/crm/contas/acc_"]')
    .evaluateAll((as) => as.map((a) => a.getAttribute("href")));
  let found = false;
  for (const h of links.slice(0, 20)) {
    await go(desk, h);
    if (
      await desk
        .getByText("Esta conta ainda não foi convidada.")
        .isVisible()
        .catch(() => false)
    ) {
      found = true;
      await desk
        .locator("section", { has: desk.getByRole("heading", { name: "Restaurante Fundador" }) })
        .screenshot({
          path: SHOTS ? `${SHOTS}/07-desktop-card-sem-adesao.png` : "/dev/null",
        });
      break;
    }
  }
  assert(found, "nenhuma conta fora do programa encontrada");
});

await step("Vendedor consulta sem botões de mudança de estado", async () => {
  const p = await newPage({ width: 1280, height: 900 });
  await login(p, "thiago@tipe.demo");
  await go(p, "/crm/fundador");
  const n = await p
    .getByRole("button", { name: /Encerrar participação|Marcar como interessado/ })
    .count();
  assert(n === 0, "vendedor viu ações");
});

await step("Celular 390 px: lista, ficha e sem rolagem horizontal", async () => {
  await login(mobile, "helena@tipe.demo");
  await go(mobile, "/crm/fundador");
  const w = await mobile.evaluate(() => document.documentElement.scrollWidth);
  assert(w <= 392, `rolagem horizontal (${w}px)`);
  await shot(mobile, "08-mobile-fundador-lista");
  await mobile.locator("main ul li button").first().click();
  await ready(mobile);
  const w2 = await mobile.evaluate(() => document.documentElement.scrollWidth);
  assert(w2 <= 392, `rolagem horizontal na ficha (${w2}px)`);
  await shot(mobile, "09-mobile-ficha");
});

await step("Estado vazio do filtro", async () => {
  await go(desk, "/crm/fundador?estado=suspenso");
  await desk.getByText("Nenhuma adesão com esses filtros").waitFor();
  await shot(desk, "10-desktop-filtro-vazio", false);
});

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passos ok`);
if (consoleErrors.length) {
  console.log(`\nErros de console (${consoleErrors.length}):`);
  for (const e of [...new Set(consoleErrors)].slice(0, 30)) console.log(" - " + e.slice(0, 300));
} else console.log("Console sem erros.");
process.exit(failed.length || consoleErrors.length ? 1 : 0);
