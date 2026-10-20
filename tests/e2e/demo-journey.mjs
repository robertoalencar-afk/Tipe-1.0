// Jornada completa da demonstração (/demo) com Playwright, em várias abas que
// compartilham o mesmo estado: cliente → cozinha → garçom → pagamento → gerente.
// Uso: BASE_URL=http://127.0.0.1:5173 SHOTS=/tmp/shots node tests/e2e/demo-journey.mjs
import { chromium, devices } from "playwright";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5173";
const SHOTS = process.env.SHOTS ?? "";
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true }); };
const step = (msg) => console.log(`✓ ${msg}`);

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
const ctx = await browser.newContext({ ...devices["iPhone 13"], locale: "pt-BR", timezoneId: "America/Sao_Paulo" });
const desk = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: "pt-BR", timezoneId: "America/Sao_Paulo" });
await desk.addInitScript(() => { try { localStorage.setItem("tipe-demo-e2e", "1"); } catch {} });
const errors = [];
for (const c of [ctx, desk]) c.on("weberror", (e) => errors.push(String(e.error())));

// Contextos diferentes não compartilham localStorage: o desktop usa abas no mesmo contexto do celular quando precisa.
const cliente = await ctx.newPage();
await cliente.goto(`${BASE}/demo`);
await cliente.evaluate(() => localStorage.clear());
await cliente.goto(`${BASE}/demo`);
await cliente.getByRole("heading", { name: "Um restaurante inteiro para você testar" }).waitFor();
// O aviso de cookies é do site inteiro; a pessoa responde uma vez e ele some de todas as abas.
await cliente.getByRole("button", { name: "Recusar opcionais" }).click();
await shot(cliente, "00-inicio-celular");

// 1. Cliente pede pela mesa 1
await cliente.goto(`${BASE}/demo?papel=cliente&mesa=1`);
await cliente.getByRole("tab", { name: "Cardápio" }).click();
await cliente.getByRole("button", { name: /Moqueca de peixe/ }).click();
await cliente.getByRole("button", { name: "Lugar 1" }).click();
await cliente.getByRole("button", { name: "Adicionar" }).click();
await cliente.getByRole("button", { name: /Chopp 300 ml/ }).click();
await cliente.getByRole("button", { name: "Lugar 2" }).click();
await cliente.getByRole("button", { name: "Adicionar" }).click();
await shot(cliente, "01-cardapio-carrinho");
await cliente.getByRole("button", { name: /Enviar 2 itens/ }).click();
await cliente.getByText("Pedido pelo celular · lugar 1").waitFor();
step("cliente enviou o pedido pelo celular");

// 2. Cozinha prepara (outra aba, mesmo navegador)
const cozinha = await ctx.newPage();
await cozinha.setViewportSize({ width: 1280, height: 860 });
await cozinha.goto(`${BASE}/demo?papel=cozinha`);
const card = cozinha.locator("article", { hasText: "Moqueca de peixe" }).filter({ hasText: "Mesa 1" });
await card.getByRole("button", { name: "Começar" }).click();
await card.getByRole("button", { name: "Pronto" }).click();
await shot(cozinha, "02-cozinha");
await cliente.getByText("Pronto", { exact: true }).waitFor();
step("cozinha avançou o preparo e o cliente viu o status mudar sozinho");

// 3. Garçom recebe aviso, serve e lança mais um pedido
const garcom = await ctx.newPage();
await garcom.goto(`${BASE}/demo?papel=garcom`);
await garcom.getByText("Mesa 1: Moqueca de peixe pronto para servir").waitFor();
await garcom.getByRole("button", { name: /^Mesa 1: Ocupada, 1 pronto/ }).click();
await garcom.getByRole("button", { name: "Servir", exact: true }).click();
await garcom.getByRole("button", { name: "Lançar pedido" }).click();
await garcom.getByRole("button", { name: /Café espresso/ }).click();
await garcom.getByRole("button", { name: "Enviar para a cozinha" }).click();
await shot(garcom, "03-garcom");
step("garçom recebeu o aviso, serviu e lançou café na mesma conta");

// 4. Cliente divide e paga metade com Pix e gorjeta de 10%
await cliente.getByRole("tab", { name: "Conta" }).click();
await cliente.getByText("1× Café espresso").waitFor();
await cliente.getByRole("button", { name: "Partes iguais" }).click();
await shot(cliente, "04-conta-dividida");
await cliente.getByRole("button", { name: /^Pagar R\$/ }).click();
await cliente.getByLabel("Seu nome").fill("Marina");
await cliente.getByRole("button", { name: /^8%/ }).click();
await cliente.getByRole("button", { name: "Outro", exact: true }).click();
await cliente.getByLabel("Outro valor de gorjeta").fill("1,50");
await cliente.getByText("Mínimo de R$").waitFor();
await cliente.getByLabel("Outro valor de gorjeta").fill("8,00");
await shot(cliente, "05-checkout");
await cliente.getByRole("button", { name: /com Pix/ }).click();
await cliente.getByRole("button", { name: "Simular confirmação do banco" }).click();
await cliente.getByText("Pagamento aprovado").waitFor();
await shot(cliente, "06-aprovado");
step("primeira metade paga com Pix e gorjeta");

// 5. Concorrência: duas pessoas tentam pagar o restante ao mesmo tempo
await cliente.getByRole("button", { name: "Voltar para a conta" }).click();
const outro = await ctx.newPage();
await outro.goto(`${BASE}/demo?papel=cliente&mesa=1`);
await outro.getByRole("tab", { name: "Conta" }).click();
for (const p of [cliente, outro]) await p.getByRole("button", { name: /^Pagar R\$/ }).click();
await outro.getByLabel("Seu nome").fill("Bruno");
await cliente.getByRole("button", { name: /com Apple Pay|Apple Pay/ }).first().click();
await outro.getByRole("button", { name: /Google Pay/ }).first().click();
await cliente.getByRole("button", { name: /Pagar R\$.*Apple Pay/ }).click();
await cliente.getByRole("button", { name: /Simular confirmação/ }).waitFor();
await outro.getByRole("button", { name: /Pagar R\$.*Google Pay/ }).click().catch(() => {});
await outro.getByText(/acabou de ser paga por outra pessoa|acabou de pagar parte/).waitFor();
await shot(outro, "07-concorrencia-recusada");
step("o segundo pagamento simultâneo do mesmo saldo foi recusado");
await cliente.getByRole("button", { name: /Simular confirmação/ }).click();
await cliente.getByText("Pagamento aprovado").waitFor();

// 6. Avaliação baixa avisa garçom e gerente
await cliente.getByRole("button", { name: "2 estrelas" }).click();
await cliente.getByPlaceholder("Quer contar algo? (opcional)").fill("O prato demorou");
await cliente.getByRole("button", { name: "Enviar avaliação" }).click();
await cliente.getByText("Obrigado pela avaliação de 2 estrelas.").waitFor();
await garcom.getByText("Mesa 1 deu nota 2").waitFor();
step("nota baixa chegou ao garçom");

// 7. Garçom pede estorno, gerente aprova, conciliação mostra divergência simulada
garcom.once("dialog", (d) => d.accept("Cliente cobrado em duplicidade"));
await garcom.getByRole("button", { name: "Pedir estorno" }).first().click();
const gerente = await ctx.newPage();
await gerente.setViewportSize({ width: 1366, height: 900 });
await gerente.goto(`${BASE}/demo?papel=gerente`);
await gerente.getByText("Nota 2 na mesa 1").waitFor();
await shot(gerente, "08-gerente-agora");
await gerente.getByRole("button", { name: "Aprovar estorno" }).click();
await gerente.getByRole("tab", { name: "Conciliação" }).click();
await gerente.getByRole("button", { name: "Simular lançamento estranho no extrato" }).click();
await gerente.getByText("No extrato, sem registro na Tipe").nth(1).waitFor();
await shot(gerente, "09-conciliacao");
step("estorno aprovado pelo gerente e conciliação apontou o lançamento estranho");

// 8. Garçom libera a mesa quitada; backoffice abre
await garcom.reload();
await garcom.getByRole("button", { name: /^Mesa 1: Quitada/ }).click();
await garcom.getByRole("button", { name: "Liberar mesa" }).click();
const tipe = await ctx.newPage();
await tipe.setViewportSize({ width: 1366, height: 900 });
await tipe.goto(`${BASE}/demo?papel=tipe`);
await tipe.getByText("Restaurantes na plataforma").waitFor();
await shot(tipe, "10-backoffice");
step("mesa liberada e backoffice aberto");

// 9. Desktop: telas sem rolagem horizontal
for (const papel of ["", "cliente", "garcom", "cozinha", "gerente", "tipe"]) {
  const p = await desk.newPage();
  await p.goto(`${BASE}/demo${papel ? `?papel=${papel}` : ""}`);
  await p.waitForLoadState("networkidle");
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 1, `rolagem horizontal em ${papel || "início"}: ${overflow}px`);
  if (papel === "") await shot(p, "11-inicio-desktop");
  await p.close();
}
for (const papel of ["cliente", "garcom", "gerente"]) {
  await cliente.goto(`${BASE}/demo?papel=${papel}`);
  const overflow = await cliente.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 1, `rolagem horizontal no celular em ${papel}: ${overflow}px`);
}
step("sem rolagem horizontal no celular e no computador");

assert.deepEqual(errors, [], `erros de página: ${errors.join("\n")}`);
await browser.close();
console.log("Jornada completa OK");
