-- Permissões por funcionário, decididas pelo administrador na aba Equipe.
-- 1) Cada pessoa pode GANHAR (allowed = true) ou PERDER (allowed = false) permissões do papel.
-- 2) Teto por papel: o garçom nunca recebe poderes de caixa, relatórios ou painel financeiro,
--    nem por concessão. Para isso o administrador muda o papel para Caixa ou Gerente.
-- 3) Caixa é aplicado no banco: abrir/movimentar/fechar caixa, confirmar pagamento no local e
--    tirar taxa de serviço exigem caixa.operar de quem está logado (gatilhos abaixo), seja qual for a rota.
-- Espelha src/lib/tipe/permissoes.ts. Idempotente.

ALTER TABLE public.restaurant_permission_grants ADD COLUMN IF NOT EXISTS allowed boolean NOT NULL DEFAULT true;

-- Matriz padrão ajustada à operação real: o caixa já cancela venda de balcão (pdv_counter_cancel);
-- 'equipe.ver' nunca foi aplicada (equipe é só do administrador) e sai do catálogo.
INSERT INTO public.role_permissions (role, permission) VALUES ('cashier', 'pedidos.cancelar') ON CONFLICT DO NOTHING;
DELETE FROM public.role_permissions WHERE permission = 'equipe.ver';

-- Catálogo de permissões do restaurante (mesma lista de PERMISSOES em permissoes.ts).
CREATE OR REPLACE FUNCTION public.restaurant_permission_catalog()
 RETURNS text[] LANGUAGE sql IMMUTABLE SET search_path TO 'public', 'pg_temp' AS $function$
  SELECT ARRAY['dashboard.ver','salao.ver','salao.operar','pedidos.ver','pedidos.lancar','pedidos.cancelar',
               'caixa.ver','caixa.operar','cozinha.ver','relatorios.ver']
$function$;

-- Até onde cada papel pode chegar com concessões. Garçom: só o próprio atendimento.
CREATE OR REPLACE FUNCTION public.permission_within_role_ceiling(_role text, _perm text)
 RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path TO 'public', 'pg_temp' AS $function$
  SELECT CASE _role
    WHEN 'owner' THEN true
    WHEN 'waiter' THEN _perm = ANY (ARRAY['salao.ver','pedidos.ver','pedidos.lancar'])
    WHEN 'cashier' THEN _perm = ANY (public.restaurant_permission_catalog())
    WHEN 'manager' THEN _perm = ANY (public.restaurant_permission_catalog())
    ELSE false
  END
$function$;

-- Administrador: tudo. Demais: (padrão do papel OU concessão dentro do teto) E não removida.
CREATE OR REPLACE FUNCTION public.restaurant_can(_user_id uuid, _restaurant_id uuid, _perm text)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id AND ur.restaurant_id = _restaurant_id
      AND NOT EXISTS (SELECT 1 FROM public.staff_members sm WHERE sm.user_id = ur.user_id AND sm.restaurant_id = ur.restaurant_id AND sm.suspended_at IS NOT NULL)
      AND (_user_id IS DISTINCT FROM auth.uid() OR public.mfa_session_ok())
      AND (ur.role::text = 'owner'
        OR (NOT EXISTS (SELECT 1 FROM public.restaurant_permission_grants g
                        WHERE g.user_id = ur.user_id AND g.restaurant_id = ur.restaurant_id AND g.permission = _perm AND g.allowed = false)
            AND (EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role = ur.role AND rp.permission = _perm)
              OR (public.permission_within_role_ceiling(ur.role::text, _perm)
                  AND EXISTS (SELECT 1 FROM public.restaurant_permission_grants g
                              WHERE g.user_id = ur.user_id AND g.restaurant_id = ur.restaurant_id AND g.permission = _perm AND g.allowed = true))))))
$function$;
REVOKE EXECUTE ON FUNCTION public.restaurant_can(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restaurant_can(uuid, uuid, text) TO authenticated, service_role;

-- Permissões efetivas de quem está logado, para o painel mostrar só o que a pessoa pode usar.
CREATE OR REPLACE FUNCTION public.my_restaurant_permissions(_restaurant_id uuid)
 RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
  SELECT COALESCE(array_agg(p ORDER BY p), ARRAY[]::text[])
  FROM unnest(public.restaurant_permission_catalog()) p
  WHERE auth.uid() IS NOT NULL AND public.restaurant_can(auth.uid(), _restaurant_id, p)
$function$;
REVOKE EXECUTE ON FUNCTION public.my_restaurant_permissions(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_restaurant_permissions(uuid) TO authenticated, service_role;

-- Gatilho: quem está logado e é da equipe do restaurante só mexe no caixa com caixa.operar.
-- Rotas do servidor com service_role (webhooks, PDV) não têm auth.uid() e seguem sem mudança.
CREATE OR REPLACE FUNCTION public.enforce_cash_permission()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
DECLARE v_uid uuid := auth.uid(); v_rid uuid;
BEGIN
  IF v_uid IS NULL THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME = 'table_payment_requests' THEN
    -- Só a decisão do caixa sobre um pagamento pendente (confirmar ou recusar).
    IF OLD.status IS DISTINCT FROM 'pending' OR NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
    SELECT id INTO v_rid FROM restaurants WHERE slug = NEW.restaurant_slug;
  ELSE
    v_rid := NEW.restaurant_id;
  END IF;
  IF v_rid IS NULL THEN RETURN NEW; END IF;
  -- Quem não é da equipe já é barrado pelas funções e políticas existentes.
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = v_uid AND restaurant_id = v_rid) THEN RETURN NEW; END IF;
  IF NOT public.restaurant_can(v_uid, v_rid, 'caixa.operar') THEN
    RAISE EXCEPTION 'Sem permissão: sua função não opera o caixa' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $function$;
REVOKE EXECUTE ON FUNCTION public.enforce_cash_permission() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS cash_sessions_permission ON public.cash_sessions;
CREATE TRIGGER cash_sessions_permission BEFORE INSERT OR UPDATE ON public.cash_sessions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_cash_permission();
DROP TRIGGER IF EXISTS cash_movements_permission ON public.cash_movements;
CREATE TRIGGER cash_movements_permission BEFORE INSERT ON public.cash_movements
  FOR EACH ROW EXECUTE FUNCTION public.enforce_cash_permission();
DROP TRIGGER IF EXISTS service_fee_waivers_permission ON public.service_fee_waivers;
CREATE TRIGGER service_fee_waivers_permission BEFORE INSERT ON public.service_fee_waivers
  FOR EACH ROW EXECUTE FUNCTION public.enforce_cash_permission();
DROP TRIGGER IF EXISTS table_payment_requests_cash_permission ON public.table_payment_requests;
CREATE TRIGGER table_payment_requests_cash_permission BEFORE UPDATE OF status ON public.table_payment_requests
  FOR EACH ROW EXECUTE FUNCTION public.enforce_cash_permission();
