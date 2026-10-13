-- Índices que existem em produção mas não no histórico de migrações (só para teste).
CREATE UNIQUE INDEX IF NOT EXISTS pdv_events_dedupe_uq ON public.pdv_events (restaurant_id, adapter, direction, external_event_id);
ALTER TABLE public.pdv_events ALTER COLUMN status SET DEFAULT 'ok';
ALTER TABLE public.pdv_events ALTER COLUMN created_at SET DEFAULT now();
