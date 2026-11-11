// Fumaça do /produtos/order: seletor, teclado, simulador, configurador, sem overflow. Uso: BASE=http://localhost:5199 node multiformato.e2e.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)(process.env.PW ?? "playwright");
import assert from "node:assert/strict";
const BASE = process.env.BASE ?? "http://localhost:5199";
const OUT = process.env.OUT ?? "docs/tipe-order/multiformato";
const b = await chromium.launch();
for (const [nome, vp] of [["desktop", { width: 1366, height: 900 }], ["mobile", { width: 390, height: 844 }]]) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", (e) => erros.push(e.message));
  await p.goto(`${BASE}/produtos/order`, { waitUntil: "networkidle" });
  assert.match(await p.locator("h1").innerText(), /jeito de atender/i);
  const sel = p.getByRole("tablist", { name: "Modalidades de atendimento" });
  const abas = sel.getByRole("tab");
  assert.equal(await abas.count() >= 7, true, "7 modalidades no seletor");
  await sel.getByRole("tab", { name: /Pulseira/ }).click();
  assert.match(await p.getByRole("tabpanel").first().innerText(), /Planejada|planejamento/i);
  await sel.getByRole("tab", { name: /Totem/ }).focus();
  await p.keyboard.press("ArrowRight");
  await sel.getByRole("tab", { name: /Mesas/ }).click();
  await p.locator("#atendimento").screenshot({ path: `${OUT}/${nome}-seletor.png` });
  await p.locator("#simulador").scrollIntoViewIfNeeded();
  await p.waitForTimeout(600);
  await p.locator("#simulador").screenshot({ path: `${OUT}/${nome}-simulador.png` });
  await p.getByRole("button", { name: /Restaurante$/ }).first().click();
  await p.locator("#monte-sua-operacao").scrollIntoViewIfNeeded();
  await p.locator("#monte-sua-operacao").screenshot({ path: `${OUT}/${nome}-configurador.png` });
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(overflow <= 1, `overflow horizontal ${overflow}px em ${nome}`);
  assert.deepEqual(erros, [], `erros de página: ${erros.join(" | ")}`);
  console.log(`${nome}: ok`);
  await ctx.close();
}
await b.close();
