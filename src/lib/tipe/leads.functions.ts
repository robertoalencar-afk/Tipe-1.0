import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

const leadSchema = z.object({
  restaurantName: z.string().trim().min(2).max(120),
  contactName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional(),
  message: z.string().trim().max(2000).optional(),
});

export const submitLead = createServerFn({ method: "POST" })
  .inputValidator((data) => leadSchema.parse(data))
  .handler(async ({ data }) => {
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
      message: data.message || null,
    });

    if (error) throw new Error("Falha ao registrar o contato");
    return { ok: true as const };
  });
