-- Giro 360° instantâneo: as fotos da captura viram o "3D" do prato na hora, sem processamento.
-- O bucket público dos modelos passa a aceitar os quadros (JPEG) e a lista do giro (JSON).
DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    UPDATE storage.buckets
       SET allowed_mime_types = ARRAY['model/gltf-binary','image/webp','image/jpeg','application/json']
     WHERE id = 'modelos-3d';
  END IF;
END $$;
