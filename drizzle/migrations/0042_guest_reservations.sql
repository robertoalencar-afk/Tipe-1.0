-- Tipe Guest · Fase 4: motor de reservas (aditivo, compatível com a Tipe 1.0).
--
-- A garantia contra overbooking fica no Postgres: cada mesa ocupada por um hold ou por uma reserva
-- vira uma linha em guest_table_allocations, e o EXCLUDE impede duas faixas sobrepostas na mesma
-- mesa, mesmo com duas transações ao mesmo tempo. Holds expiram por expires_at; a confirmação usa
-- chave de idempotência. Escrita só pelo servidor (service_role) através das funções abaixo, que
-- recusam quando a flag guest.reservations está desligada (padrão). Horários em timestamptz; o
-- fuso do restaurante (padrão America/Fortaleza) só é usado para regras de dia da semana e horário.
-- Pagamento antecipado de experiências existe só como campo travado em false.

CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

-- ---------------------------------------------------------------- salão
CREATE TABLE IF NOT EXISTS public.guest_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants (id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 60),
  position smallint NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, name),
  UNIQUE (restaurant_id, id)
);

-- Mesas existentes ganham colunas nulas/neutras: nada muda para quem não usa reservas.
ALTER TABLE public.restaurant_tables
  ADD COLUMN IF NOT EXISTS seats_min smallint,
  ADD COLUMN IF NOT EXISTS seats_max smallint,
  ADD COLUMN IF NOT EXISTS area_id uuid REFERENCES public.guest_areas (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reservable boolean NOT NULL DEFAULT false;
DO $$ BEGIN
  ALTER TABLE public.restaurant_tables ADD CONSTRAINT restaurant_tables_seats_check
    CHECK ((seats_min IS NULL OR seats_min >= 1) AND (seats_max IS NULL OR seats_max BETWEEN 1 AND 99)
      AND (seats_min IS NULL OR seats_max IS NULL OR seats_min <= seats_max)
      AND (NOT reservable OR seats_max IS NOT NULL));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.guest_table_combinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants (id) ON DELETE CASCADE,
  table_ids uuid[] NOT NULL CHECK (cardinality(table_ids) BETWEEN 2 AND 6),
  seats_min smallint NOT NULL DEFAULT 1 CHECK (seats_min >= 1),
  seats_max smallint NOT NULL CHECK (seats_max BETWEEN 2 AND 99),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (seats_min <= seats_max)
);

-- ---------------------------------------------------------------- regras
CREATE TABLE IF NOT EXISTS public.guest_reservation_settings (
  restaurant_id uuid PRIMARY KEY REFERENCES public.restaurants (id) ON DELETE CASCADE,
  timezone text NOT NULL DEFAULT 'America/Fortaleza',
  slot_interval_min smallint NOT NULL DEFAULT 15 CHECK (slot_interval_min IN (10, 15, 20, 30, 60)),
  duration_min smallint NOT NULL DEFAULT 90 CHECK (duration_min BETWEEN 15 AND 480),
  buffer_min smallint NOT NULL DEFAULT 15 CHECK (buffer_min BETWEEN 0 AND 120),
  min_advance_min integer NOT NULL DEFAULT 60 CHECK (min_advance_min BETWEEN 0 AND 10080),
  max_advance_days smallint NOT NULL DEFAULT 30 CHECK (max_advance_days BETWEEN 1 AND 365),
  min_party smallint NOT NULL DEFAULT 1 CHECK (min_party >= 1),
  max_party smallint NOT NULL DEFAULT 12 CHECK (max_party BETWEEN 1 AND 99),
  cancel_cutoff_min integer NOT NULL DEFAULT 120 CHECK (cancel_cutoff_min BETWEEN 0 AND 10080),
  hold_ttl_sec smallint NOT NULL DEFAULT 300 CHECK (hold_ttl_sec BETWEEN 60 AND 900),
  auto_confirm boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- O dono liga quando quiser receber reservas (além da flag do ambiente, que é da equipe Tipe).
  accepting boolean NOT NULL DEFAULT false,
  CHECK (min_party <= max_party)
);

-- Turnos por dia da semana (0 = domingo), com primeiro e último horário de chegada.
CREATE TABLE IF NOT EXISTS public.guest_availability_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants (id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  first_seating time NOT NULL,
  last_seating time NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (first_seating <= last_seating)
);
CREATE INDEX IF NOT EXISTS guest_availability_rules_restaurant_idx ON public.guest_availability_rules (restaurant_id, weekday);

-- Feriados, eventos privados e bloqueios. Sem mesa = restaurante inteiro.
CREATE TABLE IF NOT EXISTS public.guest_availability_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants (id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('feriado', 'evento_privado', 'bloqueio')),
  during tstzrange NOT NULL CHECK (NOT isempty(during)),
  table_id uuid REFERENCES public.restaurant_tables (id) ON DELETE CASCADE,
  reason text CHECK (reason IS NULL OR length(reason) <= 200),
  created_by uuid REFERENCES auth.users (id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS guest_availability_exceptions_idx ON public.guest_availability_exceptions USING gist (restaurant_id, during);

-- ---------------------------------------------------------------- consumidor
-- Consumidor do Guest = auth.users com linha aqui e sem user_roles (não entra no enum app_role).
CREATE TABLE IF NOT EXISTS public.guest_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name text CHECK (display_name IS NULL OR length(display_name) BETWEEN 1 AND 80),
  phone text CHECK (phone IS NULL OR phone ~ '^\+?[0-9]{10,15}$'),
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  terms_version text,
  terms_accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.guest_favorites (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, restaurant_id)
);
CREATE TABLE IF NOT EXISTS public.guest_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 60),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);
CREATE TABLE IF NOT EXISTS public.guest_list_items (
  list_id uuid NOT NULL REFERENCES public.guest_lists (id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (list_id, restaurant_id)
);
CREATE TABLE IF NOT EXISTS public.guest_push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE CHECK (length(token) BETWEEN 10 AND 300),
  platform text NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

-- Experiências: modelo pronto, pagamento antecipado travado em false até provedor e autorização.
CREATE TABLE IF NOT EXISTS public.guest_experiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants (id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('menu_degustacao', 'evento', 'grupo')),
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 80),
  description text CHECK (description IS NULL OR length(description) <= 600),
  party_min smallint NOT NULL DEFAULT 1 CHECK (party_min >= 1),
  party_max smallint NOT NULL DEFAULT 12 CHECK (party_max BETWEEN 1 AND 99),
  price_cents integer CHECK (price_cents IS NULL OR price_cents >= 0),
  during tstzrange,
  prepay_enabled boolean NOT NULL DEFAULT false CHECK (prepay_enabled = false),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (party_min <= party_max)
);

-- ---------------------------------------------------------------- holds e reservas
CREATE TABLE IF NOT EXISTS public.guest_holds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants (id) ON DELETE CASCADE,
  guest_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  session_key text NOT NULL CHECK (length(session_key) BETWEEN 8 AND 120),
  party_size smallint NOT NULL CHECK (party_size BETWEEN 1 AND 99),
  slot tstzrange NOT NULL,
  table_ids uuid[] NOT NULL,
  expires_at timestamptz NOT NULL,
  released_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS guest_holds_open_idx ON public.guest_holds (restaurant_id, expires_at) WHERE released_at IS NULL;

CREATE TABLE IF NOT EXISTS public.guest_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants (id) ON DELETE CASCADE,
  guest_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  guest_name text NOT NULL CHECK (length(btrim(guest_name)) BETWEEN 1 AND 80),
  guest_phone text CHECK (guest_phone IS NULL OR guest_phone ~ '^\+?[0-9]{10,15}$'),
  party_size smallint NOT NULL CHECK (party_size BETWEEN 1 AND 99),
  slot tstzrange NOT NULL CHECK (NOT isempty(slot)),
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN (
    'pendente', 'confirmada', 'chegou', 'sentada', 'concluida', 'cancelada_cliente', 'cancelada_restaurante', 'nao_compareceu')),
  channel text NOT NULL DEFAULT 'guest_app' CHECK (channel IN ('guest_app', 'web', 'painel', 'telefone')),
  idempotency_key text NOT NULL CHECK (length(idempotency_key) BETWEEN 8 AND 120),
  notes text CHECK (notes IS NULL OR length(notes) <= 500),
  occasion text CHECK (occasion IS NULL OR occasion IN ('aniversario', 'negocios', 'romantico', 'comemoracao', 'outro')),
  experience_id uuid REFERENCES public.guest_experiences (id) ON DELETE SET NULL,
  hold_id uuid REFERENCES public.guest_holds (id) ON DELETE SET NULL,
  table_ids uuid[] NOT NULL DEFAULT '{}',
  cancel_reason text CHECK (cancel_reason IS NULL OR length(cancel_reason) <= 300),
  -- Mesa real em que o grupo sentou (check-in). O pagamento continua lendo só a mesa.
  seated_table_id uuid REFERENCES public.restaurant_tables (id) ON DELETE SET NULL,
  seated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS guest_reservations_day_idx ON public.guest_reservations (restaurant_id, lower(slot));
CREATE INDEX IF NOT EXISTS guest_reservations_guest_idx ON public.guest_reservations (guest_user_id, lower(slot));
DROP TRIGGER IF EXISTS set_guest_reservations_updated_at ON public.guest_reservations;
CREATE TRIGGER set_guest_reservations_updated_at BEFORE UPDATE ON public.guest_reservations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Ocupação de mesa: a faixa inclui a duração e o intervalo entre ocupações.
CREATE TABLE IF NOT EXISTS public.guest_table_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants (id) ON DELETE CASCADE,
  table_id uuid NOT NULL REFERENCES public.restaurant_tables (id) ON DELETE CASCADE,
  occupied tstzrange NOT NULL CHECK (NOT isempty(occupied)),
  hold_id uuid REFERENCES public.guest_holds (id) ON DELETE CASCADE,
  reservation_id uuid REFERENCES public.guest_reservations (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((hold_id IS NULL) <> (reservation_id IS NULL)),
  CONSTRAINT guest_table_allocations_no_overlap
    EXCLUDE USING gist (table_id extensions.gist_uuid_ops WITH =, occupied WITH &&)
);

CREATE TABLE IF NOT EXISTS public.guest_reservation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES public.guest_reservations (id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants (id) ON DELETE CASCADE,
  actor uuid,
  actor_kind text NOT NULL CHECK (actor_kind IN ('cliente', 'restaurante', 'sistema')),
  action text NOT NULL,
  from_status text,
  to_status text,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS guest_reservation_events_idx ON public.guest_reservation_events (reservation_id, created_at);

CREATE OR REPLACE FUNCTION public.guest_reservation_events_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'A trilha de reservas não pode ser alterada'; END $$;
DROP TRIGGER IF EXISTS guest_reservation_events_no_update ON public.guest_reservation_events;
CREATE TRIGGER guest_reservation_events_no_update BEFORE UPDATE ON public.guest_reservation_events
FOR EACH ROW EXECUTE FUNCTION public.guest_reservation_events_immutable();

-- ---------------------------------------------------------------- lista de espera e alertas
CREATE TABLE IF NOT EXISTS public.guest_waitlist_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants (id) ON DELETE CASCADE,
  guest_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  guest_name text NOT NULL CHECK (length(btrim(guest_name)) BETWEEN 1 AND 80),
  party_size smallint NOT NULL CHECK (party_size BETWEEN 1 AND 99),
  wanted tstzrange NOT NULL CHECK (NOT isempty(wanted)),
  status text NOT NULL DEFAULT 'aguardando' CHECK (status IN ('aguardando', 'convocado', 'confirmado', 'expirado', 'cancelado')),
  called_at timestamptz,
  respond_by timestamptz,
  -- clock_timestamp: a ordem de entrada vale mesmo dentro da mesma transação.
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK (status <> 'convocado' OR respond_by IS NOT NULL)
);
CREATE UNIQUE INDEX IF NOT EXISTS guest_waitlist_one_active
  ON public.guest_waitlist_entries (restaurant_id, guest_user_id, wanted) WHERE status IN ('aguardando', 'convocado');

CREATE TABLE IF NOT EXISTS public.guest_availability_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants (id) ON DELETE CASCADE,
  guest_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  party_size smallint NOT NULL CHECK (party_size BETWEEN 1 AND 99),
  wanted tstzrange NOT NULL CHECK (NOT isempty(wanted)),
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'disparado', 'cancelado')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS guest_alerts_one_active
  ON public.guest_availability_alerts (restaurant_id, guest_user_id, party_size, wanted) WHERE status = 'ativo';

-- Um alerta avisa uma vez por horário encontrado (sem duplicata); o envio fica com o servidor.
CREATE TABLE IF NOT EXISTS public.guest_alert_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid NOT NULL REFERENCES public.guest_availability_alerts (id) ON DELETE CASCADE,
  slot_start timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  UNIQUE (alert_id, slot_start)
);

-- ---------------------------------------------------------------- RLS e permissões
-- O Supabase concede tudo por padrão a anon/authenticated; aqui só leitura, escrita pelas funções.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['guest_areas', 'guest_table_combinations', 'guest_reservation_settings', 'guest_availability_rules',
    'guest_availability_exceptions', 'guest_profiles', 'guest_favorites', 'guest_lists', 'guest_list_items', 'guest_push_tokens',
    'guest_experiences', 'guest_holds', 'guest_reservations', 'guest_table_allocations', 'guest_reservation_events',
    'guest_waitlist_entries', 'guest_availability_alerts', 'guest_alert_notifications'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
  -- Configuração do salão e das regras: membros do restaurante leem.
  FOREACH t IN ARRAY ARRAY['guest_areas', 'guest_table_combinations', 'guest_reservation_settings', 'guest_availability_rules',
    'guest_availability_exceptions', 'guest_experiences', 'guest_table_allocations', 'guest_reservation_events'] LOOP
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
    EXECUTE format('DROP POLICY IF EXISTS "Members read" ON public.%I', t);
    EXECUTE format('CREATE POLICY "Members read" ON public.%I FOR SELECT TO authenticated USING (public.is_restaurant_member(auth.uid(), restaurant_id))', t);
  END LOOP;
  -- Do próprio consumidor: só ele lê.
  FOREACH t IN ARRAY ARRAY['guest_profiles', 'guest_favorites', 'guest_lists', 'guest_push_tokens'] LOOP
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
    EXECUTE format('DROP POLICY IF EXISTS "Own rows" ON public.%I', t);
    EXECUTE format('CREATE POLICY "Own rows" ON public.%I FOR SELECT TO authenticated USING (user_id = auth.uid())', t);
  END LOOP;
  -- Reservas, lista de espera e alertas: o próprio consumidor e os membros do restaurante.
  FOREACH t IN ARRAY ARRAY['guest_reservations', 'guest_waitlist_entries', 'guest_availability_alerts'] LOOP
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
    EXECUTE format('DROP POLICY IF EXISTS "Guest or members read" ON public.%I', t);
    EXECUTE format('CREATE POLICY "Guest or members read" ON public.%I FOR SELECT TO authenticated USING (guest_user_id = auth.uid() OR public.is_restaurant_member(auth.uid(), restaurant_id))', t);
  END LOOP;
END $$;
GRANT SELECT ON public.guest_list_items TO authenticated;
DROP POLICY IF EXISTS "Own list items" ON public.guest_list_items;
CREATE POLICY "Own list items" ON public.guest_list_items FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.guest_lists l WHERE l.id = list_id AND l.user_id = auth.uid()));

-- ---------------------------------------------------------------- funções
CREATE OR REPLACE FUNCTION public.guest_settings(p_restaurant_id uuid)
RETURNS public.guest_reservation_settings LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  -- Sem linha de configuração, valem os padrões da tabela.
  SELECT COALESCE(
    (SELECT s FROM public.guest_reservation_settings s WHERE s.restaurant_id = p_restaurant_id),
    (p_restaurant_id, 'America/Fortaleza', 15, 90, 15, 60, 30, 1, 12, 120, 300, true, now(), false)::public.guest_reservation_settings)
$$;

-- Motivo pelo qual o horário não está aberto para o grupo (NULL = aberto). Não olha mesas.
CREATE OR REPLACE FUNCTION public.guest_slot_closed_reason(p_restaurant_id uuid, p_start timestamptz, p_party integer)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  s public.guest_reservation_settings := public.guest_settings(p_restaurant_id);
  v_local timestamp := p_start AT TIME ZONE s.timezone;
  v_minutes integer := extract(hour FROM v_local)::int * 60 + extract(minute FROM v_local)::int;
BEGIN
  IF p_party IS NULL OR p_party < s.min_party OR p_party > s.max_party THEN
    RETURN format('Grupo fora do limite deste restaurante (%s a %s pessoas)', s.min_party, s.max_party);
  END IF;
  IF p_start < now() + make_interval(mins => s.min_advance_min) THEN RETURN 'Antecedência mínima não atendida'; END IF;
  IF p_start > now() + make_interval(days => s.max_advance_days) THEN RETURN 'Data além da antecedência máxima'; END IF;
  IF extract(second FROM v_local) <> 0 OR v_minutes % s.slot_interval_min <> 0 THEN RETURN 'Horário fora da grade de reservas'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.guest_availability_rules r
     WHERE r.restaurant_id = p_restaurant_id AND r.active AND r.weekday = extract(dow FROM v_local)::int
       AND v_local::time BETWEEN r.first_seating AND r.last_seating
  ) THEN RETURN 'Restaurante sem reservas neste horário'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.guest_availability_exceptions e
     WHERE e.restaurant_id = p_restaurant_id AND e.table_id IS NULL
       AND e.during && tstzrange(p_start, p_start + make_interval(mins => s.duration_min))
  ) THEN RETURN 'Horário bloqueado pelo restaurante'; END IF;
  RETURN NULL;
END $$;

-- Mesa ou combinação livre para o grupo na faixa (sem gravar nada). Prefere a menor que cabe.
CREATE OR REPLACE FUNCTION public.guest_find_tables(p_restaurant_id uuid, p_party integer, p_occupied tstzrange, p_ignore_reservation uuid DEFAULT NULL)
RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  WITH livres AS (
    SELECT t.id, t.seats_min, t.seats_max FROM public.restaurant_tables t
     WHERE t.restaurant_id = p_restaurant_id AND t.active AND t.reservable
       AND NOT EXISTS (SELECT 1 FROM public.guest_table_allocations a
                        LEFT JOIN public.guest_holds h ON h.id = a.hold_id
                        WHERE a.table_id = t.id AND a.occupied && p_occupied
                          AND (a.hold_id IS NULL OR (h.released_at IS NULL AND h.expires_at > now()))
                          AND (p_ignore_reservation IS NULL OR a.reservation_id IS DISTINCT FROM p_ignore_reservation))
       AND NOT EXISTS (SELECT 1 FROM public.guest_availability_exceptions e
                        WHERE e.table_id = t.id AND e.during && p_occupied)
  )
  SELECT ids FROM (
    SELECT ARRAY[l.id] AS ids, l.seats_max AS seats, 0 AS kind FROM livres l
     WHERE p_party BETWEEN COALESCE(l.seats_min, 1) AND l.seats_max
    UNION ALL
    SELECT c.table_ids, c.seats_max, 1 FROM public.guest_table_combinations c
     WHERE c.restaurant_id = p_restaurant_id AND c.active AND p_party BETWEEN c.seats_min AND c.seats_max
       AND (SELECT count(*) FROM livres l WHERE l.id = ANY (c.table_ids)) = cardinality(c.table_ids)
  ) x ORDER BY kind, seats, ids LIMIT 1
$$;

-- Libera holds vencidos do restaurante (as ocupações saem junto).
CREATE OR REPLACE FUNCTION public.guest_release_expired_holds(p_restaurant_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE n integer;
BEGIN
  WITH vencidos AS (
    UPDATE public.guest_holds SET released_at = now()
     WHERE restaurant_id = p_restaurant_id AND released_at IS NULL AND expires_at <= now()
    RETURNING id)
  DELETE FROM public.guest_table_allocations a USING vencidos v WHERE a.hold_id = v.id;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

-- Grava a ocupação das mesas. Se outra transação ocupou a mesa no meio do caminho, o EXCLUDE
-- recusa e a função tenta a próxima opção; sem opção, devolve NULL.
CREATE OR REPLACE FUNCTION public.guest_allocate(p_restaurant_id uuid, p_party integer, p_occupied tstzrange, p_hold_id uuid, p_reservation_id uuid)
RETURNS uuid[] LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_ids uuid[]; v_try integer := 0;
BEGIN
  LOOP
    v_try := v_try + 1;
    v_ids := public.guest_find_tables(p_restaurant_id, p_party, p_occupied, p_reservation_id);
    IF v_ids IS NULL OR v_try > 5 THEN RETURN NULL; END IF;
    BEGIN
      INSERT INTO public.guest_table_allocations (restaurant_id, table_id, occupied, hold_id, reservation_id)
      SELECT p_restaurant_id, unnest(v_ids), p_occupied, p_hold_id, p_reservation_id;
      RETURN v_ids;
    EXCEPTION WHEN exclusion_violation THEN
      -- Concorrência: alguém ocupou primeiro. Procura de novo.
      NULL;
    END;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.guest_log_reservation(p_reservation_id uuid, p_actor uuid, p_actor_kind text, p_action text, p_from text, p_to text, p_detail jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  INSERT INTO public.guest_reservation_events (reservation_id, restaurant_id, actor, actor_kind, action, from_status, to_status, detail)
  SELECT r.id, r.restaurant_id, p_actor, p_actor_kind, p_action, p_from, p_to, COALESCE(p_detail, '{}'::jsonb)
    FROM public.guest_reservations r WHERE r.id = p_reservation_id
$$;

-- Hold temporário: segura mesa(s) para o grupo enquanto o cliente confirma.
CREATE OR REPLACE FUNCTION public.guest_create_hold(p_restaurant_id uuid, p_guest_user_id uuid, p_session_key text, p_party integer, p_start timestamptz)
RETURNS TABLE (hold_id uuid, expires_at timestamptz, table_ids uuid[])
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
#variable_conflict use_column
DECLARE
  s public.guest_reservation_settings := public.guest_settings(p_restaurant_id);
  v_reason text; v_hold uuid; v_ids uuid[]; v_exp timestamptz; v_occ tstzrange;
BEGIN
  IF NOT public.guest_flag_enabled(p_restaurant_id, 'guest.reservations') THEN
    RAISE EXCEPTION 'Reservas desligadas para este restaurante';
  END IF;
  IF NOT s.accepting THEN RAISE EXCEPTION 'Este restaurante não está aceitando reservas no momento'; END IF;
  v_reason := public.guest_slot_closed_reason(p_restaurant_id, p_start, p_party);
  IF v_reason IS NOT NULL THEN RAISE EXCEPTION '%', v_reason; END IF;
  PERFORM public.guest_release_expired_holds(p_restaurant_id);
  IF (SELECT count(*) FROM public.guest_holds h
       WHERE h.released_at IS NULL AND h.expires_at > now()
         AND (h.session_key = p_session_key OR (p_guest_user_id IS NOT NULL AND h.guest_user_id = p_guest_user_id))) >= 2 THEN
    RAISE EXCEPTION 'Muitas reservas em andamento; conclua ou aguarde';
  END IF;
  v_occ := tstzrange(p_start, p_start + make_interval(mins => s.duration_min + s.buffer_min));
  v_exp := now() + make_interval(secs => s.hold_ttl_sec);
  INSERT INTO public.guest_holds (restaurant_id, guest_user_id, session_key, party_size, slot, table_ids, expires_at)
  VALUES (p_restaurant_id, p_guest_user_id, p_session_key, p_party,
          tstzrange(p_start, p_start + make_interval(mins => s.duration_min)), '{}', v_exp)
  RETURNING id INTO v_hold;
  v_ids := public.guest_allocate(p_restaurant_id, p_party, v_occ, v_hold, NULL);
  IF v_ids IS NULL THEN RAISE EXCEPTION 'Sem mesa disponível para % pessoas neste horário', p_party; END IF;
  UPDATE public.guest_holds SET table_ids = v_ids WHERE id = v_hold;
  RETURN QUERY SELECT v_hold, v_exp, v_ids;
END $$;

-- Confirma o hold como reserva. Idempotente pela chave: repetir devolve a mesma reserva.
CREATE OR REPLACE FUNCTION public.guest_confirm_reservation(
  p_hold_id uuid, p_session_key text, p_idempotency_key text, p_guest_name text,
  p_guest_phone text DEFAULT NULL, p_notes text DEFAULT NULL, p_occasion text DEFAULT NULL, p_channel text DEFAULT 'guest_app')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE h public.guest_holds; v_id uuid; v_status text;
BEGIN
  SELECT * INTO h FROM public.guest_holds WHERE id = p_hold_id FOR UPDATE;
  IF h.id IS NULL OR h.session_key IS DISTINCT FROM p_session_key THEN RAISE EXCEPTION 'Hold não encontrado'; END IF;
  SELECT id INTO v_id FROM public.guest_reservations WHERE restaurant_id = h.restaurant_id AND idempotency_key = p_idempotency_key;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  IF h.released_at IS NOT NULL OR h.expires_at <= now() THEN RAISE EXCEPTION 'O tempo para confirmar acabou; escolha o horário de novo'; END IF;
  IF NOT public.guest_flag_enabled(h.restaurant_id, 'guest.reservations') THEN RAISE EXCEPTION 'Reservas desligadas para este restaurante'; END IF;
  v_status := CASE WHEN (public.guest_settings(h.restaurant_id)).auto_confirm THEN 'confirmada' ELSE 'pendente' END;
  INSERT INTO public.guest_reservations (restaurant_id, guest_user_id, guest_name, guest_phone, party_size, slot, status,
    channel, idempotency_key, notes, occasion, hold_id, table_ids)
  VALUES (h.restaurant_id, h.guest_user_id, btrim(p_guest_name), NULLIF(btrim(p_guest_phone), ''), h.party_size, h.slot, v_status,
    p_channel, p_idempotency_key, NULLIF(btrim(p_notes), ''), p_occasion, h.id, h.table_ids)
  RETURNING id INTO v_id;
  UPDATE public.guest_table_allocations SET hold_id = NULL, reservation_id = v_id WHERE hold_id = h.id;
  UPDATE public.guest_holds SET released_at = now() WHERE id = h.id;
  PERFORM public.guest_log_reservation(v_id, h.guest_user_id, CASE WHEN p_channel IN ('painel', 'telefone') THEN 'restaurante' ELSE 'cliente' END, 'criada', NULL, v_status, jsonb_build_object('party_size', h.party_size, 'canal', p_channel));
  RETURN v_id;
END $$;

-- Cancelamento: cliente só dentro da política (até cancel_cutoff_min antes); restaurante com motivo.
CREATE OR REPLACE FUNCTION public.guest_cancel_reservation(p_reservation_id uuid, p_actor uuid, p_by text, p_reason text DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE r public.guest_reservations; v_to text;
BEGIN
  SELECT * INTO r FROM public.guest_reservations WHERE id = p_reservation_id FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Reserva não encontrada'; END IF;
  IF p_by = 'cliente' THEN
    IF p_actor IS NULL OR r.guest_user_id IS DISTINCT FROM p_actor THEN RAISE EXCEPTION 'Reserva não encontrada'; END IF;
    IF r.status NOT IN ('pendente', 'confirmada') THEN RAISE EXCEPTION 'Esta reserva não pode mais ser cancelada'; END IF;
    IF now() > lower(r.slot) - make_interval(mins => (public.guest_settings(r.restaurant_id)).cancel_cutoff_min) THEN
      RAISE EXCEPTION 'Fora do prazo de cancelamento pelo app; fale com o restaurante';
    END IF;
    v_to := 'cancelada_cliente';
  ELSIF p_by = 'restaurante' THEN
    IF NOT public.has_restaurant_role(p_actor, r.restaurant_id, ARRAY['owner', 'cashier']::app_role[]) THEN
      RAISE EXCEPTION 'Sem permissão para cancelar reservas deste restaurante';
    END IF;
    IF r.status NOT IN ('pendente', 'confirmada', 'chegou') THEN RAISE EXCEPTION 'Esta reserva não pode mais ser cancelada'; END IF;
    IF p_reason IS NULL OR length(btrim(p_reason)) < 3 THEN RAISE EXCEPTION 'Informe o motivo do cancelamento'; END IF;
    v_to := 'cancelada_restaurante';
  ELSE
    RAISE EXCEPTION 'Origem de cancelamento inválida';
  END IF;
  UPDATE public.guest_reservations SET status = v_to, cancel_reason = NULLIF(btrim(p_reason), '') WHERE id = r.id;
  DELETE FROM public.guest_table_allocations WHERE reservation_id = r.id;
  PERFORM public.guest_log_reservation(r.id, p_actor, p_by, 'cancelada', r.status, v_to, jsonb_build_object('motivo', p_reason));
  RETURN v_to;
END $$;

-- Alteração pelo cliente (horário e/ou grupo) dentro da política. Tudo ou nada.
CREATE OR REPLACE FUNCTION public.guest_change_reservation(p_reservation_id uuid, p_actor uuid, p_new_start timestamptz, p_new_party integer)
RETURNS uuid[] LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE r public.guest_reservations; s public.guest_reservation_settings; v_reason text; v_ids uuid[];
BEGIN
  SELECT * INTO r FROM public.guest_reservations WHERE id = p_reservation_id FOR UPDATE;
  IF r.id IS NULL OR p_actor IS NULL OR r.guest_user_id IS DISTINCT FROM p_actor THEN RAISE EXCEPTION 'Reserva não encontrada'; END IF;
  IF r.status NOT IN ('pendente', 'confirmada') THEN RAISE EXCEPTION 'Esta reserva não pode mais ser alterada'; END IF;
  s := public.guest_settings(r.restaurant_id);
  IF now() > lower(r.slot) - make_interval(mins => s.cancel_cutoff_min) THEN
    RAISE EXCEPTION 'Fora do prazo de alteração pelo app; fale com o restaurante';
  END IF;
  v_reason := public.guest_slot_closed_reason(r.restaurant_id, p_new_start, p_new_party);
  IF v_reason IS NOT NULL THEN RAISE EXCEPTION '%', v_reason; END IF;
  PERFORM public.guest_release_expired_holds(r.restaurant_id);
  DELETE FROM public.guest_table_allocations WHERE reservation_id = r.id;
  v_ids := public.guest_allocate(r.restaurant_id, p_new_party,
    tstzrange(p_new_start, p_new_start + make_interval(mins => s.duration_min + s.buffer_min)), NULL, r.id);
  IF v_ids IS NULL THEN
    -- A exceção desfaz a remoção das ocupações antigas: a reserva original continua valendo.
    RAISE EXCEPTION 'Sem mesa disponível para % pessoas no novo horário', p_new_party;
  END IF;
  UPDATE public.guest_reservations
     SET slot = tstzrange(p_new_start, p_new_start + make_interval(mins => s.duration_min)), party_size = p_new_party, table_ids = v_ids
   WHERE id = r.id;
  PERFORM public.guest_log_reservation(r.id, p_actor, 'cliente', 'alterada', r.status, r.status,
    jsonb_build_object('de', lower(r.slot), 'para', p_new_start, 'grupo_de', r.party_size, 'grupo_para', p_new_party));
  RETURN v_ids;
END $$;

-- Estados operados pela equipe do restaurante.
CREATE OR REPLACE FUNCTION public.guest_reservation_transition_allowed(p_from text, p_to text)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT (p_from, p_to) IN (
    ('pendente', 'confirmada'), ('confirmada', 'chegou'), ('confirmada', 'nao_compareceu'),
    ('chegou', 'sentada'), ('sentada', 'concluida'))
$$;

CREATE OR REPLACE FUNCTION public.guest_set_reservation_status(p_reservation_id uuid, p_actor uuid, p_to text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE r public.guest_reservations;
BEGIN
  SELECT * INTO r FROM public.guest_reservations WHERE id = p_reservation_id FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Reserva não encontrada'; END IF;
  IF NOT public.has_restaurant_role(p_actor, r.restaurant_id, ARRAY['owner', 'cashier', 'waiter']::app_role[]) THEN
    RAISE EXCEPTION 'Sem permissão para operar reservas deste restaurante';
  END IF;
  IF NOT public.guest_reservation_transition_allowed(r.status, p_to) THEN
    RAISE EXCEPTION 'Mudança de % para % não é permitida', r.status, p_to;
  END IF;
  IF p_to = 'nao_compareceu' AND now() < lower(r.slot) THEN RAISE EXCEPTION 'Ausência só pode ser marcada depois do horário da reserva'; END IF;
  UPDATE public.guest_reservations SET status = p_to WHERE id = r.id;
  IF p_to = 'nao_compareceu' THEN
    DELETE FROM public.guest_table_allocations WHERE reservation_id = r.id;
  ELSIF p_to = 'concluida' THEN
    -- Mesa liberada a partir de agora (mais o intervalo de arrumação).
    DELETE FROM public.guest_table_allocations
     WHERE reservation_id = r.id
       AND now() + make_interval(mins => (public.guest_settings(r.restaurant_id)).buffer_min) <= lower(occupied);
    UPDATE public.guest_table_allocations
       SET occupied = tstzrange(lower(occupied), least(upper(occupied), now() + make_interval(mins => (public.guest_settings(r.restaurant_id)).buffer_min)))
     WHERE reservation_id = r.id;
  END IF;
  PERFORM public.guest_log_reservation(r.id, p_actor, 'restaurante', 'estado', r.status, p_to);
  RETURN p_to;
END $$;

-- Check-in na mesa: chegou → sentada, na mesa reservada ou em outra livre do restaurante.
-- Trocar de mesa move a ocupação; se a nova mesa estiver reservada no período, o EXCLUDE recusa.
CREATE OR REPLACE FUNCTION public.guest_seat_reservation(p_reservation_id uuid, p_actor uuid, p_table_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE r public.guest_reservations; v_end timestamptz;
BEGIN
  SELECT * INTO r FROM public.guest_reservations WHERE id = p_reservation_id FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Reserva não encontrada'; END IF;
  IF NOT public.has_restaurant_role(p_actor, r.restaurant_id, ARRAY['owner', 'cashier', 'waiter']::app_role[]) THEN
    RAISE EXCEPTION 'Sem permissão para operar reservas deste restaurante';
  END IF;
  IF r.status <> 'chegou' THEN RAISE EXCEPTION 'Marque a chegada antes de levar à mesa'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.restaurant_tables t WHERE t.id = p_table_id AND t.restaurant_id = r.restaurant_id AND t.active) THEN
    RAISE EXCEPTION 'Mesa não encontrada neste restaurante';
  END IF;
  IF NOT (p_table_id = ANY (r.table_ids)) THEN
    v_end := greatest(now(), upper(r.slot)) + make_interval(mins => (public.guest_settings(r.restaurant_id)).buffer_min);
    DELETE FROM public.guest_table_allocations WHERE reservation_id = r.id;
    BEGIN
      INSERT INTO public.guest_table_allocations (restaurant_id, table_id, occupied, reservation_id)
      VALUES (r.restaurant_id, p_table_id, tstzrange(now(), v_end), r.id);
    EXCEPTION WHEN exclusion_violation THEN
      RAISE EXCEPTION 'Esta mesa está reservada para outro grupo neste período';
    END;
    UPDATE public.guest_reservations SET table_ids = ARRAY[p_table_id] WHERE id = r.id;
  END IF;
  UPDATE public.guest_reservations SET status = 'sentada', seated_table_id = p_table_id, seated_at = now() WHERE id = r.id;
  PERFORM public.guest_log_reservation(r.id, p_actor, 'restaurante', 'estado', 'chegou', 'sentada', jsonb_build_object('mesa', p_table_id));
  RETURN 'sentada';
END $$;

-- Horários abertos e com mesa livre para o grupo num dia (data local do restaurante).
CREATE OR REPLACE FUNCTION public.guest_available_slots(p_restaurant_id uuid, p_day date, p_party integer)
RETURNS SETOF timestamptz LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  s public.guest_reservation_settings := public.guest_settings(p_restaurant_id);
  r record; v_t timestamp; v_start timestamptz;
BEGIN
  FOR r IN SELECT first_seating, last_seating FROM public.guest_availability_rules
            WHERE restaurant_id = p_restaurant_id AND active AND weekday = extract(dow FROM p_day)::int
            ORDER BY first_seating LOOP
    v_t := p_day + r.first_seating;
    WHILE v_t <= p_day + r.last_seating LOOP
      v_start := v_t AT TIME ZONE s.timezone;
      IF public.guest_slot_closed_reason(p_restaurant_id, v_start, p_party) IS NULL
         AND public.guest_find_tables(p_restaurant_id, p_party,
               tstzrange(v_start, v_start + make_interval(mins => s.duration_min + s.buffer_min))) IS NOT NULL THEN
        RETURN NEXT v_start;
      END IF;
      v_t := v_t + make_interval(mins => s.slot_interval_min);
    END LOOP;
  END LOOP;
END $$;

-- Lista de espera: a posição é estimativa (quem entrou antes com faixa sobreposta), nunca garantia.
CREATE OR REPLACE FUNCTION public.guest_join_waitlist(p_restaurant_id uuid, p_guest_user_id uuid, p_guest_name text, p_party integer, p_wanted tstzrange)
RETURNS TABLE (entry_id uuid, position_estimate integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
#variable_conflict use_column
DECLARE v_id uuid; s public.guest_reservation_settings := public.guest_settings(p_restaurant_id);
BEGIN
  IF NOT public.guest_flag_enabled(p_restaurant_id, 'guest.reservations') THEN RAISE EXCEPTION 'Reservas desligadas para este restaurante'; END IF;
  IF p_party < s.min_party OR p_party > s.max_party THEN RAISE EXCEPTION 'Grupo fora do limite deste restaurante'; END IF;
  IF upper(p_wanted) <= now() THEN RAISE EXCEPTION 'Escolha uma faixa de horário futura'; END IF;
  SELECT id INTO v_id FROM public.guest_waitlist_entries
   WHERE restaurant_id = p_restaurant_id AND guest_user_id = p_guest_user_id AND wanted = p_wanted AND status IN ('aguardando', 'convocado');
  IF v_id IS NULL THEN
    IF (SELECT count(*) FROM public.guest_waitlist_entries WHERE guest_user_id = p_guest_user_id AND status IN ('aguardando', 'convocado')) >= 3 THEN
      RAISE EXCEPTION 'Limite de listas de espera ativas atingido';
    END IF;
    INSERT INTO public.guest_waitlist_entries (restaurant_id, guest_user_id, guest_name, party_size, wanted)
    VALUES (p_restaurant_id, p_guest_user_id, btrim(p_guest_name), p_party, p_wanted) RETURNING id INTO v_id;
  END IF;
  RETURN QUERY SELECT v_id, (SELECT count(*)::int FROM public.guest_waitlist_entries o, public.guest_waitlist_entries me
                              WHERE me.id = v_id AND o.restaurant_id = me.restaurant_id AND o.status = 'aguardando'
                                AND o.wanted && me.wanted AND o.created_at <= me.created_at);
END $$;

-- Convocação pela equipe, com prazo para responder; vencido o prazo, a entrada expira.
CREATE OR REPLACE FUNCTION public.guest_call_waitlist(p_entry_id uuid, p_actor uuid, p_minutes integer DEFAULT 15)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE e public.guest_waitlist_entries; v_by timestamptz;
BEGIN
  SELECT * INTO e FROM public.guest_waitlist_entries WHERE id = p_entry_id FOR UPDATE;
  IF e.id IS NULL THEN RAISE EXCEPTION 'Entrada não encontrada'; END IF;
  IF NOT public.has_restaurant_role(p_actor, e.restaurant_id, ARRAY['owner', 'cashier', 'waiter']::app_role[]) THEN
    RAISE EXCEPTION 'Sem permissão para operar a lista de espera';
  END IF;
  IF e.status <> 'aguardando' THEN RAISE EXCEPTION 'Esta entrada não está aguardando'; END IF;
  IF p_minutes NOT BETWEEN 5 AND 60 THEN RAISE EXCEPTION 'Prazo de resposta entre 5 e 60 minutos'; END IF;
  v_by := now() + make_interval(mins => p_minutes);
  UPDATE public.guest_waitlist_entries SET status = 'convocado', called_at = now(), respond_by = v_by WHERE id = e.id;
  RETURN v_by;
END $$;

CREATE OR REPLACE FUNCTION public.guest_cancel_waitlist(p_entry_id uuid, p_guest_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  UPDATE public.guest_waitlist_entries SET status = 'cancelado'
   WHERE id = p_entry_id AND guest_user_id = p_guest_user_id AND status IN ('aguardando', 'convocado');
  IF NOT FOUND THEN RAISE EXCEPTION 'Entrada não encontrada'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.guest_expire_waitlist()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE n integer;
BEGIN
  UPDATE public.guest_waitlist_entries SET status = 'expirado' WHERE status = 'convocado' AND respond_by <= now();
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

-- Alerta de disponibilidade: um por pedido igual; no máximo 5 ativos por pessoa.
CREATE OR REPLACE FUNCTION public.guest_create_alert(p_restaurant_id uuid, p_guest_user_id uuid, p_party integer, p_wanted tstzrange)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.guest_flag_enabled(p_restaurant_id, 'guest.reservations') THEN RAISE EXCEPTION 'Reservas desligadas para este restaurante'; END IF;
  IF upper(p_wanted) <= now() THEN RAISE EXCEPTION 'Escolha uma faixa de horário futura'; END IF;
  SELECT id INTO v_id FROM public.guest_availability_alerts
   WHERE restaurant_id = p_restaurant_id AND guest_user_id = p_guest_user_id AND party_size = p_party AND wanted = p_wanted AND status = 'ativo';
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  IF (SELECT count(*) FROM public.guest_availability_alerts WHERE guest_user_id = p_guest_user_id AND status = 'ativo') >= 5 THEN
    RAISE EXCEPTION 'Limite de alertas ativos atingido';
  END IF;
  INSERT INTO public.guest_availability_alerts (restaurant_id, guest_user_id, party_size, wanted)
  VALUES (p_restaurant_id, p_guest_user_id, p_party, p_wanted) RETURNING id INTO v_id;
  RETURN v_id;
END $$;

-- Verifica alertas ativos do restaurante e registra aviso só quando há horário real (regras + mesa
-- livre). Cada alerta dispara uma vez; rodar de novo não duplica.
CREATE OR REPLACE FUNCTION public.guest_match_alerts(p_restaurant_id uuid)
RETURNS TABLE (alert_id uuid, guest_user_id uuid, slot_start timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
#variable_conflict use_column
DECLARE
  a record; s public.guest_reservation_settings := public.guest_settings(p_restaurant_id);
  v_day date; v_slot timestamptz; v_found timestamptz;
BEGIN
  PERFORM public.guest_release_expired_holds(p_restaurant_id);
  FOR a IN SELECT * FROM public.guest_availability_alerts al
            WHERE al.restaurant_id = p_restaurant_id AND al.status = 'ativo' AND upper(al.wanted) > now()
            ORDER BY al.created_at FOR UPDATE SKIP LOCKED LOOP
    v_found := NULL;
    v_day := (greatest(lower(a.wanted), now()) AT TIME ZONE s.timezone)::date;
    WHILE v_found IS NULL AND v_day <= (upper(a.wanted) AT TIME ZONE s.timezone)::date LOOP
      SELECT min(x) INTO v_slot FROM public.guest_available_slots(p_restaurant_id, v_day, a.party_size) x WHERE a.wanted @> x;
      v_found := v_slot;
      v_day := v_day + 1;
    END LOOP;
    CONTINUE WHEN v_found IS NULL;
    INSERT INTO public.guest_alert_notifications (alert_id, slot_start) VALUES (a.id, v_found) ON CONFLICT DO NOTHING;
    IF FOUND THEN
      UPDATE public.guest_availability_alerts SET status = 'disparado' WHERE id = a.id;
      alert_id := a.id; guest_user_id := a.guest_user_id; slot_start := v_found;
      RETURN NEXT;
    END IF;
  END LOOP;
END $$;

-- Só o servidor chama as funções.
DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'guest_settings(uuid)', 'guest_slot_closed_reason(uuid, timestamptz, integer)', 'guest_find_tables(uuid, integer, tstzrange, uuid)',
    'guest_release_expired_holds(uuid)', 'guest_allocate(uuid, integer, tstzrange, uuid, uuid)',
    'guest_log_reservation(uuid, uuid, text, text, text, text, jsonb)', 'guest_create_hold(uuid, uuid, text, integer, timestamptz)',
    'guest_confirm_reservation(uuid, text, text, text, text, text, text, text)', 'guest_cancel_reservation(uuid, uuid, text, text)',
    'guest_change_reservation(uuid, uuid, timestamptz, integer)', 'guest_set_reservation_status(uuid, uuid, text)',
    'guest_seat_reservation(uuid, uuid, uuid)',
    'guest_available_slots(uuid, date, integer)', 'guest_join_waitlist(uuid, uuid, text, integer, tstzrange)',
    'guest_call_waitlist(uuid, uuid, integer)', 'guest_cancel_waitlist(uuid, uuid)', 'guest_expire_waitlist()',
    'guest_create_alert(uuid, uuid, integer, tstzrange)', 'guest_match_alerts(uuid)'] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO service_role', f);
  END LOOP;
END $$;
