-- Cardápio com mídia: foto, mapa de profundidade (foto 3D), modelo 3D, selo e alergênicos por item.
-- Alimenta o cardápio em stories do Tipe Order. Tudo opcional: item sem foto continua em lista.
ALTER TABLE public.pdv_menu_items
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS depth_url text,
  ADD COLUMN IF NOT EXISTS model_url text,
  ADD COLUMN IF NOT EXISTS badge text,
  ADD COLUMN IF NOT EXISTS allergens text[] NOT NULL DEFAULT '{}';

-- Só caminho do próprio site ou https: nunca esquema perigoso nem dado embutido.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pdv_menu_items_media_check') THEN
    ALTER TABLE public.pdv_menu_items ADD CONSTRAINT pdv_menu_items_media_check CHECK (
      (image_url IS NULL OR (length(image_url) <= 500 AND image_url ~ '^(/|https://)'))
      AND (depth_url IS NULL OR (length(depth_url) <= 500 AND depth_url ~ '^(/|https://)'))
      AND (model_url IS NULL OR (length(model_url) <= 500 AND model_url ~ '^(/|https://)'))
      AND (badge IS NULL OR length(badge) <= 30)
      AND cardinality(allergens) <= 14
    );
  END IF;
END $$;
