import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { normalizarEmail, origemConfiavel } from "./recuperar-senha";

async function sha256(s: string) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(h))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Pede o link de redefinição de senha.
 * Resposta sempre neutra: não revela se existe conta com o e-mail.
 * Limites: 5 pedidos por IP a cada 15 min (recusa com aviso) e 3 por e-mail por hora
 * (passa do limite em silêncio, para não virar uma forma de descobrir contas).
 */
export const pedirLinkNovaSenha = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        email: z.string().trim().email().max(254),
        destino: z.enum(["painel", "garcom"]).default("painel"),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { enforceRate, rateLimit, clientIp, logSecurityEvent } =
      await import("./security.server");
    await enforceRate(`senha-ip:${clientIp()}`, 5, 900);
    const email = normalizarEmail(data.email);
    const chave = (await sha256(`senha:${email}`)).slice(0, 32);
    if (!(await rateLimit(`senha-email:${chave}`, 3, 3600))) {
      await logSecurityEvent({
        action: "password_reset_throttled",
        resource: "auth.recover",
        result: "denied",
        detail: `email ${chave}`,
      });
      return { ok: true };
    }

    const { getRequestHeader } = await import("@tanstack/react-start/server");
    const origem = origemConfiavel(getRequestHeader("origin"));
    const caminho = data.destino === "garcom" ? "/redefinir-senha/garcom" : "/redefinir-senha";
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: `${origem}${caminho}`,
    });
    // Erros do provedor (e-mail inexistente, limite do Supabase) ficam só no log: a tela responde igual.
    if (error) console.error("password_reset", error.status, error.message);
    await logSecurityEvent({
      action: "password_reset_requested",
      resource: "auth.recover",
      result: error ? "error" : "ok",
      detail: `email ${chave}`,
    });
    return { ok: true };
  });
