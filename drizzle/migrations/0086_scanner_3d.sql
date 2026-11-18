-- Scanner 3D de pratos: a equipe envia fotos (ou quadros de um vídeo) de um prato pelo Gestão,
-- a fotogrametria (COLMAP + OpenMVS, workflow scanner-3d.yml) gera um .glb e o dono aprova
-- antes de ir para pdv_menu_items.model_url. Escrita só pelo servidor (service role).
CREATE TABLE IF NOT EXISTS public.menu_item_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.pdv_menu_items(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'enviando'
    CHECK (status IN ('enviando','na_fila','processando','pronto','erro','publicado','descartado')),
  total_fotos integer NOT NULL CHECK (total_fotos BETWEEN 20 AND 150),
  model_url text CHECK (model_url IS NULL OR (length(model_url) <= 500 AND model_url ~ '^https://')),
  poster_url text CHECK (poster_url IS NULL OR (length(poster_url) <= 500 AND poster_url ~ '^https://')),
  detalhe text CHECK (detalhe IS NULL OR length(detalhe) <= 500),
  criado_por uuid,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  processado_em timestamptz
);
CREATE INDEX IF NOT EXISTS menu_item_scans_rest_idx ON public.menu_item_scans (restaurant_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS menu_item_scans_fila_idx ON public.menu_item_scans (criado_em) WHERE status = 'na_fila';

ALTER TABLE public.menu_item_scans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS menu_item_scans_ler ON public.menu_item_scans;
CREATE POLICY menu_item_scans_ler ON public.menu_item_scans FOR SELECT TO authenticated
  USING (public.has_restaurant_role(auth.uid(), restaurant_id, ARRAY['owner']::public.app_role[]));
REVOKE ALL ON public.menu_item_scans FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.menu_item_scans FROM authenticated;

-- Fotos brutas: privadas. Modelos prontos: públicos (o cardápio do cliente lê sem login).
DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('scans-3d', 'scans-3d', false, 4194304, ARRAY['image/jpeg'])
    ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 4194304, allowed_mime_types = ARRAY['image/jpeg'];
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('modelos-3d', 'modelos-3d', true, 26214400, ARRAY['model/gltf-binary','image/webp'])
    ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 26214400, allowed_mime_types = ARRAY['model/gltf-binary','image/webp'];
  END IF;
END $$;
