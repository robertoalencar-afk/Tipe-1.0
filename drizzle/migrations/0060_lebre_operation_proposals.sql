-- Propostas operacionais só são gravadas pelo servidor após autorização.
CREATE TABLE public.lebre_operation_proposals (
 id uuid PRIMARY KEY,
 restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
 actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 payload jsonb NOT NULL,
 snapshot jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 result jsonb
);
ALTER TABLE public.lebre_operation_proposals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lebre_operation_proposals FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.lebre_operation_proposals TO service_role;

-- Definer necessário para ler propostas privadas e reativar mesa sem conceder
-- UPDATE genérico da configuração da mesa à equipe. Todas as ações reautorizadas.
CREATE FUNCTION public.lebre_execute_operation(p_proposal uuid, p_slug text, p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE p public.lebre_operation_proposals; t public.restaurant_tables;
 r uuid; a text; w public.pdv_waiters; i jsonb; m public.pdv_menu_items;
 s jsonb; msg text; n integer; own_waiters integer;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sem permissão'; END IF;
 SELECT * INTO p FROM lebre_operation_proposals WHERE id=p_proposal FOR UPDATE;
 SELECT id INTO r FROM restaurants WHERE slug=p_slug;
 IF p.id IS NULL OR p.actor_id IS DISTINCT FROM auth.uid() OR p.restaurant_id IS DISTINCT FROM r
    OR p.payload IS DISTINCT FROM p_payload THEN RAISE EXCEPTION 'Proposta inválida'; END IF;
 a := p.payload->>'action';
 IF a NOT IN ('open_table','launch_order','close_table') OR
 NOT has_restaurant_role(auth.uid(),r,CASE WHEN a='close_table' THEN ARRAY['owner','cashier']::app_role[] ELSE ARRAY['owner','cashier','waiter']::app_role[] END)
 THEN RAISE EXCEPTION 'Sem permissão'; END IF;
 IF p.result IS NOT NULL THEN RETURN p.result; END IF;
 IF p.created_at < now()-interval '10 minutes' THEN RAISE EXCEPTION 'Proposta expirada. Peça novamente à Lebre'; END IF;
 -- Mesmo lock do limite de mesas; serializa operações antes de travar a mesa.
 PERFORM 1 FROM restaurants WHERE id=r FOR UPDATE;
 SELECT * INTO t FROM restaurant_tables WHERE restaurant_id=r AND number=p.payload->>'number' FOR UPDATE;
 IF t.id IS NULL THEN RAISE EXCEPTION 'Mesa inexistente'; END IF;
 IF t.session_token IS DISTINCT FROM p.snapshot->>'session' THEN RAISE EXCEPTION 'Mesa mudou de conta. Peça novamente à Lebre'; END IF;
 IF a='open_table' THEN
   IF NOT t.active THEN
     UPDATE restaurant_tables SET active=true WHERE id=t.id;
     GET DIAGNOSTICS n = ROW_COUNT;
     IF n=0 THEN RAISE EXCEPTION 'Mesa acima do limite do plano'; END IF;
   END IF;
   IF restaurant_has_module(r,'order') THEN
     s := open_table_ordering(p_slug,t.number);
     IF s IS NULL THEN RAISE EXCEPTION 'Mesa sem confirmação de abertura'; END IF;
     msg := format('Mesa %s aberta e com pedidos pelo celular liberados.',t.number);
     IF (s->>'requires_code')::boolean AND s->>'code' IS NOT NULL THEN msg := msg || ' Código para o cliente: ' || (s->>'code') || '.'; END IF;
   ELSE
     msg := format('Mesa %s aberta e pronta. O primeiro pedido lançado abre a conta.',t.number);
   END IF;
 ELSIF a='close_table' THEN
   PERFORM pdv_close_table(p_slug,t.number);
   msg := format('Mesa %s fechada e liberada. Os pagamentos ficaram guardados no histórico.',t.number);
 ELSE
   IF NOT t.active THEN RAISE EXCEPTION 'Mesa inativa'; END IF;
   SELECT * INTO w FROM pdv_waiters WHERE id=(p.snapshot->>'waiter_id')::uuid AND restaurant_id=r AND active FOR SHARE;
   IF w.id IS NULL THEN RAISE EXCEPTION 'Garçom inválido'; END IF;
   SELECT count(*) INTO own_waiters FROM pdv_waiters WHERE restaurant_id=r AND user_id=auth.uid() AND active;
   IF own_waiters>1 THEN RAISE EXCEPTION 'Garçom com vínculo ambíguo'; END IF;
   IF own_waiters=1 THEN
     IF w.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Garçom do pedido deve ser o usuário logado'; END IF;
   ELSE
     IF NOT has_restaurant_role(auth.uid(),r,ARRAY['owner','cashier']::app_role[]) OR t.waiter_id IS DISTINCT FROM w.id THEN RAISE EXCEPTION 'Garçom da mesa mudou. Peça novamente à Lebre'; END IF;
   END IF;
   IF jsonb_typeof(p.snapshot->'items') IS DISTINCT FROM 'array' OR jsonb_array_length(p.snapshot->'items')=0 THEN RAISE EXCEPTION 'Proposta sem itens'; END IF;
   FOR i IN SELECT * FROM jsonb_array_elements(p.snapshot->'items') LOOP
     IF (i->>'qty')::numeric <> trunc((i->>'qty')::numeric) OR (i->>'qty')::numeric NOT BETWEEN 1 AND 99 THEN RAISE EXCEPTION 'Quantidade inválida'; END IF;
     SELECT * INTO m FROM pdv_menu_items WHERE restaurant_id=r AND code=i->>'code' FOR SHARE;
     IF m.id IS NULL OR NOT m.available THEN RAISE EXCEPTION 'Item indisponível'; END IF;
     IF m.price IS DISTINCT FROM (i->>'price')::numeric OR m.name IS DISTINCT FROM i->>'name' THEN RAISE EXCEPTION 'Cardápio alterado. Peça novamente à Lebre'; END IF;
   END LOOP;
   PERFORM pdv_launch_order(p_slug,t.number,w.id,p.snapshot->'items',replace(p.id::text,'-',''));
   msg := format('Pedido lançado na mesa %s. Já está na conta da mesa.',t.number);
 END IF;
 s := jsonb_build_object('message',msg);
 UPDATE lebre_operation_proposals SET result=s WHERE id=p.id;
 RETURN s;
END $$;
REVOKE ALL ON FUNCTION public.lebre_execute_operation(uuid,text,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lebre_execute_operation(uuid,text,jsonb) TO authenticated;
