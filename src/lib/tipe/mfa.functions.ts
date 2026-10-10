import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function sha256(s: string) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
const norm = (c: string) => c.replace(/[^a-z0-9]/gi, "").toUpperCase();

/** Gera 10 códigos de recuperação (substitui os anteriores). Exige sessão com 2FA. */
export const generateRecoveryCodes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if ((context.claims as { aal?: string }).aal !== "aal2") throw new Error("Confirme a verificação em duas etapas primeiro");
    const codes = Array.from({ length: 10 }, () => {
      const b = crypto.getRandomValues(new Uint8Array(5));
      const s = Array.from(b).map((x) => x.toString(36).padStart(2, "0")).join("").slice(0, 10).toUpperCase();
      return `${s.slice(0, 5)}-${s.slice(5)}`;
    });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("mfa_recovery_codes").delete().eq("user_id", context.userId);
    await supabaseAdmin.from("mfa_recovery_codes").insert(await Promise.all(codes.map(async (c) => ({ user_id: context.userId, code_hash: await sha256(`${context.userId}:${norm(c)}`) }))));
    const { logSecurityEvent } = await import("./security.server");
    await logSecurityEvent({ action: "mfa_recovery_generated", actorId: context.userId });
    return { codes };
  });

/** Usa um código de recuperação: remove o autenticador perdido para cadastrar um novo. */
export const redeemRecoveryCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ code: z.string().min(6).max(20) }).parse(d))
  .handler(async ({ data, context }) => {
    const { enforceRate, logSecurityEvent } = await import("./security.server");
    await enforceRate(`mfa-recovery:${context.userId}`, 5, 900);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const hash = await sha256(`${context.userId}:${norm(data.code)}`);
    const { data: row } = await supabaseAdmin.from("mfa_recovery_codes").update({ used_at: new Date().toISOString() }).eq("user_id", context.userId).eq("code_hash", hash).is("used_at", null).select("id").maybeSingle();
    if (!row) {
      await logSecurityEvent({ action: "mfa_recovery_denied", result: "denied", actorId: context.userId });
      throw new Error("Código inválido ou já usado");
    }
    const { data: f } = await supabaseAdmin.auth.admin.mfa.listFactors({ userId: context.userId });
    for (const factor of f?.factors ?? []) await supabaseAdmin.auth.admin.mfa.deleteFactor({ userId: context.userId, id: factor.id });
    await logSecurityEvent({ action: "role_mfa_reset_by_recovery", resource: "auth.mfa", actorId: context.userId, detail: "autenticador removido com código de recuperação" });
    return { ok: true };
  });

/** Registra o dispositivo do founder; dispositivo novo gera alerta por e-mail. */
export const recordFounderDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ device: z.string().min(16).max(80), ua: z.string().max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    const { isFounderWith2fa } = await import("./founder-guard");
    if (!(await isFounderWith2fa(context))) return { ok: false };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const device_hash = await sha256(`${context.userId}:${data.device}`);
    const { data: known } = await supabaseAdmin.from("founder_devices").select("device_hash").eq("user_id", context.userId).eq("device_hash", device_hash).maybeSingle();
    if (known) {
      await supabaseAdmin.from("founder_devices").update({ last_seen_at: new Date().toISOString() }).eq("user_id", context.userId).eq("device_hash", device_hash);
      return { ok: true };
    }
    await supabaseAdmin.from("founder_devices").insert({ user_id: context.userId, device_hash });
    const { logSecurityEvent, clientIp } = await import("./security.server");
    await logSecurityEvent({ action: "founder_new_device", actorId: context.userId, detail: `ip=${clientIp()} navegador=${data.ua.slice(0, 120)}` });
    return { ok: true };
  });
