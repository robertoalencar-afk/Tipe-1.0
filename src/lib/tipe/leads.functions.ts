import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const leadSchema = z.object({
  restaurantName: z.string().trim().min(2).max(120),
  contactName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional(),
  tables: z.coerce.number().int().min(1).max(999),
  pdv: z.string().trim().min(2).max(120),
  message: z.string().trim().max(2000).optional(),
});

export const submitLead = createServerFn({ method: "POST" })
  .inputValidator((data) => leadSchema.parse(data))
  .handler(async ({ data }) => {
    const { enforceRate, clientIp } = await import("./security.server");
    await enforceRate(`lead:${clientIp()}`, 5, 600);
    // Entrada já validada e limitada por IP acima; gravação apenas nesta tabela.
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");

    const { data: row, error } = await db.from("restaurant_leads").insert({
      restaurant_name: data.restaurantName,
      contact_name: data.contactName,
      email: data.email,
      phone: data.phone ? data.phone.slice(0, 30) : null,
      message: `Mesas: ${data.tables} · PDV: ${data.pdv}${data.message ? ` · ${data.message}` : ""}`,
    }).select("id").single();

    if (error) {
      console.error("lead_insert", error.message);
      throw new Error("Falha ao registrar o contato");
    }
    try {
      const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
      const templateData = { restaurantName: data.restaurantName, contactName: data.contactName, email: data.email, phone: data.phone, tables: data.tables, pdv: data.pdv };
      await Promise.allSettled([
        sendTemplateEmail("lead-notification", "roberto@tipe.digital", { templateData, idempotencyKey: `lead-notification-${row.id}`, replyTo: data.email }),
        sendTemplateEmail("lead-confirmation", data.email, { templateData, idempotencyKey: `lead-confirmation-${row.id}`, replyTo: "contato@tipe.digital" }),
      ]).then((r) => r.forEach((x) => x.status === "rejected" && console.error("lead_email", x.reason)));
    } catch (e) {
      console.error("lead_email", e);
    }
    return { ok: true as const };
  });
