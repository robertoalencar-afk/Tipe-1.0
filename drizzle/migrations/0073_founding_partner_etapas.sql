-- Restaurante Fundador: etapas novas do Tipe Reserva (decisão do Roberto, 2026-11-16).
-- Trilha: interessado → selecionado → em_implantacao → em_testes → piloto → apto → ativo,
-- mais suspenso e encerrado. Mapeia os dados da 0041 sem apagar nada:
--   convidado, interessado → interessado · elegivel → selecionado
--   participante → em_implantacao · selecionado_piloto → piloto
-- A trilha de auditoria guarda a troca (motivo "migração 0073"). Idempotente.

-- 1) Tira as checagens antigas de estado (nomes automáticos, por isso a busca).
DO $$
DECLARE c record;
BEGIN
  FOR c IN SELECT conname FROM pg_constraint
            WHERE conrelid = 'public.founding_partner_enrollments'::regclass AND contype = 'c'
              AND pg_get_constraintdef(oid) LIKE '%status%' LOOP
    EXECUTE format('ALTER TABLE public.founding_partner_enrollments DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

-- 2) Transições novas. Avança uma etapa por vez; volta uma etapa com motivo; ativa ↔ suspenso;
-- qualquer uma → encerrado; encerrado → interessado (nova rodada).
CREATE OR REPLACE FUNCTION public.founding_partner_transition_allowed(_from text, _to text)
 RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path TO 'public', 'pg_temp' AS $function$
  SELECT (_from, _to) IN (
    ('interessado', 'selecionado'),
    ('selecionado', 'em_implantacao'), ('selecionado', 'interessado'),
    ('em_implantacao', 'em_testes'), ('em_implantacao', 'selecionado'),
    ('em_testes', 'piloto'), ('em_testes', 'em_implantacao'),
    ('piloto', 'apto'), ('piloto', 'em_testes'),
    ('apto', 'ativo'), ('apto', 'piloto'),
    ('ativo', 'apto'),
    ('em_implantacao', 'suspenso'), ('em_testes', 'suspenso'), ('piloto', 'suspenso'),
    ('apto', 'suspenso'), ('ativo', 'suspenso'),
    ('suspenso', 'em_implantacao'), ('suspenso', 'em_testes'), ('suspenso', 'piloto'),
    ('suspenso', 'apto'), ('suspenso', 'ativo'),
    ('interessado', 'encerrado'), ('selecionado', 'encerrado'), ('em_implantacao', 'encerrado'),
    ('em_testes', 'encerrado'), ('piloto', 'encerrado'), ('apto', 'encerrado'), ('ativo', 'encerrado'),
    ('suspenso', 'encerrado'),
    ('encerrado', 'interessado')
  )
$function$;

-- Etapa e posição: quem já está dentro do programa (termos aceitos, vaga ocupada, benefício).
CREATE OR REPLACE FUNCTION public.founding_partner_stage_rank(_s text)
 RETURNS integer LANGUAGE sql IMMUTABLE SET search_path TO 'public', 'pg_temp' AS $function$
  SELECT array_position(ARRAY['interessado','selecionado','em_implantacao','em_testes','piloto','apto','ativo'], _s)
$function$;

CREATE OR REPLACE FUNCTION public.founding_partner_is_active(_s text)
 RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path TO 'public', 'pg_temp' AS $function$
  SELECT _s IN ('em_implantacao', 'em_testes', 'piloto', 'apto', 'ativo')
$function$;

-- 3) Guarda nova.
CREATE OR REPLACE FUNCTION public.founding_partner_enrollment_guard()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
DECLARE
  _rules public.founding_partner_rules;
  _reason text := coalesce(current_setting('founding_partner.reason', true), '');
  _active integer;
  _back boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'interessado' THEN
      RAISE EXCEPTION 'Restaurante Fundador: toda adesão começa como interessado';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;
  IF NOT public.founding_partner_transition_allowed(OLD.status, NEW.status) THEN
    RAISE EXCEPTION 'Restaurante Fundador: transição % → % não permitida', OLD.status, NEW.status;
  END IF;
  _back := public.founding_partner_stage_rank(NEW.status) < public.founding_partner_stage_rank(OLD.status);
  IF (NEW.status IN ('suspenso', 'encerrado') OR _back) AND length(trim(_reason)) < 3 THEN
    RAISE EXCEPTION 'Restaurante Fundador: informe o motivo da mudança para %', NEW.status;
  END IF;
  SELECT * INTO _rules FROM public.founding_partner_rules WHERE singleton;
  -- Entrar no programa (implantação) exige termos aceitos e vaga.
  IF NEW.status = 'em_implantacao' AND OLD.status = 'selecionado' THEN
    IF _rules.terms_version IS NULL THEN
      RAISE EXCEPTION 'Restaurante Fundador: termos sem versão aprovada';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.founding_partner_terms_acceptances
                   WHERE enrollment_id = NEW.id AND version = _rules.terms_version) THEN
      RAISE EXCEPTION 'Restaurante Fundador: aceite dos termos na versão % é obrigatório', _rules.terms_version;
    END IF;
    IF _rules.slots IS NOT NULL THEN
      SELECT count(*) INTO _active FROM public.founding_partner_enrollments
       WHERE public.founding_partner_is_active(status) AND id <> NEW.id;
      IF _active >= _rules.slots THEN
        RAISE EXCEPTION 'Restaurante Fundador: vagas aprovadas esgotadas';
      END IF;
    END IF;
  END IF;
  IF public.founding_partner_is_active(NEW.status) THEN
    NEW.joined_at := coalesce(OLD.joined_at, now());
  END IF;
  IF NEW.status = 'piloto' AND NOT NEW.pilot_eligible THEN
    RAISE EXCEPTION 'Restaurante Fundador: conta não marcada como elegível para o piloto';
  END IF;
  NEW.status_changed_at := now();
  RETURN NEW;
END $function$;

-- 4) Dados: mapeia sem passar pela guarda (a auditoria registra cada troca).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.founding_partner_enrollments
              WHERE status IN ('convidado', 'elegivel', 'participante', 'selecionado_piloto')) THEN
    PERFORM set_config('founding_partner.reason', 'migração 0073: etapas novas do Tipe Reserva', true);
    ALTER TABLE public.founding_partner_enrollments DISABLE TRIGGER founding_partner_enrollment_guard;
    UPDATE public.founding_partner_enrollments SET status = CASE status
        WHEN 'convidado' THEN 'interessado'
        WHEN 'elegivel' THEN 'selecionado'
        WHEN 'participante' THEN 'em_implantacao'
        WHEN 'selecionado_piloto' THEN 'piloto' END,
      joined_at = CASE WHEN status IN ('participante', 'selecionado_piloto') THEN coalesce(joined_at, now()) ELSE joined_at END
     WHERE status IN ('convidado', 'elegivel', 'participante', 'selecionado_piloto');
    ALTER TABLE public.founding_partner_enrollments ENABLE TRIGGER founding_partner_enrollment_guard;
  END IF;
END $$;

-- 5) Checagens novas (com nome, para reaplicar).
ALTER TABLE public.founding_partner_enrollments ALTER COLUMN status SET DEFAULT 'interessado';
ALTER TABLE public.founding_partner_enrollments
  ADD CONSTRAINT founding_partner_enrollments_status_etapa CHECK (status IN (
    'interessado', 'selecionado', 'em_implantacao', 'em_testes', 'piloto', 'apto', 'ativo', 'suspenso', 'encerrado')),
  ADD CONSTRAINT founding_partner_enrollments_joined CHECK (NOT public.founding_partner_is_active(status) OR joined_at IS NOT NULL),
  ADD CONSTRAINT founding_partner_enrollments_piloto CHECK (status <> 'piloto' OR pilot_eligible);

-- 6) Benefício: só quem está dentro do programa.
CREATE OR REPLACE FUNCTION public.founding_partner_benefit_guard()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
DECLARE _rules public.founding_partner_rules; _status text;
BEGIN
  SELECT * INTO _rules FROM public.founding_partner_rules WHERE singleton;
  IF _rules.approved_at IS NULL OR _rules.approval_ref IS NULL OR NOT (NEW.advantage = ANY (_rules.advantages)) THEN
    RAISE EXCEPTION 'Restaurante Fundador: benefício sem regra comercial aprovada';
  END IF;
  SELECT status INTO _status FROM public.founding_partner_enrollments WHERE id = NEW.enrollment_id;
  IF NOT coalesce(public.founding_partner_is_active(_status), false) THEN
    RAISE EXCEPTION 'Restaurante Fundador: só participantes recebem benefícios';
  END IF;
  NEW.approval_ref := _rules.approval_ref;
  RETURN NEW;
END $function$;

-- 7) Reconvite volta para interessado.
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
    UPDATE public.founding_partner_enrollments SET status = 'interessado' WHERE id = _row.id RETURNING * INTO _row;
  ELSE
    RAISE EXCEPTION 'Restaurante Fundador: restaurante já está no programa';
  END IF;
  INSERT INTO public.founding_partner_invites (enrollment_id, channel, note, sent_by)
  VALUES (_row.id, _channel, coalesce(_note, ''), _actor);
  RETURN _row;
END $function$;

REVOKE ALL ON FUNCTION public.founding_partner_stage_rank(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.founding_partner_is_active(text) FROM PUBLIC, anon;
