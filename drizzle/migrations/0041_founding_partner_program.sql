-- 0041 · Programa Restaurante Fundador (PROPOSTA, NÃO APLICADA EM PRODUÇÃO)
--
-- Número do bloco do Tipe Guest (0040–0049; 0031–0033 acabaram usados por outras branches,
-- a Fase 2 do Guest usa 0040). Esta branch parte de crm/backoffice-saas, que ainda termina
-- em 0022: o drizzle/migrations/meta/_journal.json NÃO foi alterado aqui. Ao juntar com as
-- branches que trazem 0023–0040, registre 0041 depois delas no _journal.json.
--
-- Nome: prefixo founding_partner_*. "founder" é o papel da equipe Tipe (app_role) e não é
-- reutilizado. Na interface: "Restaurante Fundador".
--
-- Regras:
--   * Tudo aditivo: só tabelas, funções e gatilhos novos. Nada existente é alterado.
--   * Escrita só pelo servidor (service_role), por funções SECURITY DEFINER que a equipe
--     Tipe aciona depois do guard de founder + 2FA. Nenhuma política de escrita para
--     authenticated ou anon.
--   * Leitura: o restaurante lê só a própria adesão, termos e benefícios (RLS por
--     is_restaurant_member). A equipe Tipe lê tudo com sessão aal2 (2FA).
--   * Transições de estado validadas no banco (gatilho), cada mudança gera evento imutável
--     em founding_partner_events (trilha de auditoria; UPDATE/DELETE recusados).
--   * Regras comerciais (vagas, período, vantagens) nascem VAZIAS. Benefício só entra com
--     regra aprovada e texto idêntico a uma vantagem aprovada. Por padrão: nenhum.
--   * Idempotente (pode ser reaplicada): IF NOT EXISTS, CREATE OR REPLACE, DROP ... IF EXISTS.
--
-- Ligação com o CRM: crm_account_id aponta para crm_restaurant_accounts (proposta em
-- docs/crm/supabase-crm.sql, também não aplicada). Fica sem FK até essa proposta existir no
-- banco; a ligação forte é restaurant_id → restaurants.id (o mesmo platformRestaurantId da
-- conta do CRM, ver src/lib/tipe/crm/adapters.ts).

-- Estados e transições -----------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.founding_partner_transition_allowed(_from text, _to text)
 RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path TO 'public', 'pg_temp' AS $function$
  SELECT (_from, _to) IN (
    ('convidado', 'interessado'), ('convidado', 'encerrado'),
    ('interessado', 'elegivel'), ('interessado', 'encerrado'),
    ('elegivel', 'participante'), ('elegivel', 'interessado'), ('elegivel', 'encerrado'),
    ('participante', 'selecionado_piloto'), ('participante', 'suspenso'), ('participante', 'encerrado'),
    ('selecionado_piloto', 'participante'), ('selecionado_piloto', 'suspenso'), ('selecionado_piloto', 'encerrado'),
    ('suspenso', 'participante'), ('suspenso', 'encerrado'),
    -- Reconvite depois de encerrado (nova rodada, mesma trilha).
    ('encerrado', 'convidado')
  )
$function$;

-- Regras comerciais (uma linha só, vazia por padrão) -------------------------------------

CREATE TABLE IF NOT EXISTS public.founding_partner_rules (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  slots integer CHECK (slots IS NULL OR slots >= 1),
  enrollment_opens_at timestamptz,
  enrollment_closes_at timestamptz,
  advantages text[] NOT NULL DEFAULT '{}',
  terms_version text,
  approved_at timestamptz,
  approved_by uuid REFERENCES auth.users (id),
  approval_ref text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (enrollment_opens_at IS NULL OR enrollment_closes_at IS NULL OR enrollment_opens_at < enrollment_closes_at),
  -- Vantagem sem aprovação registrada não existe.
  CHECK (cardinality(advantages) = 0 OR (approved_at IS NOT NULL AND approval_ref IS NOT NULL))
);
INSERT INTO public.founding_partner_rules (singleton) VALUES (true) ON CONFLICT DO NOTHING;

-- Adesões --------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.founding_partner_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL UNIQUE REFERENCES public.restaurants (id) ON DELETE CASCADE,
  -- crm_restaurant_accounts.id quando a proposta do CRM estiver aplicada (sem FK por ora).
  crm_account_id uuid UNIQUE,
  status text NOT NULL DEFAULT 'convidado' CHECK (status IN (
    'convidado', 'interessado', 'elegivel', 'participante', 'selecionado_piloto', 'suspenso', 'encerrado')),
  created_at timestamptz NOT NULL DEFAULT now(),
  status_changed_at timestamptz NOT NULL DEFAULT now(),
  -- Data de entrada: primeira vez como participante.
  joined_at timestamptz,
  pilot_eligible boolean NOT NULL DEFAULT false,
  pilot_note text,
  created_by uuid REFERENCES auth.users (id),
  CHECK (status NOT IN ('participante', 'selecionado_piloto') OR joined_at IS NOT NULL),
  CHECK (status <> 'selecionado_piloto' OR pilot_eligible)
);
CREATE INDEX IF NOT EXISTS founding_partner_enrollments_status ON public.founding_partner_enrollments (status);

CREATE TABLE IF NOT EXISTS public.founding_partner_terms_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES public.founding_partner_enrollments (id) ON DELETE CASCADE,
  version text NOT NULL CHECK (length(trim(version)) > 0),
  accepted_by_name text NOT NULL CHECK (length(trim(accepted_by_name)) >= 3),
  accepted_at timestamptz NOT NULL DEFAULT now(),
  recorded_by uuid REFERENCES auth.users (id),
  UNIQUE (enrollment_id, version)
);

CREATE TABLE IF NOT EXISTS public.founding_partner_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES public.founding_partner_enrollments (id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('email', 'whatsapp', 'telefone', 'presencial')),
  note text NOT NULL DEFAULT '',
  sent_by uuid REFERENCES auth.users (id),
  sent_at timestamptz NOT NULL DEFAULT now()
);

-- Benefícios EFETIVAMENTE concedidos. Vazio por padrão.
CREATE TABLE IF NOT EXISTS public.founding_partner_benefits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES public.founding_partner_enrollments (id) ON DELETE CASCADE,
  advantage text NOT NULL,
  approval_ref text NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid REFERENCES auth.users (id),
  revoked_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS founding_partner_benefits_active
  ON public.founding_partner_benefits (enrollment_id, advantage) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS public.founding_partner_communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES public.founding_partner_enrollments (id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('email', 'whatsapp', 'telefone', 'presencial')),
  direction text NOT NULL CHECK (direction IN ('enviada', 'recebida')),
  summary text NOT NULL CHECK (length(trim(summary)) >= 5),
  created_by uuid REFERENCES auth.users (id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.founding_partner_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES public.founding_partner_enrollments (id) ON DELETE CASCADE,
  topic text NOT NULL CHECK (topic IN ('produto', 'atendimento', 'implantacao', 'programa', 'outro')),
  body text NOT NULL CHECK (length(trim(body)) >= 5),
  created_by uuid REFERENCES auth.users (id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Trilha de auditoria (append-only).
CREATE TABLE IF NOT EXISTS public.founding_partner_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  enrollment_id uuid NOT NULL REFERENCES public.founding_partner_enrollments (id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('estado', 'termos', 'piloto', 'convite', 'beneficio')),
  from_status text,
  to_status text,
  detail text NOT NULL DEFAULT '',
  actor_id uuid,
  at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS founding_partner_events_enrollment ON public.founding_partner_events (enrollment_id, at);

-- Gatilhos -------------------------------------------------------------------------------

-- Quem fez: o usuário autenticado ou, quando o servidor age com service_role, o ator
-- informado pela função (founding_partner.actor).
CREATE OR REPLACE FUNCTION public.founding_partner_actor()
 RETURNS uuid LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp' AS $function$
  SELECT coalesce(auth.uid(), nullif(current_setting('founding_partner.actor', true), '')::uuid)
$function$;

CREATE OR REPLACE FUNCTION public.founding_partner_enrollment_guard()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
DECLARE
  _rules public.founding_partner_rules;
  _reason text := coalesce(current_setting('founding_partner.reason', true), '');
  _active integer;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'convidado' THEN
      RAISE EXCEPTION 'Restaurante Fundador: toda adesão começa como convidado';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;
  IF NOT public.founding_partner_transition_allowed(OLD.status, NEW.status) THEN
    RAISE EXCEPTION 'Restaurante Fundador: transição % → % não permitida', OLD.status, NEW.status;
  END IF;
  IF (NEW.status IN ('suspenso', 'encerrado') OR (OLD.status = 'elegivel' AND NEW.status = 'interessado'))
     AND length(trim(_reason)) < 3 THEN
    RAISE EXCEPTION 'Restaurante Fundador: informe o motivo da mudança para %', NEW.status;
  END IF;
  SELECT * INTO _rules FROM public.founding_partner_rules WHERE singleton;
  IF NEW.status = 'participante' THEN
    IF _rules.terms_version IS NULL THEN
      RAISE EXCEPTION 'Restaurante Fundador: termos sem versão aprovada';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.founding_partner_terms_acceptances
                   WHERE enrollment_id = NEW.id AND version = _rules.terms_version) THEN
      RAISE EXCEPTION 'Restaurante Fundador: aceite dos termos na versão % é obrigatório', _rules.terms_version;
    END IF;
    IF OLD.status NOT IN ('participante', 'selecionado_piloto') AND _rules.slots IS NOT NULL THEN
      SELECT count(*) INTO _active FROM public.founding_partner_enrollments
       WHERE status IN ('participante', 'selecionado_piloto') AND id <> NEW.id;
      IF _active >= _rules.slots THEN
        RAISE EXCEPTION 'Restaurante Fundador: vagas aprovadas esgotadas';
      END IF;
    END IF;
    NEW.joined_at := coalesce(OLD.joined_at, now());
  END IF;
  IF NEW.status = 'selecionado_piloto' AND NOT NEW.pilot_eligible THEN
    RAISE EXCEPTION 'Restaurante Fundador: conta não marcada como elegível para o piloto';
  END IF;
  NEW.status_changed_at := now();
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.founding_partner_enrollment_audit()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
DECLARE _reason text := coalesce(current_setting('founding_partner.reason', true), '');
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.founding_partner_events (enrollment_id, kind, to_status, detail, actor_id)
    VALUES (NEW.id, 'estado', NEW.status, 'adesão criada', public.founding_partner_actor());
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.founding_partner_events (enrollment_id, kind, from_status, to_status, detail, actor_id)
    VALUES (NEW.id, 'estado', OLD.status, NEW.status, _reason, public.founding_partner_actor());
    -- Encerrar a participação encerra os benefícios concedidos.
    IF NEW.status = 'encerrado' THEN
      UPDATE public.founding_partner_benefits SET revoked_at = now()
       WHERE enrollment_id = NEW.id AND revoked_at IS NULL;
    END IF;
  ELSIF NEW.pilot_eligible IS DISTINCT FROM OLD.pilot_eligible THEN
    INSERT INTO public.founding_partner_events (enrollment_id, kind, detail, actor_id)
    VALUES (NEW.id, 'piloto', CASE WHEN NEW.pilot_eligible THEN 'elegível para o piloto: ' ELSE 'não elegível para o piloto: ' END
            || coalesce(NEW.pilot_note, ''), public.founding_partner_actor());
  END IF;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS founding_partner_enrollment_guard ON public.founding_partner_enrollments;
CREATE TRIGGER founding_partner_enrollment_guard BEFORE INSERT OR UPDATE ON public.founding_partner_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.founding_partner_enrollment_guard();
DROP TRIGGER IF EXISTS founding_partner_enrollment_audit ON public.founding_partner_enrollments;
CREATE TRIGGER founding_partner_enrollment_audit AFTER INSERT OR UPDATE ON public.founding_partner_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.founding_partner_enrollment_audit();

-- Benefício só com regra aprovada, texto idêntico e participante ativo.
CREATE OR REPLACE FUNCTION public.founding_partner_benefit_guard()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
DECLARE _rules public.founding_partner_rules; _status text;
BEGIN
  SELECT * INTO _rules FROM public.founding_partner_rules WHERE singleton;
  IF _rules.approved_at IS NULL OR _rules.approval_ref IS NULL OR NOT (NEW.advantage = ANY (_rules.advantages)) THEN
    RAISE EXCEPTION 'Restaurante Fundador: benefício sem regra comercial aprovada';
  END IF;
  SELECT status INTO _status FROM public.founding_partner_enrollments WHERE id = NEW.enrollment_id;
  IF _status NOT IN ('participante', 'selecionado_piloto') THEN
    RAISE EXCEPTION 'Restaurante Fundador: só participantes recebem benefícios';
  END IF;
  NEW.approval_ref := _rules.approval_ref;
  RETURN NEW;
END $function$;
DROP TRIGGER IF EXISTS founding_partner_benefit_guard ON public.founding_partner_benefits;
CREATE TRIGGER founding_partner_benefit_guard BEFORE INSERT ON public.founding_partner_benefits
  FOR EACH ROW EXECUTE FUNCTION public.founding_partner_benefit_guard();

CREATE OR REPLACE FUNCTION public.founding_partner_child_audit()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
DECLARE r jsonb := to_jsonb(NEW);
BEGIN
  INSERT INTO public.founding_partner_events (enrollment_id, kind, detail, actor_id)
  VALUES (NEW.enrollment_id,
          CASE TG_TABLE_NAME WHEN 'founding_partner_terms_acceptances' THEN 'termos'
                             WHEN 'founding_partner_invites' THEN 'convite' ELSE 'beneficio' END,
          CASE TG_TABLE_NAME WHEN 'founding_partner_terms_acceptances' THEN 'termos versão ' || (r ->> 'version') || ' aceitos por ' || (r ->> 'accepted_by_name')
                             WHEN 'founding_partner_invites' THEN 'convite por ' || (r ->> 'channel')
                             ELSE 'benefício concedido: ' || (r ->> 'advantage') || ' (aprovação ' || (r ->> 'approval_ref') || ')' END,
          public.founding_partner_actor());
  RETURN NEW;
END $function$;
DROP TRIGGER IF EXISTS founding_partner_terms_audit ON public.founding_partner_terms_acceptances;
CREATE TRIGGER founding_partner_terms_audit AFTER INSERT ON public.founding_partner_terms_acceptances
  FOR EACH ROW EXECUTE FUNCTION public.founding_partner_child_audit();
DROP TRIGGER IF EXISTS founding_partner_invites_audit ON public.founding_partner_invites;
CREATE TRIGGER founding_partner_invites_audit AFTER INSERT ON public.founding_partner_invites
  FOR EACH ROW EXECUTE FUNCTION public.founding_partner_child_audit();
DROP TRIGGER IF EXISTS founding_partner_benefits_audit ON public.founding_partner_benefits;
CREATE TRIGGER founding_partner_benefits_audit AFTER INSERT ON public.founding_partner_benefits
  FOR EACH ROW EXECUTE FUNCTION public.founding_partner_child_audit();

-- A trilha não se apaga nem se reescreve (nem pelo servidor).
CREATE OR REPLACE FUNCTION public.founding_partner_events_immutable()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public', 'pg_temp' AS $function$
BEGIN
  -- Única exceção: a exclusão em cascata quando o restaurante (e a adesão) deixa de existir.
  IF TG_OP = 'DELETE' AND TG_TABLE_NAME = 'founding_partner_events'
     AND NOT EXISTS (SELECT 1 FROM public.founding_partner_enrollments WHERE id = OLD.enrollment_id) THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'Restaurante Fundador: a trilha de auditoria é imutável';
END $function$;
DROP TRIGGER IF EXISTS founding_partner_events_immutable ON public.founding_partner_events;
CREATE TRIGGER founding_partner_events_immutable BEFORE UPDATE OR DELETE ON public.founding_partner_events
  FOR EACH ROW EXECUTE FUNCTION public.founding_partner_events_immutable();

-- Histórico das regras comerciais: cada alteração guarda a versão anterior.
CREATE TABLE IF NOT EXISTS public.founding_partner_rules_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  previous jsonb NOT NULL,
  current jsonb NOT NULL,
  actor_id uuid,
  at timestamptz NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION public.founding_partner_rules_audit()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
BEGIN
  NEW.updated_at := now();
  INSERT INTO public.founding_partner_rules_history (previous, current, actor_id)
  VALUES (to_jsonb(OLD), to_jsonb(NEW), public.founding_partner_actor());
  RETURN NEW;
END $function$;
DROP TRIGGER IF EXISTS founding_partner_rules_audit ON public.founding_partner_rules;
CREATE TRIGGER founding_partner_rules_audit BEFORE UPDATE ON public.founding_partner_rules
  FOR EACH ROW EXECUTE FUNCTION public.founding_partner_rules_audit();
DROP TRIGGER IF EXISTS founding_partner_rules_history_immutable ON public.founding_partner_rules_history;
CREATE TRIGGER founding_partner_rules_history_immutable BEFORE UPDATE OR DELETE ON public.founding_partner_rules_history
  FOR EACH ROW EXECUTE FUNCTION public.founding_partner_events_immutable();

-- Funções de escrita (só servidor) ------------------------------------------------------

CREATE OR REPLACE FUNCTION public.founding_partner_set_status(_enrollment uuid, _to text, _reason text, _actor uuid)
 RETURNS public.founding_partner_enrollments LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
DECLARE _row public.founding_partner_enrollments;
BEGIN
  PERFORM set_config('founding_partner.reason', coalesce(_reason, ''), true);
  PERFORM set_config('founding_partner.actor', coalesce(_actor::text, ''), true);
  UPDATE public.founding_partner_enrollments SET status = _to WHERE id = _enrollment RETURNING * INTO _row;
  IF NOT FOUND THEN RAISE EXCEPTION 'Restaurante Fundador: adesão não encontrada'; END IF;
  RETURN _row;
END $function$;

CREATE OR REPLACE FUNCTION public.founding_partner_invite(_restaurant uuid, _crm_account uuid, _channel text, _note text, _actor uuid)
 RETURNS public.founding_partner_enrollments LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
DECLARE _row public.founding_partner_enrollments; _rules public.founding_partner_rules;
BEGIN
  PERFORM set_config('founding_partner.actor', coalesce(_actor::text, ''), true);
  SELECT * INTO _rules FROM public.founding_partner_rules WHERE singleton;
  IF (_rules.enrollment_opens_at IS NOT NULL AND now() < _rules.enrollment_opens_at)
     OR (_rules.enrollment_closes_at IS NOT NULL AND now() > _rules.enrollment_closes_at) THEN
    RAISE EXCEPTION 'Restaurante Fundador: fora do período de inscrição';
  END IF;
  SELECT * INTO _row FROM public.founding_partner_enrollments WHERE restaurant_id = _restaurant FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.founding_partner_enrollments (restaurant_id, crm_account_id, created_by)
    VALUES (_restaurant, _crm_account, _actor) RETURNING * INTO _row;
  ELSIF _row.status = 'encerrado' THEN
    PERFORM set_config('founding_partner.reason', 'novo convite', true);
    UPDATE public.founding_partner_enrollments SET status = 'convidado' WHERE id = _row.id RETURNING * INTO _row;
  ELSE
    RAISE EXCEPTION 'Restaurante Fundador: restaurante já está no programa';
  END IF;
  INSERT INTO public.founding_partner_invites (enrollment_id, channel, note, sent_by)
  VALUES (_row.id, _channel, coalesce(_note, ''), _actor);
  RETURN _row;
END $function$;

-- Privilégios e RLS ----------------------------------------------------------------------

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['founding_partner_rules', 'founding_partner_enrollments', 'founding_partner_terms_acceptances',
    'founding_partner_invites', 'founding_partner_benefits', 'founding_partner_communications',
    'founding_partner_feedback', 'founding_partner_events', 'founding_partner_rules_history']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    -- Equipe Tipe (papel founder) com 2FA lê tudo; nunca escreve direto.
    EXECUTE format('DROP POLICY IF EXISTS "equipe tipe lê" ON public.%I', t);
    EXECUTE format($p$CREATE POLICY "equipe tipe lê" ON public.%I FOR SELECT TO authenticated
      USING (public.has_role(auth.uid(), 'founder') AND coalesce(auth.jwt() ->> 'aal', '') = 'aal2')$p$, t);
  END LOOP;
END $$;
GRANT USAGE, SELECT ON SEQUENCE public.founding_partner_events_id_seq, public.founding_partner_rules_history_id_seq TO service_role;

-- O restaurante lê só a própria adesão, os próprios termos e benefícios.
DROP POLICY IF EXISTS "restaurante lê a própria adesão" ON public.founding_partner_enrollments;
CREATE POLICY "restaurante lê a própria adesão" ON public.founding_partner_enrollments FOR SELECT TO authenticated
  USING (public.is_restaurant_member(auth.uid(), restaurant_id));
DROP POLICY IF EXISTS "restaurante lê os próprios termos" ON public.founding_partner_terms_acceptances;
CREATE POLICY "restaurante lê os próprios termos" ON public.founding_partner_terms_acceptances FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.founding_partner_enrollments e
                 WHERE e.id = enrollment_id AND public.is_restaurant_member(auth.uid(), e.restaurant_id)));
DROP POLICY IF EXISTS "restaurante lê os próprios benefícios" ON public.founding_partner_benefits;
CREATE POLICY "restaurante lê os próprios benefícios" ON public.founding_partner_benefits FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.founding_partner_enrollments e
                 WHERE e.id = enrollment_id AND public.is_restaurant_member(auth.uid(), e.restaurant_id)));
-- Regras vigentes são públicas para restaurantes autenticados (só o que foi aprovado).
DROP POLICY IF EXISTS "restaurantes leem as regras" ON public.founding_partner_rules;
CREATE POLICY "restaurantes leem as regras" ON public.founding_partner_rules FOR SELECT TO authenticated USING (true);

REVOKE ALL ON FUNCTION public.founding_partner_set_status(uuid, text, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.founding_partner_invite(uuid, uuid, text, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.founding_partner_set_status(uuid, text, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.founding_partner_invite(uuid, uuid, text, text, uuid) TO service_role;
