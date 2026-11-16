begin;
create function public.edit_unused_table(p_id uuid,p_number text default null,p_delete boolean default false)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare t public.restaurant_tables; s text;
begin
 select * into t from public.restaurant_tables where id=p_id for update;
 if t.id is null or not public.has_restaurant_role(auth.uid(),t.restaurant_id,array['owner']::public.app_role[]) then raise exception 'Somente o dono pode alterar mesas'; end if;
 select slug into s from public.restaurants where id=t.restaurant_id;
 if t.external_id is not null then raise exception 'Edite esta mesa no PDV conectado'; end if;
 if exists(select 1 from public.table_bill_items where restaurant_slug=s and table_number=t.number)
 or exists(select 1 from public.table_payment_requests where restaurant_slug=s and table_number=t.number)
 or exists(select 1 from public.archived_payments where restaurant_slug=s and table_number=t.number)
 or exists(select 1 from public.pdv_orders where restaurant_id=t.restaurant_id and table_number=t.number)
 or exists(select 1 from public.guest_table_allocations where table_id=t.id)
 or exists(select 1 from public.guest_reservations where seated_table_id=t.id)
 or exists(select 1 from public.guest_availability_exceptions where table_id=t.id)
 then raise exception 'Esta mesa tem movimentação ou reservas. Desative-a para preservar seu histórico'; end if;
 if p_delete then
   if t.active then raise exception 'Desative a mesa antes de excluir'; end if;
   delete from public.restaurant_tables where id=t.id;
 else
   if p_number is null or length(trim(p_number)) not between 1 and 12 or trim(p_number) !~ '^[A-Za-z0-9 -]+$' then raise exception 'Número inválido'; end if;
   update public.restaurant_tables set number=trim(p_number) where id=t.id;
 end if;
end $$;
revoke all on function public.edit_unused_table(uuid,text,boolean) from public,anon;
grant execute on function public.edit_unused_table(uuid,text,boolean) to authenticated;
commit;
