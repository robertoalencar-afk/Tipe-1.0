begin;
do $$
declare rid uuid; cid uuid;
begin
 select id into rid from public.restaurants where slug='bistro-teste';
 if rid is null then return; end if;
 select id into cid from public.pdv_menu_categories where restaurant_id=rid and name='Cervejas sem álcool' limit 1;
 if cid is null then insert into public.pdv_menu_categories(restaurant_id,name,position) values(rid,'Cervejas sem álcool',130) returning id into cid; end if;
 update public.pdv_menu_items set category_id=cid where restaurant_id=rid and name='Heineken zero 0% álcool long neck';
 update public.pdv_menu_categories set position=case lower(name)
 when 'entradas' then 0 when 'petiscos' then 10 when 'saladas' then 20
 when 'principais' then 30 when 'carnes' then 40 when 'pratos' then 45
 when 'acompanhamentos' then 50 when 'sobremesas' then 60
 when 'águas, sucos e refrigerantes' then 100 when 'cafés' then 120
 when 'cervejas sem álcool' then 130 when 'bebidas' then 150
 when 'cervejas' then 200 when 'aguardentes e aperitivos' then 210
 when 'whiskies' then 220 when 'coquetéis — short drinks' then 230
 when 'coquetéis — long drinks' then 240 when 'vinhos em taça — brancos' then 250
 when 'vinhos em taça — tintos' then 260 when 'vinhos em taça — rosés' then 270
 when 'licores' then 280 else position end where restaurant_id=rid;
end $$;
commit;
