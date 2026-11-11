-- Tipe Guest · Fase 2: avaliações elegíveis para o futuro, com consentimento.
-- Aditiva: waiter_ratings e submitRating continuam iguais. A nova coleta grava uma
-- segunda linha em guest_reviews só quando a flag "guest.reviews_v2" está ligada para
-- o restaurante (padrão: desligada em todo lugar).
-- Numeração: bloco 0040–0049 reservado ao Tipe Guest (ver docs/tipe-guest/AUDITORIA.md §7).
-- NÃO aplicar em produção sem autorização do Roberto.

-- ---------------------------------------------------------------- flags
CREATE TABLE IF NOT EXISTS public.guest_feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- NULL = vale para o ambiente inteiro; com valor = só aquele restaurante.
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE,
  flag_key text NOT NULL CHECK (flag_key ~ '^guest\.[a-z0-9_.]{2,60}$'),
  enabled boolean NOT NULL DEFAULT false,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS guest_feature_flags_scope_key
  ON public.guest_feature_flags (COALESCE(restaurant_id, '00000000-0000-0000-0000-000000000000'::uuid), flag_key);
ALTER TABLE public.guest_feature_flags ENABLE ROW LEVEL SECURITY;
-- Supabase concede tudo por padrão a anon/authenticated; aqui só leitura (escrita só por RPC).
REVOKE ALL ON public.guest_feature_flags FROM anon, authenticated;
GRANT SELECT ON public.guest_feature_flags TO authenticated;
GRANT ALL ON public.guest_feature_flags TO service_role;
DROP POLICY IF EXISTS "Owners read own guest flags" ON public.guest_feature_flags;
CREATE POLICY "Owners read own guest flags" ON public.guest_feature_flags FOR SELECT TO authenticated
USING (restaurant_id IS NOT NULL AND public.has_restaurant_role(auth.uid(), restaurant_id, ARRAY['owner']::app_role[]));

-- O valor do restaurante vence o do ambiente; sem linha nenhuma, desligado.
CREATE OR REPLACE FUNCTION public.guest_flag_enabled(p_restaurant_id uuid, p_key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT COALESCE(
    (SELECT enabled FROM public.guest_feature_flags WHERE restaurant_id = p_restaurant_id AND flag_key = p_key),
    (SELECT enabled FROM public.guest_feature_flags WHERE restaurant_id IS NULL AND flag_key = p_key),
    false)
$$;
REVOKE EXECUTE ON FUNCTION public.guest_flag_enabled(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guest_flag_enabled(uuid, text) TO service_role;

-- ---------------------------------------------------------------- avaliações
CREATE TABLE IF NOT EXISTS public.guest_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  waiter_id uuid REFERENCES public.pdv_waiters(id) ON DELETE SET NULL,
  -- A linha interna de sempre (waiter_ratings) que originou esta.
  waiter_rating_id uuid REFERENCES public.waiter_ratings(id) ON DELETE SET NULL,
  -- Pagamento da visita; só preenchido quando confere com restaurante e mesa.
  payment_request_id uuid REFERENCES public.table_payment_requests(id) ON DELETE SET NULL,
  table_number text NOT NULL,
  -- Só existe nota do que é de fato perguntado. Hoje: o atendimento.
  service_stars integer NOT NULL CHECK (service_stars BETWEEN 1 AND 5),
  overall_stars integer CHECK (overall_stars BETWEEN 1 AND 5),
  food_stars integer CHECK (food_stars BETWEEN 1 AND 5),
  ambience_stars integer CHECK (ambience_stars BETWEEN 1 AND 5),
  comment text CHECK (comment IS NULL OR char_length(comment) <= 400),
  source text NOT NULL DEFAULT 'qr_pos_pagamento' CHECK (source IN ('qr_pos_pagamento')),
  verification text NOT NULL DEFAULT 'nao_verificada' CHECK (verification IN ('nao_verificada', 'visita_paga_verificada')),
  moderation_status text NOT NULL DEFAULT 'pendente' CHECK (moderation_status IN ('pendente', 'aprovada', 'oculta', 'em_revisao')),
  publish_consent boolean NOT NULL DEFAULT false,
  consent_version text,
  consent_at timestamptz,
  public_identity text NOT NULL DEFAULT 'anonimo' CHECK (public_identity IN ('anonimo', 'primeiro_nome')),
  public_first_name text CHECK (public_first_name IS NULL OR char_length(public_first_name) <= 40),
  publication_eligible boolean GENERATED ALWAYS AS (publish_consent AND verification = 'visita_paga_verificada') STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT guest_reviews_consent_complete CHECK (NOT publish_consent OR (consent_version IS NOT NULL AND consent_at IS NOT NULL)),
  CONSTRAINT guest_reviews_name_needs_consent CHECK (public_first_name IS NULL OR (publish_consent AND public_identity = 'primeiro_nome'))
);
CREATE UNIQUE INDEX IF NOT EXISTS guest_reviews_one_per_payment ON public.guest_reviews (payment_request_id) WHERE payment_request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS guest_reviews_restaurant_idx ON public.guest_reviews (restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS guest_reviews_queue_idx ON public.guest_reviews (moderation_status, created_at) WHERE publish_consent;
DROP TRIGGER IF EXISTS set_guest_reviews_updated_at ON public.guest_reviews;
CREATE TRIGGER set_guest_reviews_updated_at BEFORE UPDATE ON public.guest_reviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
ALTER TABLE public.guest_reviews ENABLE ROW LEVEL SECURITY;
-- Supabase concede tudo por padrão a anon/authenticated; aqui só leitura (escrita só por RPC).
REVOKE ALL ON public.guest_reviews FROM anon, authenticated;
GRANT SELECT ON public.guest_reviews TO authenticated;
GRANT ALL ON public.guest_reviews TO service_role;
-- Mesma regra de waiter_ratings: dono e caixa do próprio restaurante. Escrita só por RPC.
DROP POLICY IF EXISTS "Owners and cashiers read guest reviews" ON public.guest_reviews;
CREATE POLICY "Owners and cashiers read guest reviews" ON public.guest_reviews FOR SELECT TO authenticated
USING (public.has_restaurant_role(auth.uid(), restaurant_id, ARRAY['owner','cashier']::app_role[]));

-- Trilha de auditoria: toda criação e mudança.
CREATE TABLE IF NOT EXISTS public.guest_review_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.guest_reviews(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('criada', 'aprovada', 'oculta', 'reaberta', 'contestada', 'denunciada', 'consentimento_revogado')),
  actor_user_id uuid,
  actor_kind text NOT NULL CHECK (actor_kind IN ('cliente', 'restaurante', 'equipe_tipe', 'usuario_guest')),
  from_status text,
  to_status text,
  reason text CHECK (reason IS NULL OR char_length(reason) <= 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS guest_review_events_review_idx ON public.guest_review_events (review_id, created_at);
ALTER TABLE public.guest_review_events ENABLE ROW LEVEL SECURITY;
-- Supabase concede tudo por padrão a anon/authenticated; aqui só leitura (escrita só por RPC).
REVOKE ALL ON public.guest_review_events FROM anon, authenticated;
GRANT SELECT ON public.guest_review_events TO authenticated;
GRANT ALL ON public.guest_review_events TO service_role;
DROP POLICY IF EXISTS "Owners read guest review events" ON public.guest_review_events;
CREATE POLICY "Owners read guest review events" ON public.guest_review_events FOR SELECT TO authenticated
USING (public.has_restaurant_role(auth.uid(), restaurant_id, ARRAY['owner','cashier']::app_role[]));

-- Contestação (restaurante) e denúncia (usuário do Guest, quando houver leitura pública).
CREATE TABLE IF NOT EXISTS public.guest_review_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.guest_reviews(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('contestacao', 'denuncia')),
  reporter_user_id uuid NOT NULL,
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 5 AND 500),
  status text NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'resolvida')),
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS guest_review_reports_one_open ON public.guest_review_reports (review_id, reporter_user_id) WHERE status = 'aberta';
ALTER TABLE public.guest_review_reports ENABLE ROW LEVEL SECURITY;
-- Supabase concede tudo por padrão a anon/authenticated; aqui só leitura (escrita só por RPC).
REVOKE ALL ON public.guest_review_reports FROM anon, authenticated;
GRANT SELECT ON public.guest_review_reports TO authenticated;
GRANT ALL ON public.guest_review_reports TO service_role;
DROP POLICY IF EXISTS "Owners read own reports" ON public.guest_review_reports;
CREATE POLICY "Owners read own reports" ON public.guest_review_reports FOR SELECT TO authenticated
USING (kind = 'contestacao' AND public.has_restaurant_role(auth.uid(), restaurant_id, ARRAY['owner']::app_role[]));

-- ---------------------------------------------------------------- RPCs
-- Gravação pela conta do QR (o servidor já validou a sessão da mesa). Só service_role.
CREATE OR REPLACE FUNCTION public.guest_record_review(
  p_restaurant_id uuid, p_table_number text, p_waiter_rating_id uuid, p_payment_request_id uuid,
  p_service_stars integer, p_comment text, p_publish_consent boolean, p_public_identity text, p_consent_version text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_slug text; v_pay record; v_rating record; v_pay_id uuid; v_verif text := 'nao_verificada';
  v_identity text := 'anonimo'; v_name text; v_consent boolean := COALESCE(p_publish_consent, false); v_id uuid;
BEGIN
  IF NOT public.guest_flag_enabled(p_restaurant_id, 'guest.reviews_v2') THEN
    RAISE EXCEPTION 'Coleta de avaliações do Guest desligada para este restaurante';
  END IF;
  IF p_service_stars IS NULL OR p_service_stars NOT BETWEEN 1 AND 5 THEN RAISE EXCEPTION 'Nota inválida'; END IF;
  IF v_consent AND (p_consent_version IS NULL OR p_consent_version !~ '^[a-z0-9._-]{1,40}$') THEN
    RAISE EXCEPTION 'Versão do texto de consentimento obrigatória';
  END IF;
  SELECT slug INTO v_slug FROM public.restaurants WHERE id = p_restaurant_id;
  IF v_slug IS NULL THEN RAISE EXCEPTION 'Restaurante não encontrado'; END IF;

  SELECT id, waiter_id, stars, table_number INTO v_rating FROM public.waiter_ratings
  WHERE id = p_waiter_rating_id AND restaurant_id = p_restaurant_id;
  IF v_rating.id IS NULL OR v_rating.table_number <> p_table_number OR v_rating.stars <> p_service_stars THEN
    RAISE EXCEPTION 'Avaliação de origem não confere';
  END IF;

  -- "Visita paga verificada" só com pagamento da conta aprovado (o webhook do provedor é quem aprova).
  IF p_payment_request_id IS NOT NULL THEN
    SELECT id, status, customer_name INTO v_pay FROM public.table_payment_requests
    WHERE id = p_payment_request_id AND restaurant_slug = v_slug AND table_number = p_table_number AND payment_target = 'restaurant';
    IF v_pay.id IS NOT NULL THEN
      v_pay_id := v_pay.id;
      IF v_pay.status = 'approved' THEN v_verif := 'visita_paga_verificada'; END IF;
    END IF;
  END IF;

  IF v_consent AND p_public_identity = 'primeiro_nome' AND v_verif = 'visita_paga_verificada' THEN
    v_name := NULLIF(left(split_part(btrim(v_pay.customer_name), ' ', 1), 40), '');
    IF v_name IS NOT NULL THEN v_identity := 'primeiro_nome'; END IF;
  END IF;

  BEGIN
    INSERT INTO public.guest_reviews (restaurant_id, waiter_id, waiter_rating_id, payment_request_id, table_number,
      service_stars, comment, verification, publish_consent, consent_version, consent_at, public_identity, public_first_name)
    VALUES (p_restaurant_id, v_rating.waiter_id, v_rating.id, v_pay_id, p_table_number,
      p_service_stars, NULLIF(left(btrim(COALESCE(p_comment, '')), 400), ''), v_verif, v_consent,
      CASE WHEN v_consent THEN p_consent_version END, CASE WHEN v_consent THEN now() END, v_identity, v_name)
    RETURNING id INTO v_id;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'Este pagamento já tem avaliação';
  END;

  INSERT INTO public.guest_review_events (review_id, restaurant_id, action, actor_kind, to_status)
  VALUES (v_id, p_restaurant_id, 'criada', 'cliente', 'pendente');
  RETURN v_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.guest_record_review(uuid, text, uuid, uuid, integer, text, boolean, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guest_record_review(uuid, text, uuid, uuid, integer, text, boolean, text, text) TO service_role;

-- Moderação pela equipe Tipe. O servidor exige founder com 2FA e repassa o ator;
-- a função confere o papel de novo. Só avaliações com consentimento entram na fila.
CREATE OR REPLACE FUNCTION public.guest_moderate_review(p_actor uuid, p_review_id uuid, p_action text, p_reason text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_rev record; v_to text; v_event text;
BEGIN
  IF NOT public.has_role(p_actor, 'founder') THEN RAISE EXCEPTION 'Somente a equipe Tipe modera avaliações'; END IF;
  SELECT id, restaurant_id, moderation_status, publish_consent INTO v_rev FROM public.guest_reviews WHERE id = p_review_id FOR UPDATE;
  IF v_rev.id IS NULL THEN RAISE EXCEPTION 'Avaliação não encontrada'; END IF;
  IF NOT v_rev.publish_consent THEN RAISE EXCEPTION 'Avaliação sem consentimento não entra na moderação'; END IF;
  CASE p_action
    WHEN 'aprovar' THEN v_to := 'aprovada'; v_event := 'aprovada';
    WHEN 'ocultar' THEN v_to := 'oculta'; v_event := 'oculta';
    WHEN 'reabrir' THEN v_to := 'pendente'; v_event := 'reaberta';
    ELSE RAISE EXCEPTION 'Ação inválida';
  END CASE;
  IF p_action = 'ocultar' AND COALESCE(length(btrim(p_reason)), 0) < 5 THEN RAISE EXCEPTION 'Informe o motivo para ocultar'; END IF;
  UPDATE public.guest_reviews SET moderation_status = v_to WHERE id = p_review_id;
  -- Ao decidir, as contestações e denúncias abertas são encerradas.
  IF p_action IN ('aprovar', 'ocultar') THEN
    UPDATE public.guest_review_reports SET status = 'resolvida', resolved_by = p_actor, resolved_at = now()
    WHERE review_id = p_review_id AND status = 'aberta';
  END IF;
  INSERT INTO public.guest_review_events (review_id, restaurant_id, action, actor_user_id, actor_kind, from_status, to_status, reason)
  VALUES (p_review_id, v_rev.restaurant_id, v_event, p_actor, 'equipe_tipe', v_rev.moderation_status, v_to, NULLIF(left(btrim(COALESCE(p_reason, '')), 500), ''));
  RETURN v_to;
END $$;
REVOKE EXECUTE ON FUNCTION public.guest_moderate_review(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guest_moderate_review(uuid, uuid, text, text) TO service_role;

-- Contestação pelo dono do restaurante: tira da leitura pública até a equipe decidir.
CREATE OR REPLACE FUNCTION public.guest_contest_review(p_review_id uuid, p_reason text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_rev record; v_id uuid; v_uid uuid := auth.uid();
BEGIN
  SELECT id, restaurant_id, moderation_status INTO v_rev FROM public.guest_reviews WHERE id = p_review_id FOR UPDATE;
  IF v_rev.id IS NULL OR v_uid IS NULL OR NOT public.has_restaurant_role(v_uid, v_rev.restaurant_id, ARRAY['owner']::app_role[]) THEN
    RAISE EXCEPTION 'Avaliação não encontrada';
  END IF;
  IF COALESCE(length(btrim(p_reason)), 0) < 5 THEN RAISE EXCEPTION 'Explique o motivo da contestação'; END IF;
  BEGIN
    INSERT INTO public.guest_review_reports (review_id, restaurant_id, kind, reporter_user_id, reason)
    VALUES (p_review_id, v_rev.restaurant_id, 'contestacao', v_uid, left(btrim(p_reason), 500)) RETURNING id INTO v_id;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'Já existe uma contestação aberta para esta avaliação';
  END;
  UPDATE public.guest_reviews SET moderation_status = 'em_revisao' WHERE id = p_review_id;
  INSERT INTO public.guest_review_events (review_id, restaurant_id, action, actor_user_id, actor_kind, from_status, to_status, reason)
  VALUES (p_review_id, v_rev.restaurant_id, 'contestada', v_uid, 'restaurante', v_rev.moderation_status, 'em_revisao', left(btrim(p_reason), 500));
  RETURN v_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.guest_contest_review(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.guest_contest_review(uuid, text) TO authenticated, service_role;

-- Leitura futura do Guest: só avaliação com consentimento, visita paga verificada e aprovada.
-- Sem garçom, sem mesa, sem pagamento. Por ora só o servidor chama (nenhuma tela pública ainda).
CREATE OR REPLACE FUNCTION public.guest_public_reviews(p_restaurant_id uuid, p_limit integer DEFAULT 20)
RETURNS TABLE (id uuid, service_stars integer, comment text, display_name text, verified_visit boolean, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT r.id, r.service_stars, r.comment,
    CASE WHEN r.public_identity = 'primeiro_nome' AND r.public_first_name IS NOT NULL THEN r.public_first_name ELSE 'Cliente verificado' END,
    true, r.created_at
  FROM public.guest_reviews r
  WHERE r.restaurant_id = p_restaurant_id AND r.publication_eligible AND r.publish_consent AND r.moderation_status = 'aprovada'
  ORDER BY r.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50)
$$;
REVOKE EXECUTE ON FUNCTION public.guest_public_reviews(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guest_public_reviews(uuid, integer) TO service_role;
