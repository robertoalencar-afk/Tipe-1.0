-- Tipe Guest Manager · permissões da equipe (Projeto 4). PROPOSTA PARA REVISÃO: não aplicar em
-- produção sem ok do Roberto. Depende da 0050 (papel manager) e da 0051 (concessões). Não mexe no enum app_role nem nas regras de gorjeta.
-- Espelha src/lib/tipe/guest/permissoes.ts. Idempotente.

-- Gerente = papel 'manager' do app_role (criado na 0050, PR #106). Comparado como texto para
-- esta migração aplicar mesmo antes da 0050.

-- "Conforme autorização" / "permissão explícita": usa as concessões da equipe (0051,
-- restaurant_permission_grants) com nomes reservas.*. Nada de tabela nova.

-- Ação do Guest → nome da concessão (formato modulo.acao da 0051).
CREATE OR REPLACE FUNCTION public.guest_permission_name(p_action text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_action
    WHEN 'ver_reservas' THEN 'reservas.ver'
    WHEN 'criar_reserva' THEN 'reservas.criar'
    WHEN 'confirmar_chegada' THEN 'reservas.chegada'
    WHEN 'atribuir_mesa' THEN 'reservas.mesa'
    WHEN 'gerenciar_espera' THEN 'reservas.espera'
    WHEN 'alterar_disponibilidade' THEN 'reservas.disponibilidade'
    WHEN 'configurar_politicas' THEN 'reservas.politicas'
    WHEN 'ver_relatorios' THEN 'reservas.relatorios'
    WHEN 'gerenciar_experiencias' THEN 'reservas.experiencias'
    WHEN 'ver_perfil_cliente' THEN 'reservas.perfil'
  END
$$;

-- Papel no Guest: dono > gerente > caixa > garçom. Nulo = sem acesso.
CREATE OR REPLACE FUNCTION public.guest_staff_role(p_restaurant_id uuid, p_user_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN NOT public.has_restaurant_role(p_user_id, p_restaurant_id, ARRAY['owner','cashier','waiter']::public.app_role[]) THEN NULL
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
    SELECT 1 FROM restaurant_permission_grants
    WHERE restaurant_id = p_restaurant_id AND user_id = p_user_id AND permission = guest_permission_name(p_action));
END $$;

-- Só o administrador (dono) concede ou tira. Concessão a quem não é da equipe falha.
CREATE OR REPLACE FUNCTION public.guest_staff_grant(p_restaurant_id uuid, p_actor uuid, p_user_id uuid, p_action text, p_on boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF guest_staff_role(p_restaurant_id, p_actor) IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'guest_staff_grant: só o administrador concede permissões';
  END IF;
  IF guest_permission_name(p_action) IS NULL THEN
    RAISE EXCEPTION 'guest_staff_grant: ação desconhecida';
  END IF;
  IF guest_staff_role(p_restaurant_id, p_user_id) IS NULL THEN
    RAISE EXCEPTION 'guest_staff_grant: pessoa não é da equipe deste restaurante';
  END IF;
  IF p_on THEN
    INSERT INTO restaurant_permission_grants (restaurant_id, user_id, permission, granted_by)
    VALUES (p_restaurant_id, p_user_id, guest_permission_name(p_action), p_actor) ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM restaurant_permission_grants
    WHERE restaurant_id = p_restaurant_id AND user_id = p_user_id AND permission = guest_permission_name(p_action);
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.guest_staff_role(uuid, uuid), public.guest_staff_can(uuid, uuid, text),
  public.guest_staff_grant(uuid, uuid, uuid, text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guest_staff_role(uuid, uuid), public.guest_staff_can(uuid, uuid, text),
  public.guest_staff_grant(uuid, uuid, uuid, text, boolean) TO service_role;
