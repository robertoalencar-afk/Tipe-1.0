/**
 * Teste da Fase 8 (landing do Tipe Guest e /restaurante-fundador) no Playwright.
 * Como rodar (nada toca o Supabase real):
 *   mkdir -p /tmp/tipe-fase8 && node tests/e2e/fake-postgrest.mjs &
 *   SUPABASE_URL=http://127.0.0.1:5199 VITE_SUPABASE_URL=http://127.0.0.1:5199 SUPABASE_SERVICE_ROLE_KEY=falsa LOVABLE_API_KEY= npx vite dev --host 127.0.0.1 --port 5182 &
 *   node tests/e2e/landing-guest.e2e.cjs   (PLAYWRIGHT_PATH aponta o playwright, se não estiver no projeto)
 * Gera PNGs em docs/tipe-guest/capturas/fase-8 (o repositório guarda as versões .webp).
 */
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const fs = require("fs");
const BASE = process.env.BASE_URL || "http://127.0.0.1:5182";
const OUT = process.env.OUT_DIR || require("path").resolve(__dirname, "../../docs/tipe-guest/capturas/fase-8");
const LARGURAS = [375, 390, 768, 1280, 1440];
const PAGINAS = [["guest", "/produtos/guest"], ["fundador", "/restaurante-fundador"], ["home", "/"]];
const res = [];
const ok = (cond, msg) => { res.push(`${cond ? "OK  " : "FALHA"} ${msg}`); if (!cond) process.exitCode = 1; };

async function rolarTudo(page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(600);
}

(async () => {
  const browser = await chromium.launch();
  for (const w of LARGURAS) {
    for (const [nome, path] of PAGINAS) {
      const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, reducedMotion: w === 375 ? "reduce" : "no-preference" });
      const page = await ctx.newPage();
      const erros = [];
      page.on("console", m => { if (m.type() === "error") erros.push(m.text()); });
      page.on("pageerror", e => erros.push(String(e)));
      await page.goto(BASE + path, { waitUntil: "networkidle" });
      await rolarTudo(page);
      const info = await page.evaluate(() => {
        const main = document.querySelector("main");
        const txt = document.body.innerText;
        const pequenos = [...main.querySelectorAll("button, a, input:not([type=checkbox]):not([tabindex='-1'])")]
          .filter(e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && !e.closest("[aria-hidden=true]"); })
          .filter(e => !(e.tagName === "A" && getComputedStyle(e).display === "inline" && e.closest("p, label")))
          .filter(e => e.getBoundingClientRect().height < 44)
          .map(e => `${e.tagName}:${(e.innerText || e.getAttribute("aria-label") || "").trim().slice(0, 40)}:${Math.round(e.getBoundingClientRect().height)}`);
        const semLabel = [...main.querySelectorAll("input, textarea, select")].filter(i => i.tabIndex !== -1 && !i.closest("label") && !i.labels?.length).length;
        return {
          h1: document.querySelectorAll("h1").length,
          title: document.title,
          desc: document.querySelector("meta[name=description]")?.content || "",
          scrollX: document.documentElement.scrollWidth - window.innerWidth,
          lojas: [...document.querySelectorAll("a")].filter(a => /apps\.apple\.com|play\.google\.com/.test(a.href)).length,
          emBreve: /Em breve/i.test(txt),
          tipe20: /Tipe 2\.0/i.test(txt),
          escassez: /vagas limitadas|últimas vagas|restam \d/i.test(txt),
          hoje: txt.includes("Disponível hoje"), plan: txt.includes("Planejado no Guest"), demo: txt.includes("Demonstração"),
          linkFundador: !!document.querySelector("a[href='/restaurante-fundador']"),
          linkFundadorErrado: !!document.querySelector("main a[href='/fundador']"),
          applePay: /Apple Pay/.test(txt) && /Google Pay/.test(txt),
          pequenos, semLabel,
        };
      });
      const id = `${nome} ${w}px`;
      ok(info.h1 === 1, `${id}: H1 único (${info.h1})`);
      ok(info.scrollX <= 0, `${id}: sem rolagem horizontal (${info.scrollX})`);
      ok(erros.length === 0, `${id}: sem erro de console${erros.length ? " -> " + erros.slice(0, 3).join(" | ") : ""}`);
      ok(info.lojas === 0, `${id}: sem link de App Store/Google Play`);
      ok(!info.tipe20, `${id}: sem "Tipe 2.0" na interface`);
      ok(info.semLabel === 0, `${id}: todo campo com label (${info.semLabel} sem)`);
      ok(info.pequenos.length === 0, `${id}: alvos ≥ 44 px${info.pequenos.length ? " -> " + info.pequenos.slice(0, 6).join(", ") : ""}`);
      if (nome === "guest") {
        ok(info.emBreve, `${id}: "Em breve" mantido`);
        ok(info.hoje && info.plan && info.demo, `${id}: Disponível hoje / Planejado no Guest / Demonstração`);
        ok(info.linkFundador && !info.linkFundadorErrado, `${id}: link para /restaurante-fundador (nunca /fundador)`);
        ok(info.applePay, `${id}: Apple Pay e Google Pay citados como métodos`);
        ok(/Tipe Guest/.test(info.title) && info.desc.length > 50, `${id}: title/description (${info.title})`);
      }
      if (nome === "fundador") {
        ok(!info.escassez, `${id}: sem escassez artificial`);
        ok(/Restaurante Fundador/.test(info.title), `${id}: title (${info.title})`);
      }
      if (nome === "home") ok(info.emBreve, `${id}: home mantém "Em breve"`);
      if (nome !== "home" || w === 390 || w === 1440)
        await page.screenshot({ path: `${OUT}/${nome}-${w}.png`, fullPage: true });
      await ctx.close();
    }
  }

  // Formulários: grava de verdade pelo servidor (Supabase falso local) e mostra erro quando o servidor falha.
  const LOG = (process.env.FAKE_DIR || "/tmp/tipe-fase8") + "/leads.jsonl";
  for (const [origem, path, extra] of [["tipe-guest", "/produtos/guest#avisar", null], ["restaurante-fundador", "/restaurante-fundador#cadastro", true]]) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 900 } });
    const page = await ctx.newPage();
    const erros = []; page.on("pageerror", e => erros.push(String(e)));
    await page.goto(BASE + path, { waitUntil: "networkidle" });
    const form = page.locator("form").last();
    await form.scrollIntoViewIfNeeded();
    const btn = form.locator("button[type=submit]");
    // 1) sem consentimento: não envia
    await form.getByRole("textbox", { name: "Seu nome" }).fill("Ana Teste");
    await form.getByRole("textbox", { name: "E-mail" }).fill("ana@exemplo.com");
    if (extra) { await form.getByRole("textbox", { name: "Restaurante" }).fill("Maré Alta Teste"); await form.getByRole("textbox", { name: "WhatsApp" }).fill("85999990000"); }
    const consent = form.locator("input[type=checkbox]").first();
    ok(!(await consent.isChecked()), `${origem}: consentimento começa desmarcado`);
    const antes = fs.existsSync(LOG) ? fs.readFileSync(LOG, "utf8").trim().split("\n").filter(Boolean).length : 0;
    await btn.click();
    await page.waitForTimeout(500);
    ok(await form.getByRole("alert").isVisible(), `${origem}: sem consentimento mostra erro e não envia`);
    // 2) servidor falha: mostra erro, sem sucesso
    fs.writeFileSync((process.env.FAKE_DIR || "/tmp/tipe-fase8") + "/FALHAR", "1");
    await consent.check();
    await btn.click();
    await page.waitForSelector("[role=alert]:has-text('Não foi possível enviar')", { timeout: 15000 }).catch(() => {});
    ok(await page.getByText("Não foi possível enviar agora").isVisible(), `${origem}: falha do servidor mostra erro`);
    ok(!(await page.getByRole("status").count()), `${origem}: falha do servidor não mostra sucesso`);
    await page.screenshot({ path: `${OUT}/form-${origem}-erro-390.png` });
    // 3) servidor ok: sucesso
    fs.unlinkSync((process.env.FAKE_DIR || "/tmp/tipe-fase8") + "/FALHAR");
    await btn.click();
    await page.getByRole("status").waitFor({ timeout: 15000 }).catch(() => {});
    ok(await page.getByRole("status").isVisible(), `${origem}: servidor ok mostra sucesso`);
    await page.screenshot({ path: `${OUT}/form-${origem}-sucesso-390.png` });
    const linhas = fs.readFileSync(LOG, "utf8").trim().split("\n").filter(Boolean);
    ok(linhas.length === antes + 1, `${origem}: exatamente 1 lead gravado no restaurant_leads (falso)`);
    const row = JSON.parse(linhas[linhas.length - 1]);
    ok(row.origin_page === origem && !!row.privacy_accepted_at && row.marketing_opt_in === false, `${origem}: origin_page=${row.origin_page}, consentimento registrado, novidades=${row.marketing_opt_in}`);
    res.push(`      linha gravada: ${JSON.stringify({ restaurant_name: row.restaurant_name, origin_page: row.origin_page, phone: row.phone, notes: row.notes })}`);
    ok(erros.length === 0, `${origem}: sem erro de página no envio`);
    await ctx.close();
  }
  await browser.close();
  console.log(res.join("\n"));
})();
