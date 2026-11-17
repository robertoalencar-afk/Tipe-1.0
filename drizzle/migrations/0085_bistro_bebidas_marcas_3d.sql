-- Bistrô Teste: bebidas reais de marca (Coca-Cola, Fanta, Sprite, Schweppes, Red Bull,
-- Heineken, Corona, Stella Artois, Budweiser) no lugar das genéricas, e volume 3D em
-- todas as fotos (mapas de profundidade do mesmo modelo do Studio, em public/cardapio/bistro).
do $$
declare rid uuid;
begin
  select id into rid from public.restaurants where slug = 'bistro-teste';
  if rid is null then return; end if;

  delete from public.pdv_menu_items
  where restaurant_id = rid and code in ('BT-REFRI', 'BT-CERV-ZERO', 'BT-CERVEJA');

  update public.pdv_menu_items
  set name = 'Água mineral sem gás 500 ml',
      description = 'Água mineral natural sem gás, garrafa de 500 ml, bem gelada.',
      image_url = 'https://tipe.digital/cardapio/bistro/bt-agua.webp'
  where restaurant_id = rid and code = 'BT-AGUA';

  insert into public.pdv_menu_items
    (restaurant_id, category_id, code, name, description, price, sector, position, available,
     image_url, allergens, menu_config)
  select rid, cat.id, n.code, n.name, n.description, n.price, 'bar', n.pos, true,
         'https://tipe.digital/cardapio/bistro/' || lower(n.code) || '.webp', n.allergens, n.config::jsonb
  from (values
    ('Águas, sucos e refrigerantes', 'BT-COCA', 'Coca-Cola lata 350 ml', 'Coca-Cola original em lata de 350 ml, servida com copo, gelo e limão.', 7.00, 3, array[]::text[], '{"diets": ["vegan", "vegetarian", "gluten_free", "lactose_free"]}'),
    ('Águas, sucos e refrigerantes', 'BT-COCAZERO', 'Coca-Cola Sem Açúcar lata 350 ml', 'Coca-Cola sem açúcar em lata de 350 ml, servida com copo, gelo e limão.', 7.00, 4, array[]::text[], '{"diets": ["vegan", "vegetarian", "gluten_free", "lactose_free"]}'),
    ('Águas, sucos e refrigerantes', 'BT-FANTA', 'Fanta Laranja Sem Açúcar lata 350 ml', 'Fanta Laranja sem açúcar em lata de 350 ml, servida com copo e gelo.', 7.00, 5, array[]::text[], '{"diets": ["vegan", "vegetarian", "gluten_free", "lactose_free"]}'),
    ('Águas, sucos e refrigerantes', 'BT-SPRITE', 'Sprite lata 350 ml', 'Sprite em lata de 350 ml, servida com copo, gelo e limão.', 7.00, 6, array[]::text[], '{"diets": ["vegan", "vegetarian", "gluten_free", "lactose_free"]}'),
    ('Águas, sucos e refrigerantes', 'BT-TONICA', 'Schweppes Tônica lata 350 ml', 'Água tônica Schweppes em lata de 350 ml, servida com copo, gelo e limão.', 8.00, 7, array[]::text[], '{"diets": ["vegan", "vegetarian", "gluten_free", "lactose_free"]}'),
    ('Águas, sucos e refrigerantes', 'BT-REDBULL', 'Red Bull 250 ml', 'Energético Red Bull em lata de 250 ml, bem gelado.', 16.00, 8, array[]::text[], '{"diets": ["vegan", "vegetarian", "gluten_free", "lactose_free"]}'),
    ('Cervejas sem álcool', 'BT-HEIN00', 'Heineken 0.0 long neck 330 ml', 'Cerveja puro malte sem álcool, long neck de 330 ml, bem gelada.', 13.00, 1, array['glúten']::text[], '{"diets": ["vegan", "vegetarian", "lactose_free"]}'),
    ('Cervejas', 'BT-HEINEKEN', 'Heineken long neck 330 ml', 'Cerveja puro malte Heineken, long neck de 330 ml, servida trincando.', 14.00, 1, array['glúten']::text[], '{"diets": ["vegan", "vegetarian", "lactose_free"]}'),
    ('Cervejas', 'BT-CORONA', 'Corona Extra long neck 330 ml', 'Cerveja Corona Extra, long neck de 330 ml, servida com fatia de limão.', 15.00, 2, array['glúten']::text[], '{"diets": ["vegan", "vegetarian", "lactose_free"]}'),
    ('Cervejas', 'BT-STELLA', 'Stella Artois long neck 330 ml', 'Cerveja puro malte Stella Artois, long neck de 330 ml, bem gelada.', 14.00, 3, array['glúten']::text[], '{"diets": ["vegan", "vegetarian", "lactose_free"]}'),
    ('Cervejas', 'BT-BUD', 'Budweiser long neck 330 ml', 'Cerveja Budweiser, long neck de 330 ml, bem gelada.', 12.00, 4, array['glúten']::text[], '{"diets": ["vegan", "vegetarian", "lactose_free"]}')
  ) as n(category, code, name, description, price, pos, allergens, config)
  join public.pdv_menu_categories cat on cat.restaurant_id = rid and cat.name = n.category
  where not exists (
    select 1 from public.pdv_menu_items x where x.restaurant_id = rid and x.code = n.code
  );

  -- Recomendações que apontavam para a cerveja genérica passam para a Heineken.
  update public.pdv_menu_items
  set menu_config = jsonb_set(menu_config, '{recommendations}',
        (select coalesce(jsonb_agg(case when r = 'BT-CERVEJA' then 'BT-HEINEKEN' else r end), '[]'::jsonb)
         from jsonb_array_elements_text(menu_config->'recommendations') r))
  where restaurant_id = rid and menu_config ? 'recommendations';

  -- Modelos 3D gerados (pastel, abacate) pareciam de jogo: saem até haver um modelo
  -- fotorrealista. O volume fica por conta do mapa de profundidade.
  update public.pdv_menu_items set model_url = null where restaurant_id = rid and model_url is not null;
  update public.pdv_menu_items
  set description = 'Abacate batido com limão e rapadura, sem leite. Taça individual.'
  where restaurant_id = rid and code = 'MAR-ABACATE';

  -- Volume 3D: toda foto da pasta bistro tem o mapa ao lado (-depth.png).
  update public.pdv_menu_items
  set depth_url = replace(image_url, '.webp', '-depth.png')
  where restaurant_id = rid and image_url like 'https://tipe.digital/cardapio/bistro/%.webp';
end $$;
