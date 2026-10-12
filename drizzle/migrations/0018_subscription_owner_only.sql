DROP POLICY IF EXISTS "Membros veem a assinatura" ON public.restaurant_subscriptions;
CREATE POLICY "Dono vê a assinatura" ON public.restaurant_subscriptions FOR SELECT TO authenticated
  USING (public.has_restaurant_role(auth.uid(), restaurant_id, ARRAY['owner']::public.app_role[]));