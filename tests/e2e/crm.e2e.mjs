// Teste ponta a ponta do CRM (/crm) em modo demonstração.
// Uso: com o servidor de desenvolvimento rodando (npx vite dev --port 5173),
//   node tests/e2e/crm.e2e.mjs            # BASE=http://127.0.0.1:5173 por padrão
//   SHOTS=/caminho node tests/e2e/crm.e2e.mjs   # salva capturas de tela
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://127.0.0.1:5173";
const SHOTS = process.env.SHOTS;
const results = [];
const consoleErrors = [];

const browser = await chromium.launch();

async function newPage(viewport = { width: 1440, height: 900 }) {
  const ctx = await browser.newContext({ viewport, locale: "pt-BR" });
  const page = await ctx.newPage();
  page.on("console", (m) => {
    if (m.type() === "error" && !/favicon|Download the React DevTools/.test(m.text())) consoleErrors.push(`${page.url()} :: ${m.text()}`);
  });
  page.on("pageerror", (e) => consoleErrors.push(`${page.url()} :: PAGEERROR ${e.message}`));
  return page;
}

async function step(name, fn) {
  const t = Date.now();
  try {
    await fn();
    results.push({ name, ok: true, ms: Date.now() - t });
    console.log(`ok   ${name}`);
  } catch (e) {
    results.push({ name, ok: false, ms: Date.now() - t, error: String(e.message ?? e).split("\n")[0] });
    console.log(`FAIL ${name}\n     ${String(e.message ?? e).split("\n").slice(0, 3).join("\n     ")}`);
  }
}

async function ready(page) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1200);
}

async function go(page, path) {
  await page.goto(BASE + path);
  await ready(page);
}

async function shot(page, name) {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
}

async function dismissCookies(page) {
  const btn = page.getByRole("button", { name: /^(Aceitar|Recusar|Entendi|Aceitar todos|Rejeitar)/i }).first();
  if (await btn.isVisible().catch(() => false)) await btn.click();
}

async function login(page, email) {
  await go(page, "/crm/entrar");
  await dismissCookies(page);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("demo1234");
  await page.getByRole("button", { name: /Entrar no CRM da Tipe/ }).click();
  await page.waitForURL(/\/crm\/?$/, { timeout: 15000 });
  await ready(page);
}

async function expectText(page, text, timeout = 8000) {
  await page.getByText(text).first().waitFor({ state: "visible", timeout });
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const h1 = (page) => page.locator("main h1").first().innerText();
const resetStorage = (page) => page.evaluate(() => localStorage.clear());

// ---------------------------------------------------------------------------
const page = await newPage();

await step("Sem sessão, /crm leva à tela de entrada", async () => {
  await go(page, "/crm");
  await resetStorage(page);
  await go(page, "/crm/oportunidades");
  await page.waitForURL(/\/crm\/entrar/, { timeout: 10000 });
});

await step("Senha errada mostra erro sem entrar", async () => {
  await dismissCookies(page);
  await page.getByLabel("E-mail").fill("helena@tipe.demo");
  await page.getByLabel("Senha").fill("errada");
  await page.getByRole("button", { name: /Entrar no CRM da Tipe/ }).click();
  await expectText(page, /não conferem/);
  assert(page.url().includes("/crm/entrar"), "não deveria sair da tela de entrada");
});

await step("Login como proprietária e dashboard com indicadores", async () => {
  await login(page, "helena@tipe.demo");
  await expectText(page, "Saúde da carteira");
  await expectText(page, "Do lead ao restaurante ativo");
  await shot(page, "01-painel");
  await go(page, "/crm/comercial");
  await expectText(page, "Receita ganha");
  await expectText(page, "Funil de conversão");
});

const ROUTES = [
  ["/crm/comercial", "Painel comercial"], ["/crm/jornada", "Jornada integrada"], ["/crm/contas", "Contas de restaurante"], ["/crm/clientes", "Clientes"],
  ["/crm/contatos", "Contatos"], ["/crm/empresas", "Empresas"], ["/crm/leads", "Leads"], ["/crm/oportunidades", "Oportunidades"],
  ["/crm/funis", "Funis"], ["/crm/tarefas", "Tarefas"], ["/crm/calendario", "Calendário"], ["/crm/atendimento", "Atendimento"],
  ["/crm/whatsapp", "WhatsApp"], ["/crm/suporte", "Suporte"], ["/crm/equipe", "Equipe"], ["/crm/organizacoes", "Organizações"],
  ["/crm/gamificacao", "Gamificação"], ["/crm/relatorios", "Relatórios"], ["/crm/planos", "Planos"], ["/crm/financeiro", "Financeiro"],
  ["/crm/configuracoes", "Configurações"], ["/crm/perfil", "Perfil"], ["/crm/admin", "Administração"],
];

await step("Todas as páginas do menu abrem com título certo", async () => {
  const bad = [];
  for (const [path, title] of ROUTES) {
    await go(page, path);
    const t = await h1(page).catch(() => "");
    if (!t.includes(title)) bad.push(`${path} → "${t}"`);
    await shot(page, `02${path.replaceAll("/", "-")}`);
  }
  assert(!bad.length, `títulos inesperados: ${bad.join(", ")}`);
});

await step("Links internos do menu apontam para rotas existentes", async () => {
  await go(page, "/crm");
  const hrefs = await page.locator('a[href^="/crm"]').evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute("href").split("?")[0]))]);
  const broken = [];
  for (const href of hrefs) {
    const r = await page.request.get(BASE + href);
    if (r.status() >= 400) broken.push(`${href} ${r.status()}`);
  }
  assert(!broken.length, `links quebrados: ${broken.join(", ")}`);
});

await step("Busca global encontra contato e abre", async () => {
  await go(page, "/crm");
  await page.keyboard.press("Control+k");
  await page.getByPlaceholder(/Digite um nome/).fill("Maré Alta");
  await page.getByRole("option").first().click();
  await ready(page);
  assert(/\/crm\/(contas|contatos|empresas|oportunidades)/.test(page.url()), `abriu ${page.url()}`);
});

// Fluxo comercial: lead → qualificar → converter → ganhar → XP
const LEAD = `Restaurante Teste ${Date.now() % 100000}`;
await step("Fluxo comercial: criar lead com perfil", async () => {
  await go(page, "/crm/leads");
  await page.getByRole("button", { name: /Novo lead/ }).first().click();
  const dlg = page.getByRole("dialog");
  await dlg.getByLabel("Nome", { exact: true }).fill("Rafaela Teste");
  await dlg.getByLabel("Restaurante").fill(LEAD);
  await dlg.getByLabel("E-mail").fill("rafaela.teste@exemplo.demo");
  await dlg.getByLabel("Telefone").fill("(85) 98888-1234");
  await dlg.getByLabel("Mesas").selectOption({ index: 2 });
  await dlg.getByLabel("Fila para pagar no pico").selectOption({ index: 1 });
  await dlg.getByLabel("Tempo para fechar a conta").selectOption({ index: 2 });
  await dlg.getByRole("button", { name: "Criar lead" }).click();
  await expectText(page, LEAD);
});

await step("Fluxo comercial: qualificar e converter em oportunidade", async () => {
  await page.getByPlaceholder(/Buscar/).first().fill(LEAD).catch(() => {});
  const row = page.locator("li, tr").filter({ hasText: LEAD }).filter({ has: page.getByRole("button", { name: "Qualificar", exact: true }) }).first();
  await row.getByRole("button", { name: "Qualificar", exact: true }).click();
  await expectText(page, /qualificado/);
  await page.getByRole("button", { name: "Todos" }).or(page.getByRole("radio", { name: "Todos" })).first().click().catch(() => {});
  const row2 = page.locator("li, tr").filter({ hasText: LEAD }).filter({ has: page.getByRole("button", { name: "Converter", exact: true }) }).first();
  await row2.getByRole("button", { name: "Converter", exact: true }).click();
  const dlg = page.getByRole("dialog");
  await dlg.getByLabel(/Valor anual estimado/).fill("12000");
  await dlg.getByRole("button", { name: /Converter em oportunidade/ }).click();
  await page.waitForURL(/\/crm\/oportunidades/, { timeout: 10000 });
  await ready(page);
});

await step("Fluxo comercial: mover para Ganho atualiza dashboard e pontos", async () => {
  await go(page, "/crm/gamificacao");
  const before = await page.getByText(/pontos no total/).first().locator("..").innerText();
  await go(page, "/crm/oportunidades");
  await page.getByRole("button", { name: new RegExp(`Mover ${LEAD}`) }).first().click();
  await page.getByRole("menuitem", { name: "Ganho" }).click();
  await expectText(page, /ganha|Ganh/);
  await go(page, "/crm/gamificacao");
  const after = await page.getByText(/pontos no total/).first().locator("..").innerText();
  assert(before !== after, `XP não mudou (${before})`);
  await expectText(page, /Oportunidade ganha/);
  // Reabrir e ganhar de novo não pode pontuar em dobro: conferido no teste unitário do motor.
});

await step("Camada B: negócio ganho vira conta em implantação, conclui etapas e ativa na primeira conta paga", async () => {
  await go(page, "/crm/contas?visao=implantacao");
  await page.getByRole("link", { name: new RegExp(LEAD) }).first().click();
  await page.waitForURL(/\/crm\/contas\/[^/]+$/, { timeout: 10000 });
  await ready(page);
  await expectText(page, "Em implantação");
  await page.getByRole("radio", { name: /Módulos e integrações/ }).click();
  await page.getByLabel("Conta de recebimento").selectOption("aprovada");
  await page.getByRole("radio", { name: /^Implantação/ }).click();
  for (let i = 0; i < 6; i++) {
    const btn = page.getByRole("button", { name: "Concluir", exact: true }).and(page.locator(":not([disabled])")).first();
    if (!(await btn.isVisible().catch(() => false))) break;
    await btn.click();
    await page.waitForTimeout(400);
  }
  await shot(page, "05-conta-implantacao");
  await page.getByRole("button", { name: /Simular conta paga/ }).click();
  await expectText(page, /Conta ativada|Ativa/);
  await page.getByRole("radio", { name: "Jornada" }).click();
  await expectText(page, "Negócio ganho");
  await expectText(page, "Primeira conta paga pela Tipe");
  await shot(page, "06-conta-jornada");
});

await step("Jornada: cadastro no site entra como lead distribuído", async () => {
  await go(page, "/crm/jornada");
  const before = await page.locator("section", { hasText: "Comercial: vender a Tipe" }).first().innerText();
  await page.getByRole("button", { name: /Simular cadastro no site/ }).click();
  await page.waitForTimeout(600);
  const after = await page.locator("section", { hasText: "Comercial: vender a Tipe" }).first().innerText();
  assert(before !== after, "contagem de leads do site não mudou");
  await shot(page, "07-jornada");
});

await step("Camada C: segmentos, perfil do cliente e campanha só com consentimento", async () => {
  await go(page, "/crm/clientes");
  await page.getByRole("radio", { name: /Sumidos/ }).click();
  await page.locator("tbody tr").first().getByRole("button").click();
  await expectText(page, /Visitas/);
  await expectText(page, /aceitou|Não aceitou/i);
  await page.waitForTimeout(700);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/08-clientes-perfil.png` });
  await page.keyboard.press("Escape");
  await page.getByRole("radio", { name: /Campanhas/ }).click();
  await page.getByLabel("Para quem").selectOption("todos");
  await page.getByLabel("Nome da campanha").fill("Volta pra mesa E2E");
  await page.getByLabel("Mensagem").fill("Sentimos sua falta! Sobremesa por nossa conta nesta semana.");
  await page.getByRole("button", { name: /Registrar campanha/ }).click();
  await expectText(page, "Volta pra mesa E2E");
  await shot(page, "09-clientes-campanhas");
});

await step("Suporte: chamado ligado a um restaurante aparece na conta", async () => {
  await go(page, "/crm/suporte");
  await page.getByRole("button", { name: /Abrir chamado/ }).first().click();
  const dlg = page.getByRole("dialog");
  await dlg.getByLabel("Assunto").fill("QR da mesa 4 não abre");
  await dlg.getByLabel("O que aconteceu").fill("Cliente leu o QR da mesa 4 e a conta não carregou.");
  await dlg.getByLabel("Restaurante").selectOption({ index: 1 });
  await dlg.getByRole("button", { name: "Abrir chamado" }).click();
  await page.getByRole("radio", { name: /Restaurantes/ }).click();
  await expectText(page, "QR da mesa 4 não abre");
});

await step("Atendimento: simular mensagem, atribuir, responder, criar oportunidade e encerrar", async () => {
  await go(page, "/crm/atendimento");
  await page.getByRole("button", { name: /Simular mensagem recebida/ }).first().click();
  const dlg = page.getByRole("dialog");
  await dlg.getByLabel("Nome no WhatsApp").fill("Cliente E2E");
  await dlg.getByLabel("Número").fill("(85) 90000-7001");
  await dlg.getByLabel("Mensagem").fill("Olá, quero conhecer a Tipe para meu bar.");
  await dlg.locator('button[type="submit"]').click();
  await expectText(page, "Cliente E2E");
  await ready(page);
  await page.getByLabel(/Atribuir atendente|Transferir conversa/).first().selectOption({ index: 1 });
  await page.getByLabel("Mensagem", { exact: true }).fill("Oi! Posso te mostrar a Tipe amanhã às 15h?");
  await page.getByRole("button", { name: "Enviar mensagem simulada" }).click();
  await expectText(page, "Posso te mostrar a Tipe amanhã");
  await page.getByRole("button", { name: /Criar oportunidade/ }).first().click();
  const d2 = page.getByRole("dialog");
  await d2.getByLabel(/Valor/).fill("6000");
  await d2.getByRole("button", { name: /Criar oportunidade/ }).click();
  await ready(page);
  await page.goBack().catch(() => {});
  await go(page, "/crm/atendimento");
  await page.getByText("Cliente E2E").first().click();
  await page.getByRole("button", { name: /Encerrar/ }).first().click();
  await expectText(page, "Atendimento encerrado");
  await shot(page, "03-atendimento");
});

await step("Produtividade: criar tarefa, concluir e ver no Meu dia", async () => {
  await go(page, "/crm/tarefas?visao=meu-dia");
  await page.getByRole("button", { name: /Nova tarefa/ }).first().click();
  const dlg = page.getByRole("dialog");
  await dlg.getByLabel("O que fazer").fill("Ligar para Cliente E2E");
  const today = await page.evaluate(() => { const d = new Date(); d.setHours(18, 0, 0, 0); const p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T18:00`; });
  await dlg.getByLabel("Prazo").fill(today);
  await dlg.getByRole("button", { name: /Criar tarefa/ }).click();
  await expectText(page, "Ligar para Cliente E2E");
  await page.getByRole("button", { name: "Concluir Ligar para Cliente E2E" }).first().click();
  await expectText(page, "Tarefa concluída");
  // Criada e concluída em menos de 5 minutos, sem contato ou oportunidade: não rende pontos (regra anti-abuso).
});

await step("Organização: criar, convidar, definir papel, trocar e ver dados isolados", async () => {
  await go(page, "/crm/organizacoes");
  await page.getByRole("button", { name: "Criar organização" }).first().click();
  const dlg = page.getByRole("dialog");
  const ORG = `Org E2E ${Date.now() % 10000}`;
  await dlg.getByLabel("Nome da organização").fill(ORG);
  await dlg.getByRole("button", { name: "Criar organização" }).click();
  await page.waitForURL(/\/crm\/?$/, { timeout: 10000 });
  await ready(page);
  await go(page, "/crm/contatos");
  assert(!(await page.getByText("Maré Alta").first().isVisible().catch(() => false)), "contatos de outra organização aparecendo");
  await go(page, "/crm/equipe");
  await page.getByRole("button", { name: /Convidar pessoa/ }).click();
  const inv = page.getByRole("dialog");
  await inv.getByLabel("Nome").fill("Pessoa Convidada");
  await inv.getByLabel("E-mail").fill(`convidada${Date.now() % 10000}@exemplo.demo`);
  await inv.getByLabel("Papel").selectOption("agent");
  await inv.getByRole("button", { name: "Enviar convite" }).click();
  await page.getByRole("button", { name: "Simular aceite" }).first().click();
  await expectText(page, "Pessoa Convidada");
  await page.getByLabel("Papel de Pessoa Convidada").selectOption("viewer");
  await ready(page);
  // Plano Starter: 3 usuários. Helena + convidada = 2; 2 convites a mais estouram o limite.
  for (let i = 0; i < 2; i++) {
    await page.getByRole("button", { name: /Convidar pessoa/ }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel("Nome").fill(`Extra ${i}`);
    await d.getByLabel("E-mail").fill(`extra${i}.${Date.now() % 10000}@exemplo.demo`);
    await d.getByRole("button", { name: "Enviar convite" }).click();
    await page.waitForTimeout(600);
  }
  await expectText(page, /permite até 3 usuários/);
  await page.keyboard.press("Escape");
});

await step("Assinatura: contratar plano libera limite e gera fatura fictícia", async () => {
  await go(page, "/crm/planos");
  await page.getByRole("button", { name: /Fazer upgrade para Professional/ }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: /Fazer upgrade para Professional/ }).click();
  await expectText(page, /Plano atual: Professional/);
  await go(page, "/crm/financeiro");
  await expectText(page, /Plano Professional: mensalidade/);
  await go(page, "/crm/equipe");
  await page.getByRole("button", { name: /Convidar pessoa/ }).click();
  const d = page.getByRole("dialog");
  await d.getByLabel("Nome").fill("Depois do upgrade");
  await d.getByLabel("E-mail").fill(`depois${Date.now() % 10000}@exemplo.demo`);
  await d.getByRole("button", { name: "Enviar convite" }).click();
  await expectText(page, "Depois do upgrade");
});

await step("Trocar de volta para Tipe Comercial pelo seletor do cabeçalho", async () => {
  await go(page, "/crm/organizacoes");
  await page.getByRole("button", { name: /Entrar em Tipe Comercial/ }).click();
  await page.waitForURL(/\/crm\/?$/);
  await ready(page);
  await go(page, "/crm/contatos");
  await expectText(page, /Maré Alta|Cantina do Farol/);
});

// Permissões: leitura e vendedor
const viewer = await newPage();
await step("Somente leitura: sem botões de criação e sem administração", async () => {
  await login(viewer, "lia@tipe.demo");
  await go(viewer, "/crm/contatos");
  assert(!(await viewer.getByRole("button", { name: /Novo contato/ }).first().isVisible().catch(() => false)), "leitura vê Novo contato");
  await go(viewer, "/crm/admin");
  await expectText(viewer, /Sem acesso/);
  await go(viewer, "/crm/financeiro");
  await expectText(viewer, /Sem acesso/);
});

const seller = await newPage();
await step("Vendedor: sem acesso ao financeiro e à administração", async () => {
  await login(seller, "thiago@tipe.demo");
  await go(seller, "/crm/financeiro");
  await expectText(seller, /Sem acesso/);
  await go(seller, "/crm/admin");
  await expectText(seller, /Sem acesso/);
  await go(seller, "/crm/equipe");
  assert(!(await seller.getByRole("button", { name: /Convidar pessoa/ }).isVisible().catch(() => false)), "vendedor vê Convidar");
});

await step("Isolamento: parceiro de Recife não vê dados da Tipe Comercial", async () => {
  const p = await newPage();
  await login(p, "otavio@parceiro.demo");
  await go(p, "/crm/contatos");
  assert(!(await p.getByText(/Cantina do Farol|Maré Alta/).first().isVisible().catch(() => false)), "dados de outra organização visíveis");
  await go(p, "/crm/admin");
  await expectText(p, /Sem acesso/);
});

// Celular
const mobile = await newPage({ width: 390, height: 844 });
await step("Celular: menu lateral, dashboard, funil e atendimento sem rolagem horizontal", async () => {
  await login(mobile, "marina@tipe.demo");
  const overflow = [];
  for (const path of ["/crm", "/crm/jornada", "/crm/contas", "/crm/clientes", "/crm/contatos", "/crm/oportunidades", "/crm/atendimento", "/crm/tarefas", "/crm/gamificacao", "/crm/planos", "/crm/relatorios"]) {
    await go(mobile, path);
    const w = await mobile.evaluate(() => document.documentElement.scrollWidth);
    if (w > 392) overflow.push(`${path} (${w}px)`);
    await shot(mobile, `04-mobile${path.replaceAll("/", "-")}`);
  }
  await go(mobile, "/crm");
  await mobile.getByRole("button", { name: /Abrir menu/ }).click();
  await mobile.getByRole("link", { name: "Oportunidades" }).last().click();
  await mobile.waitForURL(/oportunidades/);
  assert(!overflow.length, `rolagem horizontal em ${overflow.join(", ")}`);
});

await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passos ok`);
if (consoleErrors.length) {
  console.log(`\nErros de console (${consoleErrors.length}):`);
  for (const e of [...new Set(consoleErrors)].slice(0, 30)) console.log(" - " + e.slice(0, 300));
}
process.exit(failed.length || consoleErrors.length ? 1 : 0);
