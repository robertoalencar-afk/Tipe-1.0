// Acesso único de demonstração (04/11, pedido do Roberto): um só usuário entra em tudo das
// empresas virtuais (dono, caixa e garçom de teste-tipe, bistro-teste e bar-teste) e no
// backoffice, com a senha do segredo SENHA_TESTE. Só toca nas empresas virtuais; rodar de
// novo não duplica nada. A senha nunca é impressa.
//
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... SENHA_TESTE=... DEMO_EMAIL=roberto@tipe.digital \
//   node scripts/db/acesso-demo.mjs
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SENHA = process.env.SENHA_TESTE;
const EMAIL = (process.env.DEMO_EMAIL || "roberto@tipe.digital").trim().toLowerCase();
if (!URL || !SERVICE || !SENHA) {
  console.error("Defina SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e SENHA_TESTE.");
  process.exit(1);
}
if (SENHA.length < 8) {
  console.error("SENHA_TESTE precisa ter pelo menos 8 caracteres.");
  process.exit(1);
}
const VIRTUAIS = ["teste-tipe", "bistro-teste", "bar-teste"];
const admin = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
const ok = (r, o) => {
  if (r.error) throw new Error(`${o}: ${r.error.message}`);
  return r.data;
};

let user = null;
for (let page = 1; page <= 20 && !user; page++) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
  if (error) throw error;
  user = data.users.find((u) => u.email?.toLowerCase() === EMAIL) ?? null;
  if (data.users.length < 200) break;
}
if (user) {
  ok(await admin.auth.admin.updateUserById(user.id, { password: SENHA, email_confirm: true }), "senha");
  console.log(`${EMAIL}: senha atualizada para a SENHA_TESTE`);
} else {
  const { data, error } = await admin.auth.admin.createUser({ email: EMAIL, password: SENHA, email_confirm: true, user_metadata: { name: "Roberto" } });
  if (error) throw error;
  user = data.user;
  console.log(`${EMAIL}: conta criada com a SENHA_TESTE`);
}

ok(await admin.from("user_roles").upsert({ user_id: user.id, role: "founder", restaurant_id: null }, { onConflict: "user_id,role,restaurant_id", ignoreDuplicates: true }), "fundador");

for (const slug of VIRTUAIS) {
  const { data: r } = await admin.from("restaurants").select("id, name").eq("slug", slug).maybeSingle();
  if (!r) {
    console.log(`${slug}: não existe neste banco, pulando`);
    continue;
  }
  for (const role of ["owner", "cashier", "waiter"]) {
    ok(await admin.from("user_roles").upsert({ user_id: user.id, restaurant_id: r.id, role }, { onConflict: "user_id,role,restaurant_id", ignoreDuplicates: true }), `papel ${role}`);
  }
  ok(await admin.from("staff_members").upsert({ user_id: user.id, restaurant_id: r.id, display_name: "Roberto", email: EMAIL }, { onConflict: "user_id,restaurant_id" }), "equipe");
  // pdv_waiters.user_id é único: o usuário é garçom (app do garçom) numa empresa só, a primeira que existir.
  const { data: g } = await admin.from("pdv_waiters").select("id").eq("user_id", user.id).maybeSingle();
  if (!g) {
    const { data: codes } = await admin.from("pdv_waiters").select("code").eq("restaurant_id", r.id);
    const usados = new Set((codes ?? []).map((c) => c.code));
    let n = 9;
    while (usados.has(`G${n}`)) n++;
    ok(await admin.from("pdv_waiters").insert({ restaurant_id: r.id, code: `G${n}`, name: "Roberto", active: true, user_id: user.id, email: EMAIL }), "garçom");
  }
  console.log(`${slug} (${r.name}): dono, caixa e garçom liberados para ${EMAIL}`);
}
console.log("Pronto. Entre em /entrar com esse e-mail e a SENHA_TESTE.");
