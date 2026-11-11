-- Central Tipe: área exclusiva do fundador, com CRM em dados reais.
--
-- Tudo aqui é lido só pelo founder (papel global + 2FA) e escrito só pelo servidor
-- (service_role) depois de requireFounder2fa. Restaurantes nunca enxergam estas tabelas.
-- Nenhuma mensagem externa é disparada por este arquivo: as automações registram
-- a execução e preparam rascunhos; enviar é sempre uma ação humana aprovada.

-- ---------------- Lead = início da ficha única do restaurante ----------------
ALTER TABLE public.restaurant_leads
  ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS restaurant_leads_restaurant_idx ON public.restaurant_leads (restaurant_id);
CREATE INDEX IF NOT EXISTS restaurant_leads_phone_idx ON public.restaurant_leads ((regexp_replace(coalesce(phone, ''), '\D', '', 'g')));

-- ---------------- Funil configurável ----------------
CREATE TABLE IF NOT EXISTS public.crm_stages (
  key text PRIMARY KEY CHECK (key ~ '^[a-z_]{2,40}$'),
  label text NOT NULL CHECK (length(label) BETWEEN 2 AND 60),
  position integer NOT NULL,
  kind text NOT NULL DEFAULT 'open' CHECK (kind IN ('open', 'won', 'lost')),
  active boolean NOT NULL DEFAULT true,
  -- Status legado de restaurant_leads.status que esta etapa representa (compatibilidade com /admin/leads).
  legacy_status text
);
INSERT INTO public.crm_stages (key, label, position, kind, legacy_status) VALUES
  ('novo_lead', 'Novo lead', 10, 'open', 'novo'),
  ('primeiro_contato', 'Primeiro contato', 20, 'open', 'contatado'),
  ('qualificado', 'Qualificado', 30, 'open', 'contatado'),
  ('demo_agendada', 'Demonstração agendada', 40, 'open', 'demo_agendada'),
  ('demo_realizada', 'Demonstração realizada', 50, 'open', 'demo_feita'),
  ('proposta', 'Proposta enviada', 60, 'open', 'demo_feita'),
  ('negociacao', 'Negociação', 70, 'open', 'demo_feita'),
  ('implantacao', 'Implantação', 80, 'open', 'piloto'),
  ('cliente_ativo', 'Cliente ativo', 90, 'won', 'cliente'),
  ('perdido', 'Perdido', 100, 'lost', 'perdido')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.crm_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.restaurant_leads(id) ON DELETE CASCADE,
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (length(title) BETWEEN 2 AND 160),
  stage_key text NOT NULL REFERENCES public.crm_stages(key),
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  value_cents integer CHECK (value_cents IS NULL OR value_cents >= 0),
  source text,
  next_task_at timestamptz,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'won', 'lost')),
  lost_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS crm_opportunities_open_lead_idx ON public.crm_opportunities (lead_id) WHERE status = 'open' AND lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS crm_opportunities_stage_idx ON public.crm_opportunities (stage_key, status);

CREATE TABLE IF NOT EXISTS public.crm_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.restaurant_leads(id) ON DELETE CASCADE,
  opportunity_id uuid REFERENCES public.crm_opportunities(id) ON DELETE CASCADE,
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('note', 'stage', 'email', 'whatsapp', 'task', 'system', 'call', 'meeting')),
  title text NOT NULL CHECK (length(title) <= 200),
  body text CHECK (body IS NULL OR length(body) <= 8000),
  actor_id uuid,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crm_activities_lead_idx ON public.crm_activities (lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS crm_activities_rest_idx ON public.crm_activities (restaurant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.crm_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.restaurant_leads(id) ON DELETE CASCADE,
  opportunity_id uuid REFERENCES public.crm_opportunities(id) ON DELETE CASCADE,
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (length(title) BETWEEN 2 AND 200),
  due_at timestamptz,
  done_at timestamptz,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crm_tasks_open_idx ON public.crm_tasks (due_at) WHERE done_at IS NULL;

-- ---------------- Comunicação ----------------
-- Cada e-mail que o servidor envia pelo Resend fica aqui; o webhook do Resend atualiza o status.
CREATE TABLE IF NOT EXISTS public.email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template text NOT NULL,
  to_email text NOT NULL,
  subject text,
  resend_id text UNIQUE,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'delivery_delayed', 'bounced', 'complained', 'opened', 'clicked', 'failed', 'suppressed')),
  error text,
  lead_id uuid REFERENCES public.restaurant_leads(id) ON DELETE SET NULL,
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS email_log_to_idx ON public.email_log (lower(to_email), created_at DESC);

-- Eventos do webhook do Resend: idempotência por id do evento.
CREATE TABLE IF NOT EXISTS public.email_events (
  id text PRIMARY KEY,
  type text NOT NULL,
  resend_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- WhatsApp Business (Cloud API oficial da Meta). Conversa = um número do cliente.
CREATE TABLE IF NOT EXISTS public.wa_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE CHECK (phone ~ '^[0-9]{8,15}$'),
  name text,
  lead_id uuid REFERENCES public.restaurant_leads(id) ON DELETE SET NULL,
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'waiting', 'resolved')),
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  labels text[] NOT NULL DEFAULT '{}',
  unread integer NOT NULL DEFAULT 0,
  last_message_at timestamptz,
  last_inbound_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.wa_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.wa_conversations(id) ON DELETE CASCADE,
  wa_message_id text UNIQUE,
  direction text NOT NULL CHECK (direction IN ('in', 'out')),
  type text NOT NULL DEFAULT 'text',
  body text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'queued', 'sent', 'delivered', 'read', 'failed')),
  error text,
  sender_id uuid,
  at timestamptz NOT NULL DEFAULT now(),
  raw jsonb
);
CREATE INDEX IF NOT EXISTS wa_messages_conv_idx ON public.wa_messages (conversation_id, at);

-- ---------------- Implantação (jornada lead -> restaurante operando) ----------------
CREATE TABLE IF NOT EXISTS public.implantation_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  key text NOT NULL,
  label text NOT NULL,
  position integer NOT NULL,
  done_at timestamptz,
  done_by uuid,
  responsible_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text CHECK (notes IS NULL OR length(notes) <= 1000),
  UNIQUE (restaurant_id, key)
);

CREATE OR REPLACE FUNCTION public.implantation_seed(p_rid uuid)
 RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
  INSERT INTO public.implantation_steps (restaurant_id, key, label, position)
  SELECT p_rid, k, l, p FROM (VALUES
    ('contrato', 'Contrato e plano definidos', 10),
    ('cadastro', 'Restaurante cadastrado e administrador com acesso', 20),
    ('equipe', 'Equipe cadastrada (gerente, caixa, garçons)', 30),
    ('cardapio', 'Cardápio ou PDV conectado', 40),
    ('mesas', 'Mesas e QR Codes configurados', 50),
    ('recebimentos', 'Conta de recebimento aprovada', 60),
    ('treinamento', 'Treinamento da equipe', 70),
    ('primeira_conta', 'Primeira conta paga pela Tipe', 80)
  ) AS s(k, l, p)
  ON CONFLICT (restaurant_id, key) DO NOTHING;
$$;
REVOKE EXECUTE ON FUNCTION public.implantation_seed(uuid) FROM PUBLIC, anon, authenticated;

-- ---------------- Automações da Central ----------------
CREATE TABLE IF NOT EXISTS public.automation_rules (
  key text PRIMARY KEY,
  label text NOT NULL,
  trigger_event text NOT NULL,
  description text,
  enabled boolean NOT NULL DEFAULT true,
  -- Ações internas (registrar, criar tarefa, preparar rascunho). Nunca envia nada externo.
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
INSERT INTO public.automation_rules (key, label, trigger_event, description, actions) VALUES
  ('lead_novo', 'Lead novo', 'lead.created', 'Registra no CRM, cria a oportunidade em "Novo lead", cria a tarefa de primeiro contato e prepara a mensagem inicial como rascunho.', '["crm.opportunity", "crm.task:primeiro_contato", "draft.whatsapp"]'),
  ('demo_agendada', 'Demonstração agendada', 'opportunity.stage:demo_agendada', 'Cria tarefa de confirmação e prepara o e-mail de confirmação como rascunho.', '["crm.task:confirmar_demo", "draft.email:confirmacao_demo"]'),
  ('demo_realizada', 'Demonstração realizada', 'opportunity.stage:demo_realizada', 'Cria acompanhamento em 2 dias e prepara a proposta como rascunho.', '["crm.task:acompanhamento", "draft.email:proposta"]'),
  ('cliente_contratado', 'Cliente contratado', 'opportunity.stage:implantacao', 'Vincula ao cadastro do restaurante e inicia o checklist de implantação.', '["implantation.seed", "crm.task:kickoff"]'),
  ('restaurante_erro', 'Restaurante com erro', 'restaurant.integration_error', 'Registra a ocorrência e alerta o fundador.', '["crm.activity:system", "alert.founder"]')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.automation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key text NOT NULL REFERENCES public.automation_rules(key) ON DELETE CASCADE,
  trigger_ref text,
  status text NOT NULL CHECK (status IN ('ok', 'failed', 'skipped')),
  detail text,
  attempts integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS automation_runs_rule_idx ON public.automation_runs (rule_key, created_at DESC);

-- ---------------- Assistente do fundador (Lebre administrativa) ----------------
CREATE TABLE IF NOT EXISTS public.founder_assistant_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  question text NOT NULL CHECK (length(question) <= 4000),
  answer text,
  tools jsonb NOT NULL DEFAULT '[]'::jsonb,
  provider text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------- Lead novo: automação "lead_novo" direto no banco ----------------
-- Toda inserção em restaurant_leads vira uma oportunidade e uma tarefa; o rascunho da
-- mensagem inicial fica registrado como atividade (ninguém manda nada sozinho).
CREATE OR REPLACE FUNCTION public.crm_on_lead_created()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
DECLARE
  v_opp uuid;
  v_on boolean;
BEGIN
  SELECT enabled INTO v_on FROM automation_rules WHERE key = 'lead_novo';
  IF v_on IS DISTINCT FROM true THEN
    INSERT INTO automation_runs (rule_key, trigger_ref, status, detail) VALUES ('lead_novo', NEW.id::text, 'skipped', 'automação desligada');
    RETURN NEW;
  END IF;
  INSERT INTO crm_opportunities (lead_id, title, stage_key, source, next_task_at)
  VALUES (NEW.id, NEW.restaurant_name, 'novo_lead', coalesce(NEW.utm_source, NEW.origin_page, 'site'), now() + interval '1 day')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_opp;
  IF v_opp IS NULL THEN RETURN NEW; END IF;
  INSERT INTO crm_tasks (lead_id, opportunity_id, title, due_at)
  VALUES (NEW.id, v_opp, 'Primeiro contato com ' || NEW.contact_name, now() + interval '1 day');
  INSERT INTO crm_activities (lead_id, opportunity_id, kind, title, body, meta)
  VALUES (NEW.id, v_opp, 'system', 'Lead entrou pelo site',
          'Rascunho da mensagem inicial preparado. Enviar é uma ação manual.',
          jsonb_build_object('draft', format('Olá, %s! Aqui é da Tipe. Vi que o %s entrou na nossa lista. Podemos agendar uma demonstração rápida?', split_part(NEW.contact_name, ' ', 1), NEW.restaurant_name)));
  INSERT INTO automation_runs (rule_key, trigger_ref, status, detail) VALUES ('lead_novo', NEW.id::text, 'ok', 'oportunidade + tarefa + rascunho');
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO automation_runs (rule_key, trigger_ref, status, detail) VALUES ('lead_novo', NEW.id::text, 'failed', left(SQLERRM, 300));
  RETURN NEW;
END; $function$;
REVOKE EXECUTE ON FUNCTION public.crm_on_lead_created() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS crm_on_lead_created_trg ON public.restaurant_leads;
CREATE TRIGGER crm_on_lead_created_trg AFTER INSERT ON public.restaurant_leads
  FOR EACH ROW EXECUTE FUNCTION public.crm_on_lead_created();

-- Leads que já existiam entram no funil na etapa equivalente ao status antigo.
INSERT INTO public.crm_opportunities (lead_id, title, stage_key, source, status, created_at)
SELECT l.id, l.restaurant_name,
       coalesce((SELECT s.key FROM public.crm_stages s WHERE s.legacy_status = l.status ORDER BY s.position LIMIT 1), 'novo_lead'),
       coalesce(l.utm_source, l.origin_page, 'site'),
       CASE l.status WHEN 'cliente' THEN 'won' WHEN 'perdido' THEN 'lost' ELSE 'open' END,
       l.created_at
FROM public.restaurant_leads l
WHERE NOT EXISTS (SELECT 1 FROM public.crm_opportunities o WHERE o.lead_id = l.id);

-- ---------------- Segurança: só o fundador lê, só o servidor escreve ----------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['crm_stages', 'crm_opportunities', 'crm_activities', 'crm_tasks', 'email_log', 'email_events',
                           'wa_conversations', 'wa_messages', 'implantation_steps', 'automation_rules', 'automation_runs', 'founder_assistant_log'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('DROP POLICY IF EXISTS founder_reads ON public.%I', t);
    EXECUTE format('CREATE POLICY founder_reads ON public.%I FOR SELECT TO authenticated USING (public.has_role(auth.uid(), ''founder''))', t);
    EXECUTE format('DROP POLICY IF EXISTS mfa_if_enrolled ON public.%I', t);
    EXECUTE format('CREATE POLICY mfa_if_enrolled ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING ((SELECT public.mfa_session_ok()))', t);
  END LOOP;
END $$;
