-- Bistrô Teste: destilados, vinhos e água com as marcas reais usadas na casa.
do $$
declare rid uuid;
begin
  select id into rid from public.restaurants where slug = 'bistro-teste';
  if rid is null then return; end if;

  update public.pdv_menu_items m
  set name = f.name, description = f.description
  from (values
    ('BT-CAIPI', 'Caipirinha de Ypióca Prata', 'Cachaça Ypióca Prata, limão taiti, açúcar e gelo.'),
    ('BT-CAIPIROSK', 'Caipiroska de maracujá com Smirnoff', 'Vodka Smirnoff, maracujá fresco, limão e gelo.'),
    ('BT-VINHO-T', 'Casillero del Diablo Cabernet Sauvignon (taça)', 'Taça de 150 ml do tinto chileno Casillero del Diablo Cabernet Sauvignon.'),
    ('BT-VINHO-B', 'Casillero del Diablo Sauvignon Blanc (taça)', 'Taça de 150 ml do branco chileno Casillero del Diablo Sauvignon Blanc.'),
    ('BT-AGUA', 'Água mineral Crystal sem gás 500 ml', 'Água mineral Crystal sem gás, garrafa de 500 ml, bem gelada.')
  ) as f(code, name, description)
  where m.restaurant_id = rid and m.code = f.code;
end $$;
