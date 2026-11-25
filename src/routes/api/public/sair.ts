import { createFileRoute } from "@tanstack/react-router";

// Descadastro dos e-mails de prospecção (LGPD).
// GET mostra a confirmação (robôs que abrem links não descadastram ninguém);
// POST confirma, inclusive o "1 clique" do Gmail/Yahoo (RFC 8058, List-Unsubscribe-Post).
// O link é assinado (HMAC do id do restaurante); sem assinatura válida nada muda.

const pagina = (titulo: string, corpo: string) =>
  new Response(
    `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${titulo} · Tipe</title></head>
<body style="margin:0;font-family:Arial,Helvetica,sans-serif;background:#f5f7f9;color:#101b2c"><main style="max-width:440px;margin:12vh auto;padding:32px 24px;background:#fff;border-radius:16px;border:1px solid #e3e8ee">
<h1 style="font-size:22px;margin:0 0 12px">${titulo}</h1>${corpo}</main></body></html>`,
    {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "x-robots-tag": "noindex",
      },
    },
  );

async function validar(url: URL) {
  const p = url.searchParams.get("p") ?? "";
  const t = url.searchParams.get("t") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(p) || !/^[A-Za-z0-9_-]{16,64}$/.test(t)) return null;
  const segredo = process.env["TIPE_ENCRYPTION_KEY"] ?? process.env["CRON_SECRET"];
  if (!segredo) return null;
  const { tokenSairValido } = await import("@/lib/tipe/prospeccao-email");
  return (await tokenSairValido(p, t, segredo)) ? p : null;
}

export const Route = createFileRoute("/api/public/sair")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        if (!(await validar(url)))
          return pagina(
            "Link inválido",
            `<p>Este link de descadastro não é válido. Responda o e-mail com a palavra SAIR que a gente remove você.</p>`,
          );
        const acao = `/api/public/sair?p=${encodeURIComponent(url.searchParams.get("p")!)}&t=${encodeURIComponent(url.searchParams.get("t")!)}`;
        return pagina(
          "Parar de receber e-mails da Tipe?",
          `<p style="line-height:1.5">Confirme e este endereço não recebe mais nenhuma mensagem comercial da Tipe.</p>
<form method="post" action="${acao}"><button type="submit" style="margin-top:12px;padding:12px 18px;border:0;border-radius:10px;background:#101b2c;color:#fff;font-size:15px;cursor:pointer">Confirmar descadastro</button></form>`,
        );
      },
      POST: async ({ request }) => {
        const { rateLimit, clientIp } = await import("@/lib/tipe/security.server");
        if (!(await rateLimit(`sair:${clientIp()}`, 20, 60)))
          return new Response(null, { status: 429 });
        const id = await validar(new URL(request.url));
        if (!id)
          return pagina(
            "Link inválido",
            `<p>Responda o e-mail com a palavra SAIR que a gente remove você.</p>`,
          );
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as unknown as { from: (t: string) => any };
        const { data: p } = await db
          .from("crm_prospects")
          .select("id,source_ref,phone,whatsapp,email,instagram,lead_id")
          .eq("id", id)
          .maybeSingle();
        if (p) {
          const motivo = "Descadastro pelo link do e-mail";
          const chaves = [
            { value: p.source_ref, kind: "source_ref" },
            { value: p.email, kind: "email" },
            { value: p.phone, kind: "phone" },
            { value: p.whatsapp, kind: "phone" },
            { value: p.instagram, kind: "instagram" },
          ]
            .filter((x) => x.value)
            .map((x) => ({ ...x, value: String(x.value).toLowerCase(), reason: motivo }));
          await db
            .from("crm_optout")
            .upsert(chaves, { onConflict: "value", ignoreDuplicates: true });
          await db
            .from("crm_prospects")
            .update({
              status: p.lead_id ? undefined : "opt_out",
              discard_reason: motivo,
              next_touch_at: null,
              email_next_at: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", id);
        }
        return pagina(
          "Pronto, descadastrado",
          `<p style="line-height:1.5">Você não vai mais receber e-mails comerciais da Tipe. Desculpe o incômodo.</p>`,
        );
      },
    },
  },
});
