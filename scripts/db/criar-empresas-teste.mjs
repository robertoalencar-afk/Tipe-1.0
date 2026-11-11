// Cria duas empresas virtuais para teste num banco Supabase novo.
//
//   SUPABASE_URL=https://XXXX.supabase.co \
//   SUPABASE_PUBLISHABLE_KEY=sb_publishable_... \
//   SUPABASE_SERVICE_ROLE_KEY=sb_secret_... \
//   FOUNDER_EMAIL=voce@tipe.digital \
//   SENHA_TESTE=uma-senha-sua \
//   node scripts/db/criar-empresas-teste.mjs
//
// Para cada empresa: dono e garçom com login, cardápio, mesas e uma conta aberta
// na mesa 1. FOUNDER_EMAIL (opcional) vira fundador; se a conta ainda não existe,
// é criada com senha. Com SENHA_TESTE todas as contas criadas usam essa senha;
// sem ela, cada conta recebe uma senha aleatória impressa no fim.
// Rodar de novo não duplica nada.
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

const URL = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_PUBLISHABLE_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !ANON || !SERVICE) {
  console.error("Defina SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY e SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const admin = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
const senha = () => process.env.SENHA_TESTE || `Teste-${randomBytes(6).toString("base64url")}`;
const contas = [];

const EMPRESAS = [
  {
    nome: "Bistrô Teste", slug: "bistro-teste", cnpj: "11222333000181", endereco: "Rua das Flores, 100, Centro, São Paulo SP",
    dono: "dono.bistro@exemplo.tipe.digital", garcom: { nome: "Ana Garçom", email: "garcom.bistro@exemplo.tipe.digital" }, mesas: 10,
    cardapio: [
      ["Pratos", [["PIC", "Picanha na chapa", 89.9, "cozinha"], ["RIS", "Risoto de cogumelos", 62, "cozinha"], ["SAL", "Salada da casa", 34, "cozinha"]]],
      ["Bebidas", [["CHP", "Chope 300 ml", 14.9, "bar"], ["SUC", "Suco natural", 12, "bar"], ["AGU", "Água sem gás", 6, "bar"]]],
    ],
    contaMesa1: [["PIC", 1], ["CHP", 3], ["SUC", 1]],
  },
  {
    nome: "Bar do Teste", slug: "bar-teste", cnpj: "44555666000152", endereco: "Avenida Atlântica, 2000, Copacabana, Rio de Janeiro RJ",
    dono: "dono.bar@exemplo.tipe.digital", garcom: { nome: "Beto Garçom", email: "garcom.bar@exemplo.tipe.digital" }, mesas: 8,
    cardapio: [
      ["Petiscos", [["BOL", "Bolinho de bacalhau (6)", 42, "cozinha"], ["FRI", "Fritas com queijo", 32, "cozinha"]]],
      ["Bebidas", [["CRV", "Cerveja 600 ml", 18, "bar"], ["CAI", "Caipirinha", 24, "bar"], ["REF", "Refrigerante", 7, "bar"]]],
    ],
    contaMesa1: [["BOL", 1], ["CRV", 2], ["CAI", 2]],
  },
];

async function garantirUsuario(email, nome) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const achado = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (achado) return { id: achado.id, senha: null };
    if (data.users.length < 200) break;
  }
  const s = senha();
  const { data, error } = await admin.auth.admin.createUser({ email, password: s, email_confirm: true, user_metadata: { name: nome } });
  if (error) throw error;
  return { id: data.user.id, senha: s };
}

async function entrarComo(email, s) {
  const c = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: s });
  if (error) throw new Error(`login ${email}: ${error.message}`);
  return c;
}

const ok = (r, o) => { if (r.error) throw new Error(`${o}: ${r.error.message}`); return r.data; };

for (const e of EMPRESAS) {
  const { data: existe } = await admin.from("restaurants").select("id").eq("slug", e.slug).maybeSingle();
  if (existe) { console.log(`${e.nome}: já existe, pulando`); continue; }

  // Dono cria o restaurante pelo mesmo caminho do /cadastro.
  const dono = await garantirUsuario(e.dono, `Dono ${e.nome}`);
  if (!dono.senha) {
    dono.senha = senha();
    ok(await admin.auth.admin.updateUserById(dono.id, { password: dono.senha }), "senha do dono");
  }
  contas.push([e.nome, "dono", e.dono, dono.senha]);
  const sb = await entrarComo(e.dono, dono.senha);
  ok(await sb.rpc("signup_restaurant", { p_name: e.nome, p_slug: e.slug, p_plan: "profissional", p_tables: e.mesas, p_display_name: `Dono ${e.nome}`, p_cnpj: e.cnpj, p_address: e.endereco, p_phone: "11999990000" }), "signup_restaurant");
  const { id: rid } = ok(await admin.from("restaurants").select("id").eq("slug", e.slug).single(), "restaurante");

  // PDV: lançamento pela própria TIPE (sem sistema externo).
  ok(await admin.from("pdv_connections").upsert({ restaurant_id: rid, adapter: "lancamento_tipe", status: "connected" }), "pdv_connections");
  ok(await sb.rpc("finish_onboarding", { p_slug: e.slug }), "finish_onboarding");

  // Cardápio.
  const precos = {};
  let pos = 0;
  for (const [categoria, itens] of e.cardapio) {
    const cat = ok(await sb.from("pdv_menu_categories").insert({ restaurant_id: rid, name: categoria, position: pos++ }).select("id").single(), "categoria");
    let p = 0;
    for (const [code, name, price, sector] of itens) {
      ok(await sb.from("pdv_menu_items").insert({ restaurant_id: rid, category_id: cat.id, code, name, price, sector, position: p++ }), "item");
      precos[code] = { name, price };
    }
  }

  // Garçom com login.
  const g = ok(await sb.from("pdv_waiters").insert({ restaurant_id: rid, code: "G1", name: e.garcom.nome, active: true }).select("id").single(), "garçom");
  const ug = await garantirUsuario(e.garcom.email, e.garcom.nome);
  if (!ug.senha) { ug.senha = senha(); ok(await admin.auth.admin.updateUserById(ug.id, { password: ug.senha }), "senha do garçom"); }
  contas.push([e.nome, "garçom", e.garcom.email, ug.senha]);
  ok(await admin.from("pdv_waiters").update({ user_id: ug.id, email: e.garcom.email }).eq("id", g.id), "ligar garçom");
  ok(await admin.from("staff_members").upsert({ user_id: ug.id, restaurant_id: rid, display_name: e.garcom.nome, email: e.garcom.email }, { onConflict: "user_id,restaurant_id" }), "staff garçom");
  ok(await admin.from("user_roles").upsert({ user_id: ug.id, restaurant_id: rid, role: "waiter" }, { onConflict: "user_id,role,restaurant_id", ignoreDuplicates: true }), "papel garçom");

  // Conta aberta na mesa 1 para testar o pagamento pelo QR Code.
  const agora = new Date().toISOString();
  ok(await admin.from("table_bill_items").insert(e.contaMesa1.map(([code, qtd]) => ({
    restaurant_slug: e.slug, table_number: "1", item_code: code, item_name: precos[code].name, unit_price: precos[code].price,
    ordered_quantity: qtd, ordered_by: e.garcom.nome, ordered_at: agora, source_adapter: "lancamento_tipe",
  }))), "conta da mesa 1");
  console.log(`${e.nome}: criado em /${e.slug} (conta aberta na mesa 1)`);
}

// Módulos de demonstração: Tipe Order (mesas), Tipe Cozinha e totem ligados nas empresas de teste,
// mesmo quando elas já existiam. Idempotente; só empresas virtuais (nunca cliente real).
for (const e of EMPRESAS) {
  const { data: r } = await admin.from("restaurants").select("id").eq("slug", e.slug).maybeSingle();
  if (!r) continue;
  for (const m of ["order", "kds", "totem"]) {
    const { error } = await admin.rpc("set_restaurant_module", { p_rid: r.id, p_module: m, p_status: "active", p_reason: "demonstração", p_actor: null, p_actor_kind: "system" });
    if (error) console.warn(`${e.nome}: módulo ${m}: ${error.message}`);
  }
  ok(await admin.from("restaurants").update({ self_order_enabled: true, order_session_mode: "staff_opens", totem_enabled: true }).eq("id", r.id), "ligar order/totem");
  console.log(`${e.nome}: Tipe Order, Cozinha e totem ligados para simulação`);
}

if (process.env.FOUNDER_EMAIL) {
  const f = await garantirUsuario(process.env.FOUNDER_EMAIL, "Fundador");
  ok(await admin.from("user_roles").upsert({ user_id: f.id, role: "founder", restaurant_id: null }, { onConflict: "user_id,role,restaurant_id", ignoreDuplicates: true }), "papel fundador");
  if (f.senha) contas.push(["TIPE", "fundador", process.env.FOUNDER_EMAIL, f.senha]);
  console.log(`Fundador: ${process.env.FOUNDER_EMAIL}`);
}

if (contas.length) {
  console.log("\nAcessos criados (guarde agora; as senhas não são mostradas de novo):");
  for (const [empresa, papel, email, s] of contas) console.log(`  ${empresa.padEnd(14)} ${papel.padEnd(9)} ${email.padEnd(40)} ${process.env.SENHA_TESTE ? "(SENHA_TESTE)" : s}`);
}
