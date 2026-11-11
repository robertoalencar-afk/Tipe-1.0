-- Tipe Guest Manager · permissões da equipe (Projeto 4). PROPOSTA PARA REVISÃO: não aplicar em
-- produção sem ok do Roberto. Não mexe no enum app_role nem nas regras de gorjeta.
-- Espelha src/lib/tipe/guest/permissoes.ts. Idempotente.

-- Gerente = papel 'manager' do app_role (criado na 0050, PR #106). Comparado como texto para
-- esta migração aplicar mesmo antes da 0050.

-- "Conforme autorização" / "permissão explícita": concessão por pessoa e ação.
CREATE TABLE IF NOT EXISTS public.guest_staff_grants (
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN (
    'ver_reservas','criar_reserva','confirmar_chegada','atribuir_mesa','gerenciar_espera',
    'alterar_disponibilidade','configurar_politicas','ver_relatorios','gerenciar_experiencias',
    'ver_perfil_cliente')),
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (restaurant_id, user_id, action)
);

ALTER TABLE public.guest_staff_grants ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.guest_staff_grants FROM PUBLIC, anon, authenticated;

-- Papel no Guest: dono > gerente > caixa > garçom. Nulo = sem acesso.
CREATE OR REPLACE FUNCTION public.guest_staff_role(p_restaurant_id uuid, p_user_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM user_roles WHERE user_id = p_user_id AND restaurant_id = p_restaurant_id AND role = 'owner') THEN 'admin'
    WHEN EXISTS (SELECT 1 FROM user_roles WHERE user_id = p_user_id AND restaurant_id = p_restaurant_id AND role::text = 'manager') THEN 'gerente'
    WHEN EXISTS (SELECT 1 FROM user_roles WHERE user_id = p_user_id AND restaurant_id = p_restaurant_id AND role = 'cashier') THEN 'caixa'
    WHEN EXISTS (SELECT 1 FROM user_roles WHERE user_id = p_user_id AND restaurant_id = p_restaurant_id AND role = 'waiter') THEN 'garcom'
  END
$$;

CREATE OR REPLACE FUNCTION public.guest_staff_can(p_restaurant_id uuid, p_user_id uuid, p_action text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r text := guest_staff_role(p_restaurant_id, p_user_id); rule text;
BEGIN
  IF r IS NULL THEN RETURN false; END IF;
  rule := (CASE p_action
    WHEN 'ver_reservas'           THEN (ARRAY['sim','sim','concedivel','sim'])
    WHEN 'criar_reserva'          THEN (ARRAY['sim','sim','concedivel','concedivel'])
    WHEN 'confirmar_chegada'      THEN (ARRAY['sim','sim','concedivel','concedivel'])
    WHEN 'atribuir_mesa'          THEN (ARRAY['sim','sim','concedivel','concedivel'])
    WHEN 'gerenciar_espera'       THEN (ARRAY['sim','sim','concedivel','nao'])
    WHEN 'alterar_disponibilidade' THEN (ARRAY['sim','concedivel','nao','nao'])
    WHEN 'configurar_politicas'   THEN (ARRAY['sim','concedivel','nao','nao'])
    WHEN 'ver_relatorios'         THEN (ARRAY['sim','sim','sim','nao'])
    WHEN 'gerenciar_experiencias' THEN (ARRAY['sim','concedivel','nao','nao'])
    WHEN 'ver_perfil_cliente'     THEN (ARRAY['sim','sim','sim','sim'])
  END)[array_position(ARRAY['admin','gerente','caixa','garcom'], r)];
  IF rule = 'sim' THEN RETURN true; END IF;
  RETURN rule = 'concedivel' AND EXISTS (
    SELECT 1 FROM guest_staff_grants WHERE restaurant_id = p_restaurant_id AND user_id = p_user_id AND action = p_action);
END $$;

-- Só o administrador (dono) concede ou tira. Concessão a quem não é da equipe falha.
CREATE OR REPLACE FUNCTION public.guest_staff_grant(p_restaurant_id uuid, p_actor uuid, p_user_id uuid, p_action text, p_on boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF guest_staff_role(p_restaurant_id, p_actor) IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'guest_staff_grant: só o administrador concede permissões';
  END IF;
  IF guest_staff_role(p_restaurant_id, p_user_id) IS NULL THEN
    RAISE EXCEPTION 'guest_staff_grant: pessoa não é da equipe deste restaurante';
  END IF;
  IF p_on THEN
    INSERT INTO guest_staff_grants (restaurant_id, user_id, action, granted_by)
    VALUES (p_restaurant_id, p_user_id, p_action, p_actor) ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM guest_staff_grants WHERE restaurant_id = p_restaurant_id AND user_id = p_user_id AND action = p_action;
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.guest_staff_role(uuid, uuid), public.guest_staff_can(uuid, uuid, text),
  public.guest_staff_grant(uuid, uuid, uuid, text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guest_staff_role(uuid, uuid), public.guest_staff_can(uuid, uuid, text),
  public.guest_staff_grant(uuid, uuid, uuid, text, boolean) TO service_role;
