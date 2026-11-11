-- Tipe Guest · Fila de espera presencial (decisão do Roberto, 03/11: QR da porta + localização).
-- Quem chega sem reserva escaneia o QR da porta e entra na fila pelo celular. Para entrar, valem as
-- duas provas: o código do QR (que o restaurante pode trocar a qualquer hora) e a localização do
-- aparelho dentro do raio do restaurante. A localização é usada só na conferência: não é guardada.
-- A recepção também pode colocar alguém na fila pelo painel.
-- Aditiva. Fica inerte enquanto a flag guest.reservations estiver desligada e o dono não ligar a fila.

-- ---------------------------------------------------------------- local do restaurante e QR da porta
CREATE TABLE IF NOT EXISTS public.guest_walkin_settings (
  restaurant_id uuid PRIMARY KEY REFERENCES public.restaurants (id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  lat double precision CHECK (lat IS NULL OR lat BETWEEN -90 AND 90),
  lng double precision CHECK (lng IS NULL OR lng BETWEEN -180 AND 180),
  radius_m smallint NOT NULL DEFAULT 150 CHECK (radius_m BETWEEN 50 AND 500),
  -- Segredo do QR da porta. Trocar invalida QR impressos antes.
  door_token text NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(16), 'hex'),
  token_rotated_at timestamptz NOT NULL DEFAULT now(),
  -- Tempo para o cliente se apresentar depois do aviso.
  call_minutes smallint NOT NULL DEFAULT 10 CHECK (call_minutes BETWEEN 5 AND 30),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (NOT enabled OR (lat IS NOT NULL AND lng IS NOT NULL))
);
DROP TRIGGER IF EXISTS set_guest_walkin_settings_updated_at ON public.guest_walkin_settings;
CREATE TRIGGER set_guest_walkin_settings_updated_at BEFORE UPDATE ON public.guest_walkin_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.guest_walkin_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.guest_walkin_settings FROM anon, authenticated;
GRANT ALL ON public.guest_walkin_settings TO service_role;
-- O token do QR é segredo do restaurante: só membros leem pelo cliente do Supabase.
GRANT SELECT ON public.guest_walkin_settings TO authenticated;
DROP POLICY IF EXISTS "Members read" ON public.guest_walkin_settings;
CREATE POLICY "Members read" ON public.guest_walkin_settings FOR SELECT TO authenticated
USING (public.is_restaurant_member(auth.uid(), restaurant_id));

-- ---------------------------------------------------------------- entradas presenciais
-- A lista de espera da 0042 ganha o tipo "presencial": pode ser de alguém sem conta (identificado
-- pela chave do aparelho), guarda só se o local foi conferido e como, nunca as coordenadas.
ALTER TABLE public.guest_waitlist_entries ALTER COLUMN guest_user_id DROP NOT NULL;
ALTER TABLE public.guest_waitlist_entries
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'reserva',
  ADD COLUMN IF NOT EXISTS device_key text,
  ADD COLUMN IF NOT EXISTS guest_phone text,
  ADD COLUMN IF NOT EXISTS verified_by text,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS seated_at timestamptz;
DO $$ BEGIN
  ALTER TABLE public.guest_waitlist_entries ADD CONSTRAINT guest_waitlist_kind_check CHECK (
    kind IN ('reserva', 'presencial')
    AND (kind <> 'reserva' OR guest_user_id IS NOT NULL)
    AND (kind <> 'presencial' OR (verified_by IN ('qr_local', 'recepcao') AND verified_at IS NOT NULL
         AND (guest_user_id IS NOT NULL OR device_key IS NOT NULL OR verified_by = 'recepcao')))
    AND (device_key IS NULL OR length(device_key) BETWEEN 16 AND 80)
    AND (guest_phone IS NULL OR guest_phone ~ '^\+?[0-9]{10,15}$'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- Um aparelho fica uma vez só na fila ativa de cada restaurante.
CREATE UNIQUE INDEX IF NOT EXISTS guest_walkin_one_active_device
  ON public.guest_waitlist_entries (restaurant_id, device_key)
  WHERE kind = 'presencial' AND device_key IS NOT NULL AND status IN ('aguardando', 'convocado');
CREATE INDEX IF NOT EXISTS guest_walkin_queue_idx
  ON public.guest_waitlist_entries (restaurant_id, created_at) WHERE kind = 'presencial' AND status IN ('aguardando', 'convocado');

-- ---------------------------------------------------------------- funções
-- Distância em metros entre dois pontos (fórmula de haversine; precisão de sobra para 150 m).
CREATE OR REPLACE FUNCTION public.guest_distance_m(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
RETURNS double precision LANGUAGE sql IMMUTABLE AS $$
  SELECT 2 * 6371000 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)))
$$;

-- Posição estimada: quantos presenciais aguardando entraram antes, mais um.
CREATE OR REPLACE FUNCTION public.guest_walkin_position(p_entry_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT CASE WHEN me.status <> 'aguardando' THEN 0 ELSE (
    SELECT count(*)::int FROM public.guest_waitlist_entries o
     WHERE o.restaurant_id = me.restaurant_id AND o.kind = 'presencial' AND o.status = 'aguardando'
       AND o.created_at <= me.created_at) END
  FROM public.guest_waitlist_entries me WHERE me.id = p_entry_id
$$;

-- Entrada pelo celular: QR da porta + localização no raio. Sem gravar coordenadas.
CREATE OR REPLACE FUNCTION public.guest_join_walkin(
  p_door_token text, p_lat double precision, p_lng double precision, p_accuracy_m double precision,
  p_device_key text, p_guest_user_id uuid, p_guest_name text, p_party integer, p_guest_phone text DEFAULT NULL)
RETURNS TABLE (entry_id uuid, restaurant_id uuid, position_estimate integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
#variable_conflict use_column
DECLARE w public.guest_walkin_settings; s public.guest_reservation_settings; v_id uuid; v_dist double precision;
BEGIN
  SELECT * INTO w FROM public.guest_walkin_settings WHERE door_token = p_door_token;
  IF w.restaurant_id IS NULL THEN RAISE EXCEPTION 'QR Code inválido ou trocado. Escaneie o QR da porta de novo'; END IF;
  IF NOT w.enabled OR NOT public.guest_flag_enabled(w.restaurant_id, 'guest.reservations') THEN
    RAISE EXCEPTION 'A fila pelo celular não está aberta agora. Fale com a recepção';
  END IF;
  IF p_lat IS NULL OR p_lng IS NULL OR p_accuracy_m IS NULL OR p_lat NOT BETWEEN -90 AND 90 OR p_lng NOT BETWEEN -180 AND 180 THEN
    RAISE EXCEPTION 'Precisamos da sua localização para confirmar que você está no restaurante';
  END IF;
  IF p_accuracy_m > 150 THEN
    RAISE EXCEPTION 'Sua localização está imprecisa. Ative a localização precisa e tente perto da entrada';
  END IF;
  v_dist := public.guest_distance_m(w.lat, w.lng, p_lat, p_lng);
  IF v_dist > w.radius_m + least(p_accuracy_m, 50) THEN
    RAISE EXCEPTION 'Você parece estar longe do restaurante. A fila é só para quem já está no local';
  END IF;
  s := public.guest_settings(w.restaurant_id);
  IF p_party < s.min_party OR p_party > s.max_party THEN RAISE EXCEPTION 'Grupo fora do limite deste restaurante'; END IF;
  IF p_device_key IS NULL OR length(p_device_key) NOT BETWEEN 16 AND 80 THEN RAISE EXCEPTION 'Aparelho não identificado'; END IF;

  -- Mesmo aparelho já na fila: devolve a mesma entrada (toque duplo, recarregar a página).
  SELECT id INTO v_id FROM public.guest_waitlist_entries e
   WHERE e.restaurant_id = w.restaurant_id AND e.kind = 'presencial' AND e.device_key = p_device_key AND e.status IN ('aguardando', 'convocado');
  IF v_id IS NULL THEN
    INSERT INTO public.guest_waitlist_entries
      (restaurant_id, guest_user_id, guest_name, party_size, wanted, kind, device_key, guest_phone, verified_by, verified_at)
    VALUES (w.restaurant_id, p_guest_user_id, btrim(p_guest_name), p_party, tstzrange(now(), now() + interval '4 hours'),
      'presencial', p_device_key, nullif(btrim(coalesce(p_guest_phone, '')), ''), 'qr_local', now())
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_id;
    IF v_id IS NULL THEN  -- corrida entre dois toques: a outra transação criou
      SELECT id INTO v_id FROM public.guest_waitlist_entries e
       WHERE e.restaurant_id = w.restaurant_id AND e.kind = 'presencial' AND e.device_key = p_device_key AND e.status IN ('aguardando', 'convocado');
    END IF;
  END IF;
  RETURN QUERY SELECT v_id, w.restaurant_id, public.guest_walkin_position(v_id);
END $$;

-- Entrada pela recepção (quem não tem celular ou não quer usar).
CREATE OR REPLACE FUNCTION public.guest_add_walkin(p_restaurant_id uuid, p_actor uuid, p_guest_name text, p_party integer, p_guest_phone text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE s public.guest_reservation_settings := public.guest_settings(p_restaurant_id); v_id uuid;
BEGIN
  IF NOT public.has_restaurant_role(p_actor, p_restaurant_id, ARRAY['owner', 'cashier', 'waiter']::app_role[]) THEN
    RAISE EXCEPTION 'Sem permissão para operar a lista de espera';
  END IF;
  IF NOT public.guest_flag_enabled(p_restaurant_id, 'guest.reservations') THEN RAISE EXCEPTION 'Reservas desligadas para este restaurante'; END IF;
  IF p_party < s.min_party OR p_party > s.max_party THEN RAISE EXCEPTION 'Grupo fora do limite deste restaurante'; END IF;
  INSERT INTO public.guest_waitlist_entries (restaurant_id, guest_name, party_size, wanted, kind, guest_phone, verified_by, verified_at)
  VALUES (p_restaurant_id, btrim(p_guest_name), p_party, tstzrange(now(), now() + interval '4 hours'), 'presencial',
    nullif(btrim(coalesce(p_guest_phone, '')), ''), 'recepcao', now())
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

-- Situação vista pelo próprio aparelho (sem conta) ou pela conta que entrou.
CREATE OR REPLACE FUNCTION public.guest_walkin_status(p_entry_id uuid, p_device_key text)
RETURNS TABLE (status text, position_estimate integer, respond_by timestamptz, restaurant_name text, party_size smallint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT e.status, public.guest_walkin_position(e.id), e.respond_by, r.name, e.party_size
    FROM public.guest_waitlist_entries e JOIN public.restaurants r ON r.id = e.restaurant_id
   WHERE e.id = p_entry_id AND e.kind = 'presencial' AND e.device_key = p_device_key
$$;

CREATE OR REPLACE FUNCTION public.guest_leave_walkin(p_entry_id uuid, p_device_key text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  UPDATE public.guest_waitlist_entries SET status = 'cancelado'
   WHERE id = p_entry_id AND kind = 'presencial' AND device_key = p_device_key AND status IN ('aguardando', 'convocado');
  IF NOT FOUND THEN RAISE EXCEPTION 'Entrada não encontrada'; END IF;
END $$;

-- Equipe: o grupo chegou à mesa (encerra a entrada) ou desistiu.
CREATE OR REPLACE FUNCTION public.guest_finish_walkin(p_entry_id uuid, p_actor uuid, p_seated boolean)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE e public.guest_waitlist_entries; v_to text := CASE WHEN p_seated THEN 'confirmado' ELSE 'cancelado' END;
BEGIN
  SELECT * INTO e FROM public.guest_waitlist_entries WHERE id = p_entry_id FOR UPDATE;
  IF e.id IS NULL THEN RAISE EXCEPTION 'Entrada não encontrada'; END IF;
  IF NOT public.has_restaurant_role(p_actor, e.restaurant_id, ARRAY['owner', 'cashier', 'waiter']::app_role[]) THEN
    RAISE EXCEPTION 'Sem permissão para operar a lista de espera';
  END IF;
  IF e.status NOT IN ('aguardando', 'convocado') THEN RAISE EXCEPTION 'Esta entrada já foi encerrada'; END IF;
  UPDATE public.guest_waitlist_entries SET status = v_to, seated_at = CASE WHEN p_seated THEN now() END WHERE id = e.id;
  RETURN v_to;
END $$;

-- Dono troca o QR da porta (QR impresso antes deixa de valer).
CREATE OR REPLACE FUNCTION public.guest_rotate_door_token(p_restaurant_id uuid, p_actor uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v text := encode(extensions.gen_random_bytes(16), 'hex');
BEGIN
  IF NOT public.has_restaurant_role(p_actor, p_restaurant_id, ARRAY['owner']::app_role[]) THEN
    RAISE EXCEPTION 'Só o dono troca o QR da porta';
  END IF;
  INSERT INTO public.guest_walkin_settings (restaurant_id, door_token) VALUES (p_restaurant_id, v)
  ON CONFLICT (restaurant_id) DO UPDATE SET door_token = v, token_rotated_at = now();
  RETURN v;
END $$;

DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'guest_walkin_position(uuid)',
    'guest_join_walkin(text, double precision, double precision, double precision, text, uuid, text, integer, text)',
    'guest_add_walkin(uuid, uuid, text, integer, text)', 'guest_walkin_status(uuid, text)', 'guest_leave_walkin(uuid, text)',
    'guest_finish_walkin(uuid, uuid, boolean)', 'guest_rotate_door_token(uuid, uuid)'] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO service_role', f);
  END LOOP;
END $$;
