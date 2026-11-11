-- Chamado da mesa: o cliente toca "Chamar garçom" ou "Pedir a conta" na conta do QR,
-- e o pedido aparece em "O que precisa de você agora" e no celular da equipe.
-- Só o servidor grava (sessão da mesa conferida); a equipe do restaurante lê e marca
-- como atendido. O chamado vale para a conta aberta (session_token): quando a mesa
-- reabre, os antigos deixam de aparecer. Aditiva; reverter com DROP TABLE table_calls
-- e DROP FUNCTION resolve_table_call(uuid).
CREATE TABLE IF NOT EXISTS public.table_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  table_number text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('waiter', 'bill')),
  session_token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid
);
-- Um chamado aberto por mesa e tipo: tocar de novo não empilha avisos.
CREATE UNIQUE INDEX IF NOT EXISTS table_calls_open_uq ON public.table_calls (restaurant_id, table_number, kind) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS table_calls_restaurant_idx ON public.table_calls (restaurant_id, created_at DESC);
ALTER TABLE public.table_calls ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.table_calls FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.table_calls TO authenticated;
GRANT ALL ON public.table_calls TO service_role;
DROP POLICY IF EXISTS "Equipe vê chamados das mesas" ON public.table_calls;
CREATE POLICY "Equipe vê chamados das mesas" ON public.table_calls FOR SELECT TO authenticated
  USING (has_restaurant_role(auth.uid(), restaurant_id, ARRAY['owner','cashier','waiter']::app_role[]));

CREATE OR REPLACE FUNCTION public.resolve_table_call(p_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
DECLARE v_rid uuid;
BEGIN
  SELECT restaurant_id INTO v_rid FROM table_calls WHERE id = p_id;
  IF v_rid IS NULL OR NOT has_restaurant_role(auth.uid(), v_rid, ARRAY['owner','cashier','waiter']::app_role[]) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  UPDATE table_calls SET resolved_at = now(), resolved_by = auth.uid() WHERE id = p_id AND resolved_at IS NULL;
END; $function$;
REVOKE ALL ON FUNCTION public.resolve_table_call(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_table_call(uuid) TO authenticated, service_role;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'table_calls') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.table_calls;
  END IF;
END $$;

-- O celular da equipe pode silenciar os chamados como os outros avisos.
DO $$ DECLARE c text; BEGIN
  SELECT conname INTO c FROM pg_constraint
   WHERE conrelid = 'public.staff_push_subscriptions'::regclass AND contype = 'c'
     AND pg_get_constraintdef(oid) LIKE '%muted_kinds%';
  IF c IS NOT NULL THEN EXECUTE format('ALTER TABLE public.staff_push_subscriptions DROP CONSTRAINT %I', c); END IF;
  ALTER TABLE public.staff_push_subscriptions ADD CONSTRAINT staff_push_subscriptions_muted_kinds_check
    CHECK (muted_kinds <@ ARRAY['pagamento','chamado','gorjeta','nota','saque']::text[]);
END $$;
