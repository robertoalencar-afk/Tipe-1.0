-- Decisão comercial de 13/11/2026: Order, Equipe e Cozinha em todos os planos.
-- Equipe já integra o acesso básico. Os módulos adicionais são order e kds.
-- Preserva outros módulos do catálogo e bloqueios explícitos por restaurante.
UPDATE public.plan_catalog
SET included_modules = ARRAY(
  SELECT DISTINCT module
  FROM unnest(included_modules || ARRAY['order', 'kds']::text[]) AS module
  ORDER BY module
), updated_at = now()
WHERE id IN ('essencial', 'profissional', 'premium', 'personalizado');
