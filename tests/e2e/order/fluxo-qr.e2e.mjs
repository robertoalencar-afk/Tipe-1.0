// Ponta a ponta do Tipe Order (Fase 2) contra o Supabase falso local.
// Uso: BASE=http://127.0.0.1:5180 SHOTS=pasta node tests/e2e/order/fluxo-qr.e2e.mjs
import { createRequire } from "node:module";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";

// Usa o Playwright do projeto ou, se não houver, o instalado globalmente.
const require = createRequire(import.meta.url);
const { chromium } = (() => {
  try {
    return require("playwright");
  } catch {
    return require(`${process.env.NPM_GLOBAL ?? "/opt/node22/lib/node_modules"}/playwright`);
  }
})();

const BASE = process.env.BASE ?? "http://127.0.0.1:5180";
const SUPABASE = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE) throw new Error("Defina SUPABASE_SERVICE_ROLE_KEY (o run.sh faz isso)");
const SHOTS = process.env.SHOTS ?? "docs/tipe-order/fase-2";
mkdirSync(SHOTS, { recursive: true });

const erros = [];
const ok = (msg) => console.log(`ok - ${msg}`);

async function novaPagina(browser, width) {
  const ctx = await browser.newContext({
    viewport: { width, height: width < 600 ? 844 : 900 },
    locale: "pt-BR",
  });
  const page = await ctx.newPage();
  page.on("console", (m) => {
    if (m.type() === "error" && !m.text().includes("/realtime/v1/"))
      erros.push(`${page.url()} :: ${m.text().slice(0, 240)}`);
  });
  page.on("pageerror", (e) => erros.push(`${page.url()} :: ${e.message.slice(0, 240)}`));
  return { ctx, page };
}

async function identificar(page, nome) {
  const campo = page.getByLabel(/nome e sobrenome/i);
  if (await campo.count()) {
    await campo.fill(nome);
    await page.getByRole("button", { name: /ver minha conta/i }).click();
  }
}

async function entrar(page, email) {
  await page.goto(`${BASE}/entrar`, { waitUntil: "networkidle" });
  await page.locator("#email").fill(email);
  await page.locator("#senha").fill("demo1234");
  await page.getByRole("button", { name: /^entrar$/i }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/entrar"), { timeout: 20000 });
}

const browser = await chromium.launch();
try {
  // 1) Só Tipe Pay: a tela da mesa continua igual, sem Pedir/Pagar e sem cardápio.
  for (const width of [390, 1280]) {
    const { ctx, page } = await novaPagina(browser, width);
    await page.goto(`${BASE}/bar-da-orla/mesa3?t=qrorla3token00`, { waitUntil: "networkidle" });
    await identificar(page, "Marina Teixeira");
    await page.getByText("Chope 300 ml").first().waitFor({ timeout: 15000 });
    assert.equal(await page.getByRole("tab", { name: /^pedir$/i }).count(), 0, "Pay sem aba Pedir");
    assert.equal(await page.getByRole("tab", { name: /^pagar$/i }).count(), 0, "Pay sem aba Pagar");
    assert.equal(
      await page.getByText(/pedidos pelo celular/i).count(),
      0,
      "Pay sem aviso de liberação",
    );
    await page.screenshot({ path: `${SHOTS}/pay-mesa-${width}.png`, fullPage: true });
    await ctx.close();
  }
  ok("QR só com Tipe Pay mostra a conta como hoje, sem Pedir/Pagar");

  // 2) Pay + Order: Pedir/Pagar aparece, mas pedir só depois da equipe liberar.
  const cli = await novaPagina(browser, 390);
  const c = cli.page;
  await c.goto(`${BASE}/casa-do-caju/mesa5?t=qrcaju5token00`, { waitUntil: "networkidle" });
  await identificar(c, "Rafael Moreira");
  await c.getByRole("tab", { name: /^pedir$/i }).waitFor({ timeout: 15000 });
  assert.equal(await c.getByRole("tab", { name: /^pagar$/i }).count(), 1);
  await c.getByText("Pedidos pelo celular ainda não liberados").waitFor();
  await c.getByText("Baião de dois").first().waitFor();
  await c.getByRole("button", { name: "Adicionar Baião de dois" }).click();
  await c.getByRole("button", { name: "Adicionar Suco de caju" }).click();
  await c.getByRole("button", { name: "Mais um Suco de caju" }).click();
  const enviar = c.getByRole("button", { name: /enviar 3 itens/i });
  assert.equal(await enviar.isDisabled(), true, "sem liberação o envio fica bloqueado");
  await c.screenshot({ path: `${SHOTS}/order-antes-liberar-390.png`, fullPage: true });
  ok(
    "QR com Tipe Order mostra Pedir/Pagar, guarda o carrinho e bloqueia o envio antes da liberação",
  );

  // 3) A garçonete libera a mesa 5 no app do garçom.
  const gar = await novaPagina(browser, 390);
  const g = gar.page;
  await entrar(g, "ana@casadocaju.test");
  await g.goto(`${BASE}/garcom`, { waitUntil: "networkidle" });
  await g.screenshot({ path: `${SHOTS}/garcom-mesas-390.png`, fullPage: true });
  await g
    .getByRole("button", { name: /mesa 5\b/i })
    .first()
    .click();
  await g.getByRole("button", { name: /liberar pedidos pelo celular/i }).click();
  await g.getByText(/liberados para esta conta até/i).waitFor({ timeout: 15000 });
  await g.screenshot({ path: `${SHOTS}/garcom-liberou-390.png`, fullPage: true });
  ok("Garçom libera pedidos pelo celular na mesa");

  // 4) O cliente atualiza, pede e o pedido aparece em Pagar sem perder a sessão.
  // A tela também se atualiza sozinha; o botão só adianta. Se já sumiu, segue.
  await c
    .getByRole("button", { name: /já liberaram, atualizar/i })
    .click({ timeout: 3000 })
    .catch(() => {});
  await c
    .getByText("Pedidos pelo celular ainda não liberados")
    .waitFor({ state: "detached", timeout: 15000 });
  assert.equal(await enviar.isDisabled(), false, "liberada, o carrinho guardado pode ser enviado");
  await enviar.click();
  await c.getByText("Pedido enviado!").waitFor({ timeout: 15000 });
  await c.screenshot({ path: `${SHOTS}/order-pedido-enviado-390.png`, fullPage: true });
  await c.getByRole("tab", { name: /^pagar$/i }).click();
  await c.locator('[role="tab"][aria-selected="true"]', { hasText: "Pagar" }).waitFor();
  await c.getByText("Baião de dois").first().waitFor({ timeout: 15000 });
  await c.waitForTimeout(400);
  await c
    .getByText(/Rafael/)
    .first()
    .waitFor();
  await c.screenshot({ path: `${SHOTS}/order-pagar-conta-390.png`, fullPage: true });
  await c.getByRole("tab", { name: /^pedir$/i }).click();
  await c.getByText("Pedido enviado!").waitFor();
  ok("Cliente envia o pedido, ele entra na conta em Pagar e a troca de aba não perde a sessão");

  // 5) Mesma tela em 1280 px.
  const larga = await novaPagina(browser, 1280);
  await larga.page.goto(`${BASE}/casa-do-caju/mesa5?t=qrcaju5token00`, {
    waitUntil: "networkidle",
  });
  await identificar(larga.page, "Rafael Moreira");
  await larga.page.getByRole("tab", { name: /^pedir$/i }).waitFor({ timeout: 15000 });
  await larga.page.screenshot({ path: `${SHOTS}/order-mesa-1280.png`, fullPage: true });
  await larga.ctx.close();
  ok("Tela da mesa com Tipe Order em 1280 px");

  // 6) Modo código curto: a equipe libera e passa 4 números; código errado é recusado.
  const svc = {
    apikey: SERVICE,
    Authorization: `Bearer ${SERVICE}`,
    "Content-Type": "application/json",
  };
  let r = await fetch(`${SUPABASE}/rest/v1/restaurants?slug=eq.casa-do-caju`, {
    method: "PATCH",
    headers: svc,
    body: JSON.stringify({ order_session_mode: "table_code" }),
  });
  assert.ok(r.ok, "troca para modo código");
  await g.goto(`${BASE}/garcom`, { waitUntil: "networkidle" });
  await g
    .getByRole("button", { name: /mesa 6\b/i })
    .first()
    .click();
  await g.getByRole("button", { name: /liberar pedidos pelo celular/i }).click();
  const codigoEl = g.getByLabel(/^Código \d/);
  await codigoEl.waitFor({ timeout: 15000 });
  const codigo = (await codigoEl.innerText()).trim();
  assert.match(codigo, /^\d{4}$/);
  await g.screenshot({ path: `${SHOTS}/garcom-codigo-390.png`, fullPage: true });
  const cli6 = await novaPagina(browser, 390);
  const c6 = cli6.page;
  await c6.goto(`${BASE}/casa-do-caju/mesa6?t=qrcaju6token00`, { waitUntil: "networkidle" });
  await identificar(c6, "Beatriz Lima");
  const campoCodigo = c6.getByLabel("Código da mesa");
  await campoCodigo.waitFor({ timeout: 15000 });
  const errado = codigo === "0000" ? "1111" : "0000";
  await campoCodigo.fill(errado);
  await c6.getByRole("button", { name: /^liberar$/i }).click();
  await c6
    .getByRole("alert")
    .filter({ hasText: /não confere/i })
    .waitFor({ timeout: 15000 });
  await c6.screenshot({ path: `${SHOTS}/order-codigo-errado-390.png`, fullPage: true });
  await campoCodigo.fill(codigo);
  await c6.getByRole("button", { name: /^liberar$/i }).click();
  await campoCodigo.waitFor({ state: "detached", timeout: 15000 });
  await c6.getByRole("button", { name: "Adicionar Cartola" }).click();
  await c6.getByRole("button", { name: /enviar 1 item/i }).click();
  await c6.getByText("Pedido enviado!").waitFor({ timeout: 15000 });
  ok("Modo código: código errado recusado, código certo libera só este celular e o pedido entra");
  const outro = await novaPagina(browser, 390);
  await outro.page.goto(`${BASE}/casa-do-caju/mesa6?t=qrcaju6token00`, {
    waitUntil: "networkidle",
  });
  await identificar(outro.page, "Carlos Lima");
  // A conta já tem itens, então a tela abre em Pagar; em Pedir ele ainda precisa do código.
  await outro.page.getByRole("tab", { name: /^pedir$/i }).click();
  await outro.page.getByLabel("Código da mesa").waitFor({ timeout: 15000 });
  await outro.ctx.close();
  ok("Outro celular na mesma mesa ainda precisa do código");
  await cli6.ctx.close();
  r = await fetch(`${SUPABASE}/rest/v1/restaurants?slug=eq.casa-do-caju`, {
    method: "PATCH",
    headers: svc,
    body: JSON.stringify({ order_session_mode: "staff_opens" }),
  });
  assert.ok(r.ok);

  // 7) Fundador suspende o Tipe Order: pedidos novos param, a conta continua.
  const fun = await novaPagina(browser, 1280);
  const f = fun.page;
  await entrar(f, "fundador@tipe.test");
  await f.goto(`${BASE}/backoffice`, { waitUntil: "networkidle" });
  await f.getByRole("tab", { name: /clientes/i }).click();
  await f
    .getByRole("button", { name: /Tipe Order de Casa do Caju: Ativo/i })
    .first()
    .click();
  await f.getByLabel("Suspenso").check();
  await f.getByLabel("Motivo").fill("Mensalidade em atraso (teste)");
  await f.getByRole("button", { name: "Suspender o Tipe Order" }).click();
  await f
    .getByRole("button", { name: /Tipe Order de Casa do Caju: Suspenso/i })
    .first()
    .waitFor({ timeout: 15000 });
  await f.screenshot({ path: `${SHOTS}/fundador-suspenso-1280.png` });
  ok("Fundador suspende o Tipe Order no backoffice");

  // O celular da mesa 5 ainda está com o cardápio aberto: o servidor recusa mesmo assim.
  await c.getByRole("button", { name: /pedir mais/i }).click();
  await c.getByRole("button", { name: "Adicionar Água de coco" }).click();
  await c.getByRole("button", { name: /enviar 1 item/i }).click();
  await c
    .getByText("O pedido pela mesa foi desativado pelo restaurante.")
    .waitFor({ timeout: 15000 });
  await c.screenshot({ path: `${SHOTS}/order-suspenso-recusado-390.png`, fullPage: true });
  ok("Com o módulo suspenso, o envio pelo cardápio já aberto é recusado no servidor");

  // Chamada direta à RPC, sem a tela: também recusa.
  r = await fetch(`${SUPABASE}/rest/v1/rpc/pdv_customer_order`, {
    method: "POST",
    headers: svc,
    body: JSON.stringify({
      p_slug: "casa-do-caju",
      p_table: "5",
      p_items: [{ code: "coco", qty: 1 }],
      p_customer: "Direto",
      p_request_id: "direto-suspenso-001",
    }),
  });
  const corpo = await r.text();
  assert.equal(r.ok, false, "RPC direta deve falhar com o módulo suspenso");
  assert.match(corpo, /desativado/);
  ok("Chamada direta ao pedido com o módulo suspenso é recusada");

  // Ao recarregar, a mesa volta a ser só Pagar e a conta continua lá.
  await c.reload({ waitUntil: "networkidle" });
  await identificar(c, "Rafael Moreira");
  await c.getByText("Baião de dois").first().waitFor({ timeout: 15000 });
  assert.equal(await c.getByRole("tab", { name: /^pedir$/i }).count(), 0);
  await c.screenshot({ path: `${SHOTS}/order-suspenso-conta-390.png`, fullPage: true });
  ok("Depois da suspensão a mesa mostra só a conta, com os pedidos já feitos");
  await fun.ctx.close();
} catch (e) {
  // Deixa a tela de cada página aberta para entender a falha.
  let n = 0;
  for (const ctx of browser.contexts())
    for (const p of ctx.pages()) {
      await p.screenshot({ path: `${SHOTS}/falha-${++n}.png`, fullPage: true }).catch(() => {});
      console.log(
        `--- ${p.url()}\n` +
          (
            await p
              .locator("body")
              .innerText()
              .catch(() => "")
          ).slice(0, 1200),
      );
    }
  process.exitCode = 1;
  console.error(e);
} finally {
  if (erros.length) console.log("ERROS DE CONSOLE:\n" + erros.join("\n"));
  await browser.close();
}
