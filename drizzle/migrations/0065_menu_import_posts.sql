begin;
alter table public.restaurants add column if not exists menu_posts jsonb not null default '[]'::jsonb;
alter table public.restaurants add constraint restaurants_menu_posts_array check (jsonb_typeof(menu_posts) = 'array' and jsonb_array_length(menu_posts) <= 6);

-- One transaction publishes a reviewed import; retrying the same codes is idempotent.
create or replace function public.publish_menu_import(p_slug text, p_rows jsonb, p_replace boolean default false)
returns integer language plpgsql security invoker set search_path = public, pg_temp as $$
declare rid uuid; row_data jsonb; cid uuid; n integer := 0;
begin
  select id into rid from public.restaurants where slug=p_slug for update;
  if rid is null or not public.has_restaurant_role(auth.uid(),rid,array['owner']::public.app_role[]) then
    raise exception 'Somente o dono pode importar o cardápio';
  end if;
  if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows) not between 1 and 200 then raise exception 'Importação inválida'; end if;
  if (select count(distinct x->>'code') from jsonb_array_elements(p_rows) x) <> jsonb_array_length(p_rows) then raise exception 'Códigos repetidos'; end if;
  if p_replace then update public.pdv_menu_items set available=false where restaurant_id=rid; end if;
  for row_data in select value from jsonb_array_elements(p_rows) loop
    if length(trim(row_data->>'name')) not between 2 and 80 or length(trim(row_data->>'category')) not between 2 and 60
      or (row_data->>'code') !~ '^I[A-F0-9]{8}[0-9]{3}$' or jsonb_typeof(row_data->'price') <> 'number'
      or (row_data->>'price')::numeric not between 0 and 10000 or length(coalesce(row_data->>'description','')) > 200
      or lower(trim(row_data->>'category'))='para organizar' or length(trim(coalesce(row_data->>'description',''))) < 10
      or coalesce(row_data->>'image_url','')='' or coalesce(row_data->>'depth_url','')=''
      or row_data->>'name' is null or row_data->>'category' is null or row_data->>'price' is null or row_data->>'code' is null then
      raise exception 'Confira nome, categoria e preço de cada item';
    end if;
    select id into cid from public.pdv_menu_categories where restaurant_id=rid and lower(name)=lower(trim(row_data->>'category')) limit 1;
    if cid is null then
      insert into public.pdv_menu_categories(restaurant_id,name,position) values(rid,trim(row_data->>'category'),99) returning id into cid;
    end if;
    insert into public.pdv_menu_items(restaurant_id,category_id,code,name,description,price,available,image_url,depth_url)
    values(rid,cid,row_data->>'code',trim(row_data->>'name'),nullif(row_data->>'description',''),(row_data->>'price')::numeric,true,row_data->>'image_url',row_data->>'depth_url')
    on conflict(restaurant_id,code) do update set category_id=excluded.category_id,name=excluded.name,description=excluded.description,price=excluded.price,available=true,image_url=excluded.image_url,depth_url=excluded.depth_url;
    n:=n+1;
  end loop;
  return n;
end $$;
revoke all on function public.publish_menu_import(text,jsonb,boolean) from public,anon;
grant execute on function public.publish_menu_import(text,jsonb,boolean) to authenticated;
commit;
