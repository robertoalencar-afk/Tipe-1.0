-- Mídia do restaurante: logomarca e armazenamento das imagens. As fotos do cardápio reusam image_url/depth_url (0055).
-- Arquivos ficam no bucket público "restaurante-midia"; o envio passa pelo servidor (papel de administrador).
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS logo_url text CHECK (logo_url IS NULL OR (length(logo_url) <= 500 AND logo_url ~ '^https://'));

-- Bucket só existe no Supabase; no banco de teste local o schema storage não existe.
DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('restaurante-midia', 'restaurante-midia', true, 2097152, ARRAY['image/webp','image/png','image/jpeg'])
    ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 2097152, allowed_mime_types = ARRAY['image/webp','image/png','image/jpeg'];
  END IF;
END $$;
