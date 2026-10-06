import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

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
    // Cliente público somente leitura/gravação via RLS: apenas insere o contato.
    const db = createClient(
      process.env['VITE_SUPABASE_URL']!,
      process.env['VITE_SUPABASE_PUBLISHABLE_KEY']!,
      { auth: { persistSession: false } },
    );

    const { error } = await db.from("restaurant_leads").insert({
      restaurant_name: data.restaurantName,
      contact_name: data.contactName,
      email: data.email,
      phone: data.phone || null,
      message: `Mesas: ${data.tables} · PDV: ${data.pdv}${data.message ? ` · ${data.message}` : ""}`,
    });

    if (error) throw new Error("Falha ao registrar o contato");
    return { ok: true as const };
  });
