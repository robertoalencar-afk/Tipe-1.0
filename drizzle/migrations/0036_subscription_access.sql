-- Conta do estabelecimento vinculada à assinatura.
--
-- Regra única, no banco: restaurant_access(rid) diz se a conta está liberada
-- ('full'), em carência ('grace', funciona normalmente com aviso) ou bloqueada
-- ('blocked'). Conta bloqueada não abre mesa, conta nem pedido novo. O que já
-- está aberto termina normalmente e o cliente sempre consegue pagar o que deve:
-- nenhum pagamento é recusado por causa da assinatura do restaurante.
--
-- Empresas virtuais de demonstração (teste-tipe, bistro-teste, bar-teste)
-- ficam isentas, para o pitch continuar funcionando.

-- ---------------- Colunas novas ----------------
ALTER TABLE public.restaurant_subscriptions
  ADD COLUMN IF NOT EXISTS past_due_since timestamptz,
  ADD COLUMN IF NOT EXISTS canceled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_reason text CHECK (cancel_reason IS NULL OR length(cancel_reason) <= 300),
  ADD COLUMN IF NOT EXISTS exempt boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS exempt_reason text CHECK (exempt_reason IS NULL OR length(exempt_reason) <= 300);

UPDATE public.restaurant_subscriptions s SET exempt = true, exempt_reason = coalesce(s.exempt_reason, 'Empresa virtual de demonstração')
FROM public.restaurants r
WHERE r.id = s.restaurant_id AND r.slug IN ('teste-tipe', 'bistro-teste', 'bar-teste') AND NOT s.exempt;

-- Módulos que cada plano inclui. Começa vazio: nada muda até o backoffice configurar.
ALTER TABLE public.plan_catalog ADD COLUMN IF NOT EXISTS included_modules text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.plan_catalog DROP CONSTRAINT IF EXISTS plan_catalog_included_modules_check;
ALTER TABLE public.plan_catalog ADD CONSTRAINT plan_catalog_included_modules_check
  CHECK (included_modules <@ ARRAY['order', 'kds', 'totem', 'three_d', 'guest']::text[]);

-- O Tipe Guest passa a ser um módulo contratável como os outros.
ALTER TABLE public.restaurant_modules DROP CONSTRAINT IF EXISTS restaurant_modules_module_check;
ALTER TABLE public.restaurant_modules ADD CONSTRAINT restaurant_modules_module_check
  CHECK (module IN ('order', 'kds', 'totem', 'three_d', 'guest'));


-- ---------------- Toda conta nasce com assinatura ----------------
-- Restaurante sem linha de assinatura ficaria bloqueado; quem for criado por
-- qualquer caminho (cadastro, backoffice) ganha um teste grátis no Essencial (o backoffice muda o plano).
INSERT INTO public.restaurant_subscriptions (restaurant_id, plan, exempt, exempt_reason)
SELECT r.id, 'profissional', r.slug IN ('teste-tipe', 'bistro-teste', 'bar-teste'),
       CASE WHEN r.slug IN ('teste-tipe', 'bistro-teste', 'bar-teste') THEN 'Empresa virtual de demonstração' END
FROM public.restaurants r
WHERE NOT EXISTS (SELECT 1 FROM public.restaurant_subscriptions s WHERE s.restaurant_id = r.id);

CREATE OR REPLACE FUNCTION public.create_default_subscription()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
BEGIN
  INSERT INTO restaurant_subscriptions (restaurant_id, plan, exempt, exempt_reason)
  VALUES (NEW.id, 'essencial', NEW.slug IN ('teste-tipe', 'bistro-teste', 'bar-teste'),
          CASE WHEN NEW.slug IN ('teste-tipe', 'bistro-teste', 'bar-teste') THEN 'Empresa virtual de demonstração' END)
  ON CONFLICT (restaurant_id) DO NOTHING;
  RETURN NEW;
END; $function$;
REVOKE EXECUTE ON FUNCTION public.create_default_subscription() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS create_default_subscription_trg ON public.restaurants;
CREATE TRIGGER create_default_subscription_trg AFTER INSERT ON public.restaurants
  FOR EACH ROW EXECUTE FUNCTION public.create_default_subscription();

-- Cadastro: a linha já existe pelo gatilho; o plano escolhido prevalece.
CREATE OR REPLACE FUNCTION public.signup_restaurant(p_name text, p_slug text, p_plan text, p_tables integer, p_display_name text, p_cnpj text, p_address text, p_phone text)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
DECLARE v_uid uuid := auth.uid(); v_rid uuid; v_email text; v_cnpj text := regexp_replace(coalesce(p_cnpj,''), '\D', '', 'g');
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF p_plan NOT IN ('essencial','profissional','premium') THEN RAISE EXCEPTION 'Plano inválido'; END IF;
  IF p_slug !~ '^[a-z0-9-]{2,64}$' OR p_slug IN ('simulador','entrar','painel','cadastro','termos','api','mesa','reset-password') THEN RAISE EXCEPTION 'Escolha outro endereço'; END IF;
  IF length(trim(coalesce(p_name,''))) < 2 OR p_tables < 1 OR p_tables > 500 THEN RAISE EXCEPTION 'Quantidade de mesas inválida'; END IF;
  IF length(v_cnpj) <> 14 THEN RAISE EXCEPTION 'CNPJ inválido'; END IF;
  IF length(trim(coalesce(p_address,''))) < 8 THEN RAISE EXCEPTION 'Informe o endereço completo'; END IF;
  IF (SELECT count(*) FROM public.user_roles WHERE user_id = v_uid AND role = 'owner') >= 3 THEN RAISE EXCEPTION 'Limite de restaurantes atingido'; END IF;
  IF EXISTS (SELECT 1 FROM public.restaurants WHERE slug = p_slug) THEN RAISE EXCEPTION 'Já existe um restaurante com esse endereço'; END IF;
  IF EXISTS (SELECT 1 FROM public.restaurants WHERE cnpj = v_cnpj) THEN RAISE EXCEPTION 'Já existe um restaurante com esse CNPJ'; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  INSERT INTO public.restaurants (name, slug, pos_provider, cnpj, address, phone, onboarding_step)
  VALUES (left(trim(p_name),80), p_slug, 'none', v_cnpj, left(trim(p_address),160), nullif(left(trim(coalesce(p_phone,'')),30),''), 'pos') RETURNING id INTO v_rid;
  INSERT INTO public.user_roles (user_id, role, restaurant_id) VALUES (v_uid, 'owner', v_rid);
  INSERT INTO public.staff_members (user_id, restaurant_id, display_name, email) VALUES (v_uid, v_rid, left(trim(coalesce(nullif(p_display_name,''), v_email)),80), coalesce(v_email,''));
  INSERT INTO public.restaurant_subscriptions (restaurant_id, plan) VALUES (v_rid, p_plan)
    ON CONFLICT (restaurant_id) DO UPDATE SET plan = EXCLUDED.plan;
  INSERT INTO public.restaurant_tables (restaurant_id, number) SELECT v_rid, g::text FROM generate_series(1, least(p_tables, public.restaurant_table_limit(v_rid))) g;
  RETURN p_slug;
END; $function$;

-- Mudança de módulo aceita o Guest (mesma função da 0027).
CREATE OR REPLACE FUNCTION public.set_restaurant_module(p_rid uuid, p_module text, p_status text, p_reason text, p_actor uuid, p_actor_kind text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
DECLARE v_prev text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM restaurants WHERE id = p_rid) THEN RAISE EXCEPTION 'Restaurante não encontrado'; END IF;
  IF p_module NOT IN ('order', 'kds', 'totem', 'three_d', 'guest') THEN RAISE EXCEPTION 'Módulo inválido'; END IF;
  IF p_status NOT IN ('active', 'suspended', 'cancelled') THEN RAISE EXCEPTION 'Estado inválido'; END IF;
  IF p_status <> 'active' AND nullif(trim(coalesce(p_reason, '')), '') IS NULL THEN RAISE EXCEPTION 'Informe o motivo'; END IF;
  SELECT status INTO v_prev FROM restaurant_modules WHERE restaurant_id = p_rid AND module = p_module FOR UPDATE;
  IF v_prev IS NOT DISTINCT FROM p_status THEN
    RETURN jsonb_build_object('module', p_module, 'status', p_status, 'changed', false);
  END IF;
  INSERT INTO restaurant_modules (restaurant_id, module, status, reason, changed_by, changed_at)
  VALUES (p_rid, p_module, p_status, left(nullif(trim(p_reason), ''), 300), p_actor, now())
  ON CONFLICT (restaurant_id, module) DO UPDATE
    SET status = EXCLUDED.status, reason = EXCLUDED.reason, changed_by = EXCLUDED.changed_by, changed_at = now();
  INSERT INTO restaurant_module_events (restaurant_id, module, from_status, to_status, reason, actor_id, actor_kind)
  VALUES (p_rid, p_module, v_prev, p_status, left(nullif(trim(p_reason), ''), 300), p_actor, coalesce(p_actor_kind, 'system'));
  RETURN jsonb_build_object('module', p_module, 'status', p_status, 'changed', true, 'from', v_prev);
END; $function$;

-- ---------------- Trilha de status (só acrescenta) ----------------
CREATE TABLE IF NOT EXISTS public.subscription_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  from_plan text,
  to_plan text,
  detail text,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS subscription_events_rid ON public.subscription_events (restaurant_id, created_at DESC);
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.subscription_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.subscription_events TO service_role;

-- Marca quando o atraso começou e registra toda mudança de status ou plano.
CREATE OR REPLACE FUNCTION public.track_subscription_status()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
BEGIN
  IF NEW.status = 'past_due' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'past_due') THEN
    NEW.past_due_since := coalesce(NEW.past_due_since, now());
  ELSIF NEW.status <> 'past_due' THEN
    NEW.past_due_since := NULL;
  END IF;
  IF NEW.status = 'canceled' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'canceled') THEN
    NEW.canceled_at := coalesce(NEW.canceled_at, now());
  ELSIF NEW.status <> 'canceled' THEN
    NEW.canceled_at := NULL;
    NEW.cancel_reason := NULL;
  END IF;
  IF TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status OR OLD.plan IS DISTINCT FROM NEW.plan OR OLD.exempt IS DISTINCT FROM NEW.exempt THEN
    INSERT INTO subscription_events (restaurant_id, from_status, to_status, from_plan, to_plan, detail, actor_id)
    VALUES (NEW.restaurant_id,
            CASE WHEN TG_OP = 'UPDATE' THEN OLD.status END, NEW.status,
            CASE WHEN TG_OP = 'UPDATE' THEN OLD.plan END, NEW.plan,
            CASE WHEN TG_OP = 'UPDATE' AND OLD.exempt IS DISTINCT FROM NEW.exempt
                 THEN CASE WHEN NEW.exempt THEN 'isenção ligada' ELSE 'isenção desligada' END END,
            auth.uid());
  END IF;
  RETURN NEW;
END; $function$;
DROP TRIGGER IF EXISTS track_subscription_status_trg ON public.restaurant_subscriptions;
CREATE TRIGGER track_subscription_status_trg BEFORE INSERT OR UPDATE ON public.restaurant_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.track_subscription_status();

-- ---------------- Regra de acesso ----------------
-- Carência: 7 dias de atraso, ou 7 dias depois do fim do teste com cartão já
-- cadastrado (a primeira cobrança pode demorar). Cancelada: vale até o fim do
-- período já pago.
CREATE OR REPLACE FUNCTION public.restaurant_access(p_rid uuid)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
DECLARE s record; v_grace interval := interval '7 days'; v_until timestamptz;
BEGIN
  SELECT * INTO s FROM restaurant_subscriptions WHERE restaurant_id = p_rid;
  IF NOT FOUND THEN RETURN jsonb_build_object('state', 'blocked', 'reason', 'sem_assinatura'); END IF;
  IF s.exempt THEN RETURN jsonb_build_object('state', 'full', 'reason', 'isento'); END IF;
  IF s.status = 'active' THEN RETURN jsonb_build_object('state', 'full', 'reason', 'ativa', 'until', s.current_period_end); END IF;
  IF s.status = 'trialing' THEN
    IF s.trial_ends_at > now() THEN RETURN jsonb_build_object('state', 'full', 'reason', 'teste', 'until', s.trial_ends_at); END IF;
    IF s.provider_subscription_id IS NOT NULL AND s.trial_ends_at + v_grace > now() THEN
      RETURN jsonb_build_object('state', 'grace', 'reason', 'aguardando_cobranca', 'until', s.trial_ends_at + v_grace);
    END IF;
    RETURN jsonb_build_object('state', 'blocked', 'reason', 'teste_encerrado', 'since', s.trial_ends_at);
  END IF;
  IF s.status = 'past_due' THEN
    v_until := coalesce(s.past_due_since, s.updated_at) + v_grace;
    IF v_until > now() THEN RETURN jsonb_build_object('state', 'grace', 'reason', 'pagamento_atrasado', 'until', v_until); END IF;
    RETURN jsonb_build_object('state', 'blocked', 'reason', 'pagamento_atrasado', 'since', v_until);
  END IF;
  IF s.status = 'canceled' THEN
    IF s.current_period_end IS NOT NULL AND s.current_period_end > now() THEN
      RETURN jsonb_build_object('state', 'grace', 'reason', 'cancelada_ate_fim_do_periodo', 'until', s.current_period_end);
    END IF;
    RETURN jsonb_build_object('state', 'blocked', 'reason', 'cancelada', 'since', coalesce(s.canceled_at, s.updated_at));
  END IF;
  IF s.status = 'suspended' THEN RETURN jsonb_build_object('state', 'blocked', 'reason', 'suspensa', 'since', s.updated_at); END IF;
  RETURN jsonb_build_object('state', 'blocked', 'reason', 'teste_encerrado', 'since', s.trial_ends_at);
END; $function$;
REVOKE EXECUTE ON FUNCTION public.restaurant_access(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restaurant_access(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.restaurant_can_operate(p_rid uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
  SELECT (public.restaurant_access(p_rid)->>'state') <> 'blocked'
$function$;
REVOKE EXECUTE ON FUNCTION public.restaurant_can_operate(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restaurant_can_operate(uuid) TO service_role;

-- Membros do restaurante leem o estado de acesso do próprio restaurante.
CREATE OR REPLACE FUNCTION public.my_restaurant_access(p_rid uuid)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
BEGIN
  IF NOT is_restaurant_member(auth.uid(), p_rid) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  RETURN restaurant_access(p_rid);
END; $function$;
REVOKE EXECUTE ON FUNCTION public.my_restaurant_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_restaurant_access(uuid) TO authenticated, service_role;

-- Módulo liberado = conta operando E (linha ativa OU, sem linha, o plano incluir).
-- Linha 'suspended' ou 'cancelled' vence o plano.
CREATE OR REPLACE FUNCTION public.restaurant_has_module(p_rid uuid, p_module text)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
  SELECT public.restaurant_can_operate(p_rid) AND coalesce(
    (SELECT m.status = 'active' FROM restaurant_modules m WHERE m.restaurant_id = p_rid AND m.module = p_module),
    (SELECT p_module = ANY (c.included_modules) FROM restaurant_subscriptions s JOIN plan_catalog c ON c.id = s.plan WHERE s.restaurant_id = p_rid),
    false)
$function$;

-- ---------------- Travas de operação ----------------
-- Pedido novo (garçom, balcão, totem, mesa): só com a conta operando. Pedido
-- para mesa que já tem conta aberta continua, para o salão fechar a noite.
CREATE OR REPLACE FUNCTION public.enforce_subscription_on_order()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
DECLARE v_slug text;
BEGIN
  IF restaurant_can_operate(NEW.restaurant_id) THEN RETURN NEW; END IF;
  IF NEW.table_number IS NOT NULL THEN
    SELECT slug INTO v_slug FROM restaurants WHERE id = NEW.restaurant_id;
    IF EXISTS (SELECT 1 FROM table_bill_items WHERE restaurant_slug = v_slug AND table_number = NEW.table_number) THEN RETURN NEW; END IF;
  END IF;
  RAISE EXCEPTION 'Assinatura inativa: regularize a assinatura da TIPE para abrir novas contas e pedidos';
END; $function$;
DROP TRIGGER IF EXISTS enforce_subscription_on_order_trg ON public.pdv_orders;
CREATE TRIGGER enforce_subscription_on_order_trg BEFORE INSERT ON public.pdv_orders
  FOR EACH ROW EXECUTE FUNCTION public.enforce_subscription_on_order();

-- Conta nova de mesa (inclui a que chega do PDV integrado): mesma regra.
CREATE OR REPLACE FUNCTION public.enforce_subscription_on_bill()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
DECLARE v_rid uuid;
BEGIN
  SELECT id INTO v_rid FROM restaurants WHERE slug = NEW.restaurant_slug;
  IF v_rid IS NULL OR restaurant_can_operate(v_rid) THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM table_bill_items WHERE restaurant_slug = NEW.restaurant_slug AND table_number = NEW.table_number) THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'Assinatura inativa: regularize a assinatura da TIPE para abrir novas contas e pedidos';
END; $function$;
DROP TRIGGER IF EXISTS enforce_subscription_on_bill_trg ON public.table_bill_items;
CREATE TRIGGER enforce_subscription_on_bill_trg BEFORE INSERT ON public.table_bill_items
  FOR EACH ROW EXECUTE FUNCTION public.enforce_subscription_on_bill();

REVOKE EXECUTE ON FUNCTION public.enforce_subscription_on_order() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_subscription_on_bill() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.track_subscription_status() FROM PUBLIC, anon, authenticated;
