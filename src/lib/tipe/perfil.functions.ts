import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { decodificarImagem } from "./midia-validation";

export const enviarFotoPerfil = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ image: z.string().max(2_300_000) }).parse(d))
  .handler(async ({ data, context }) => {
    const photo = decodificarImagem(data.image);
    if (photo.tipo !== "image/webp") throw new Error("Prepare a foto novamente antes de enviar.");
    const { enforceRate } = await import("./security.server");
    await enforceRate(`profile-photo:${context.userId}`, 12, 3600);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const bucket = supabaseAdmin.storage.from("restaurante-midia");
    const path = `usuarios/${context.userId}/avatar.webp`;
    const { error } = await bucket.upload(path, photo.bytes, {
      contentType: photo.tipo,
      upsert: true,
      cacheControl: "300",
    });
    if (error) throw new Error("Não foi possível guardar sua foto. Tente novamente.");
    return { url: `${bucket.getPublicUrl(path).data.publicUrl}?v=${Date.now()}` };
  });
