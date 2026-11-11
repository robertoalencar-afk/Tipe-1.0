-- Mídia do restaurante: logomarca e fotos do cardápio (com mapa de profundidade opcional para o efeito 3D).
-- Arquivos ficam no bucket público "restaurante-midia"; o envio passa pelo servidor (papel de administrador).
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS logo_url text CHECK (logo_url IS NULL OR (length(logo_url) <= 500 AND logo_url ~ '^https://'));
ALTER TABLE public.pdv_menu_items ADD COLUMN IF NOT EXISTS photo_url text CHECK (photo_url IS NULL OR (length(photo_url) <= 500 AND photo_url ~ '^https://'));
ALTER TABLE public.pdv_menu_items ADD COLUMN IF NOT EXISTS photo_depth_url text CHECK (photo_depth_url IS NULL OR (length(photo_depth_url) <= 500 AND photo_depth_url ~ '^https://'));

-- Bucket só existe no Supabase; no banco de teste local o schema storage não existe.
DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('restaurante-midia', 'restaurante-midia', true, 2097152, ARRAY['image/webp','image/png','image/jpeg'])
    ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 2097152, allowed_mime_types = ARRAY['image/webp','image/png','image/jpeg'];
  END IF;
END $$;
