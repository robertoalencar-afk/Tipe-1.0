DROP POLICY "Guests can view table bill items" ON public.table_bill_items;
CREATE POLICY "Members view table bill items" ON public.table_bill_items
  FOR SELECT TO authenticated
  USING (public.is_member_of_slug(auth.uid(), restaurant_slug));

DROP POLICY "Guests can view table payment activity" ON public.table_payment_requests;
CREATE POLICY "Members view table payment activity" ON public.table_payment_requests
  FOR SELECT TO authenticated
  USING (public.is_member_of_slug(auth.uid(), restaurant_slug));

DROP POLICY "Qualquer visitante pode enviar um contato" ON public.restaurant_leads;
CREATE POLICY "Visitantes enviam contato valido" ON public.restaurant_leads
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(trim(restaurant_name)) BETWEEN 2 AND 120
    AND length(trim(contact_name)) BETWEEN 2 AND 120
    AND length(email) <= 320
    AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND (phone IS NULL OR length(phone) <= 30)
    AND (message IS NULL OR length(message) <= 2000)
  );