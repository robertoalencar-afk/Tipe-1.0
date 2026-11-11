/** Envia convite de acesso a um garçom já cadastrado. Chamar somente após verificar que o autor é dono. */
export async function grantWaiterAccessCore(input: { restaurantId: string; slug: string; waiterId: string; email: string; actorId: string }) {
  const { enforceRate, logSecurityEvent } = await import("./security.server");
  await enforceRate(`waiter-invite:${input.restaurantId}`, 20, 3600, input.slug);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const email = input.email.trim().toLowerCase();
  const { data: w } = await supabaseAdmin.from("pdv_waiters").select("id, name, user_id, active").eq("id", input.waiterId).eq("restaurant_id", input.restaurantId).maybeSingle();
  if (!w || !w.active) throw new Error("Garçom não encontrado ou inativo");

  const { getRequestHeader } = await import("@tanstack/react-start/server");
  const { origemConfiavel } = await import("./recuperar-senha");
  const origin = origemConfiavel(getRequestHeader("origin"));

  let userId: string | undefined;
  let invited = false;
  const inv = await supabaseAdmin.auth.admin.inviteUserByEmail(email, { redirectTo: `${origin}/redefinir-senha/garcom`, data: { name: w.name } });
  if (inv.data?.user) { userId = inv.data.user.id; invited = true; }
  else {
    for (let page = 1; page <= 10 && !userId; page++) {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      userId = list?.users.find((u) => u.email?.toLowerCase() === email)?.id;
      if (!list || list.users.length < 200) break;
    }
  }
  if (!userId) throw new Error("Não foi possível enviar o convite para esse e-mail");
  if (!invited) {
    const { error: rErr } = await supabaseAdmin.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/redefinir-senha/garcom` });
    if (rErr) console.error("waiter reset email", rErr.message);
  }
  const { data: other } = await supabaseAdmin.from("pdv_waiters").select("id").eq("user_id", userId).neq("id", w.id).maybeSingle();
  if (other) throw new Error("Esse e-mail já está ligado a outro garçom");

  await supabaseAdmin.from("pdv_waiters").update({ user_id: userId, email }).eq("id", w.id);
  await supabaseAdmin.from("staff_members").upsert({ user_id: userId, restaurant_id: input.restaurantId, display_name: w.name, email }, { onConflict: "user_id,restaurant_id" });
  await supabaseAdmin.from("user_roles").upsert({ user_id: userId, restaurant_id: input.restaurantId, role: "waiter" }, { onConflict: "user_id,role,restaurant_id", ignoreDuplicates: true });
  { const { logSecurityEvent } = await import("./security.server"); await logSecurityEvent({ action: "role_granted", resource: "user_roles:waiter", restaurantId: input.restaurantId, detail: `usuário ${userId}` }); }
  await logSecurityEvent({ action: "waiter_access_granted", resource: `pdv_waiters:${w.id}`, restaurantId: input.restaurantId, actorId: input.actorId });
  return { invited };
}
