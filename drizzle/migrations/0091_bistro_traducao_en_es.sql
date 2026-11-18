-- Bistrô Teste: cardápio em inglês e espanhol para o QR do cliente. Traduções revisadas
-- dos 56 itens, gravadas como a Lebre grava (menu_config.translations + translationSource
-- igual ao JSON.stringify([nome, descrição]) do item atual). Liga a tradução automática
-- para a Lebre manter tudo traduzido quando um prato mudar.
do $$
declare rid uuid;
begin
  select id into rid from public.restaurants where slug = 'bistro-teste';
  if rid is null then return; end if;

  update public.pdv_menu_items m
  set menu_config = coalesce(m.menu_config, '{}'::jsonb) || jsonb_build_object(
        'translations', jsonb_build_object(
          'en', jsonb_build_object('name', t.en_name, 'description', case when coalesce(m.description, '') = '' then '' else t.en_desc end),
          'es', jsonb_build_object('name', t.es_name, 'description', case when coalesce(m.description, '') = '' then '' else t.es_desc end)),
        'translationSource',
          '[' || to_json(m.name)::text || ',' || to_json(coalesce(m.description, ''))::text || ']')
  from (values
    ('BT-CARPACCIO', 'Beef carpaccio', 'Thin slices of beef tenderloin with capers, shaved parmesan, arugula and mustard sauce.', 'Carpaccio de solomillo', 'Láminas finas de solomillo con alcaparras, lascas de parmesano, rúcula y salsa de mostaza.'),
    ('BT-CEVICHE', 'Salmon ceviche', 'Fresh salmon cubes marinated in lime, with red onion, red chili pepper and cilantro.', 'Ceviche de salmón', 'Salmón fresco en cubos marinado en limón, con cebolla morada, ají rojo y cilantro.'),
    ('BT-POLVO', 'Octopus in olive oil with sun-dried tomatoes', 'Tender grilled octopus drizzled with garlic olive oil, sun-dried tomatoes and smashed potatoes.', 'Pulpo al aceite de oliva con tomate seco', 'Pulpo tierno a la parrilla bañado en aceite de oliva con ajo, tomate seco y papas aplastadas.'),
    ('BT-CAMALHO', 'Garlic shrimp', 'Shrimp sautéed in olive oil with golden garlic and parsley, served in the skillet.', 'Camarones al ajillo', 'Camarones salteados en aceite de oliva con ajo dorado y perejil, servidos en la sartén.'),
    ('BT-LULA', 'Fried calamari', 'Breaded squid rings fried to order, with tartar sauce and lime.', 'Calamares fritos', 'Aros de calamar empanizados y fritos al momento, con salsa tártara y limón.'),
    ('BT-ISCA', 'Fish strips', 'Crispy breaded white fish strips with tartar sauce and lime.', 'Tiras de pescado', 'Tiras de pescado blanco empanizadas y crujientes, con salsa tártara y limón.'),
    ('BT-CASQUINHA', 'Crab shell', 'Crab meat sautéed in coconut milk and cilantro, gratinated with buttered cassava crumbs.', 'Casquito de cangrejo', 'Carne de cangrejo salteada en leche de coco y cilantro, gratinada con farofa a la mantequilla.'),
    ('BT-DADINHO', 'Tapioca cubes', 'Tapioca and coalho cheese cubes, golden-fried and served with pepper jelly.', 'Dados de tapioca', 'Cubos de tapioca con queso coalho, dorados y servidos con jalea de pimienta.'),
    ('BT-PASTEL', 'Sun-dried beef pastel', 'Crispy pastry filled with shredded carne de sol and coalho cheese.', 'Pastel de carne de sol', 'Pastel crujiente relleno de carne de sol deshilachada y queso coalho.'),
    ('BT-CALDINHO', 'Shrimp broth', 'Creamy shrimp broth with coconut milk and fresh herbs, served piping hot.', 'Caldito de camarón', 'Caldo cremoso de camarón con leche de coco y hierbas frescas, servido bien caliente.'),
    ('BT-CAESAR', 'Caesar salad', 'Romaine lettuce, croutons, shaved parmesan and house Caesar dressing.', 'Ensalada César', 'Lechuga romana, crutones, lascas de parmesano y aderezo César de la casa.'),
    ('BT-TROPICAL', 'Tropical salad', 'Mixed greens with mango, avocado, cashew nuts and passion fruit vinaigrette.', 'Ensalada tropical', 'Mezcla de hojas con mango, aguacate, nueces de marañón y vinagreta de maracuyá.'),
    ('BT-INTERNAC', 'Shrimp international', 'Creamy rice with shrimp, ham, peas and white sauce, gratinated with cheese. Serves 2.', 'Camarón internacional', 'Arroz cremoso con camarones, jamón, arvejas y salsa blanca, gratinado con queso. Para 2 personas.'),
    ('BT-CAMCOCO', 'Shrimp in coconut milk', 'Shrimp in coconut milk sauce with tomato and cilantro, with white rice and farofa. Serves 2.', 'Camarones en leche de coco', 'Camarones en salsa de leche de coco, tomate y cilantro, con arroz blanco y farofa. Para 2 personas.'),
    ('BT-CAMGRELHA', 'Grilled shrimp', 'Large shrimp grilled in herb butter, with sautéed vegetables and lime.', 'Camarones a la parrilla', 'Camarones grandes a la parrilla en mantequilla de hierbas, con verduras salteadas y limón.'),
    ('BT-SCAMPI', 'Shrimp scampi', 'Pasta with shrimp sautéed in butter, garlic, white wine and lemon. Serves 2.', 'Camarones scampi', 'Pasta con camarones salteados en mantequilla, ajo, vino blanco y limón. Para 2 personas.'),
    ('BT-MOQUECA', 'Mixed Ceará-style moqueca', 'Fish, shrimp and squid in coconut milk with bell peppers and cilantro, with rice and pirão. Serves 2.', 'Moqueca cearense mixta', 'Pescado, camarón y calamar en leche de coco con pimientos y cilantro, con arroz y pirão. Para 2 personas.'),
    ('BT-PESCADA', 'Yellow hake meunière', 'Yellow hake fillet browned in butter with capers and lemon, with rice and potatoes. Serves 2.', 'Pescada amarilla a la meunière', 'Filete de pescada amarilla dorado en mantequilla con alcaparras y limón, con arroz y papas. Para 2 personas.'),
    ('BT-BACALHAU', 'Bacalhau à Gomes de Sá', 'Salt cod flakes with potatoes, onion, boiled eggs and olives, baked in olive oil. Serves 2.', 'Bacalao a la Gomes de Sá', 'Lascas de bacalao con papas, cebolla, huevos cocidos y aceitunas, horneadas en aceite de oliva. Para 2 personas.'),
    ('BT-TILAPIA', 'Grilled tilapia', 'Grilled tilapia fillet with griddled vegetables and lime.', 'Tilapia a la parrilla', 'Filete de tilapia a la parrilla con verduras a la plancha y limón.'),
    ('BT-PAELLA', 'Seafood paella', 'Brothy rice with shrimp, squid, mussels and saffron, served in the paella pan. Serves 2.', 'Paella caldosa de mariscos', 'Arroz caldoso con camarón, calamar, mejillones y azafrán, servido en la paellera. Para 2 personas.'),
    ('BT-LAGOSTA', 'Grilled lobster', 'Lobster grilled in garlic butter, with vegetables and house sauces. Serves 2.', 'Langosta a la parrilla', 'Langosta a la parrilla en mantequilla de ajo, con verduras y salsas de la casa. Para 2 personas.'),
    ('BT-PARMEGIA', 'Beef parmigiana', 'Breaded beef tenderloin with tomato sauce and melted cheese, with rice and fries. Serves 2.', 'Solomillo a la parmesana', 'Solomillo empanizado con salsa de tomate y queso gratinado, con arroz y papas fritas. Para 2 personas.'),
    ('BT-MADEIRA', 'Beef in Madeira sauce', 'Beef tenderloin medallion in Madeira sauce with mushrooms, with rice and potatoes. Serves 2.', 'Solomillo en salsa madeira', 'Medallón de solomillo en salsa madeira con champiñones, con arroz y papas. Para 2 personas.'),
    ('BT-PICANHA', 'Griddled picanha', 'Sliced picanha served on a sizzling plate, with farofa, vinaigrette and rice. Serves 2.', 'Picaña a la plancha', 'Picaña en lonchas servida en plancha caliente, con farofa, vinagreta y arroz. Para 2 personas.'),
    ('BT-CARNESOL', 'Sertão sun-dried beef', 'Carne de sol in bottled butter with cassava, coalho cheese and baião de dois. Serves 2.', 'Carne de sol del sertón', 'Carne de sol en mantequilla de botella con yuca, queso coalho y baião de dois. Para 2 personas.'),
    ('BT-FRANGO', 'Grilled chicken', 'Herb-grilled chicken breast with griddled potatoes and asparagus.', 'Pollo a la parrilla', 'Pechuga de pollo a la parrilla con hierbas, papas a la plancha y espárragos.'),
    ('BT-IND-CAMAR', 'Grilled shrimp for one', 'Grilled shrimp with lime and herbs, rice and salad. Single serving.', 'Camarones a la parrilla individual', 'Camarones a la parrilla con limón y hierbas, arroz y ensalada. Plato para 1 persona.'),
    ('BT-IND-SOL', 'Sun-dried beef for one', 'Carne de sol with onions, rice, beans, farofa and a fried egg. Single serving.', 'Carne de sol individual', 'Carne de sol encebollada con arroz, frijoles, farofa y huevo frito. Plato para 1 persona.'),
    ('BT-ESPAGUETE', 'Spaghetti al sugo', 'Spaghetti with fresh tomato sauce, garlic, olive oil and basil. Single serving.', 'Espagueti al sugo', 'Espagueti con salsa de tomate fresco, ajo, aceite de oliva y albahaca. Plato para 1 persona.'),
    ('BT-KIDS', 'Kids chicken', 'Breaded chicken strips with french fries. Kids meal.', 'Pollo infantil', 'Tiras de pollo empanizadas con papas fritas. Plato infantil.'),
    ('BT-LIMAO', 'Lime pie', 'Slice of pie with lime cream on a buttery crust, topped with a lime slice.', 'Tarta de limón', 'Porción de tarta con crema de limón sobre masa de mantequilla y rodaja de limón.'),
    ('BT-PUDIM', 'Milk pudding', 'Smooth, creamy condensed milk pudding with caramel sauce.', 'Flan de leche', 'Flan de leche condensada, liso y cremoso, con salsa de caramelo.'),
    ('BT-COCADA', 'Baked cocada', 'Creamy baked coconut sweet with fresh coconut and toasted coconut flakes.', 'Cocada al horno', 'Cocada cremosa horneada con coco fresco y lascas de coco tostado.'),
    ('BT-PETIT', 'Petit gâteau', 'Chocolate cake with a molten center, served with ice cream and chocolate sauce.', 'Petit gâteau', 'Bizcocho de chocolate con centro cremoso, servido con helado y salsa de chocolate.'),
    ('BT-CHURROS', 'Churros with dulce de leche', 'Crispy churros with sugar and cinnamon, with dulce de leche for dipping.', 'Churros con dulce de leche', 'Churros crujientes con azúcar y canela, con dulce de leche para mojar.'),
    ('MAR-CAJU', 'Cashew fruit juice', 'Fresh cashew fruit juice, no preservatives. 400 ml glass, with or without sugar.', 'Jugo de marañón', 'Jugo natural de marañón, sin conservantes. Vaso de 400 ml, con o sin azúcar.'),
    ('MAR-COCO', 'Coconut water', 'Coconut water served in the green coconut itself, ice-cold.', 'Agua de coco', 'Agua de coco servida en el propio coco verde, bien fría.'),
    ('BT-LIMONADA', 'Swiss lemonade', 'Lime, mint, sugar and ice. 400 ml glass.', 'Limonada suiza', 'Limón, hierbabuena, azúcar y hielo. Vaso de 400 ml.'),
    ('BT-AGUA', 'Crystal still mineral water 500 ml', 'Crystal still mineral water, 500 ml bottle, ice-cold.', 'Agua mineral Crystal sin gas 500 ml', 'Agua mineral Crystal sin gas, botella de 500 ml, bien fría.'),
    ('BT-CAFE', 'Espresso', 'Short espresso from specialty beans, served with sparkling water.', 'Café espresso', 'Espresso corto de granos especiales, servido con agua con gas.'),
    ('BT-CAIPI', 'Ypióca Prata caipirinha', 'Ypióca Prata cachaça, Tahiti lime, sugar and ice.', 'Caipiriña de Ypióca Prata', 'Cachaza Ypióca Prata, limón tahití, azúcar y hielo.'),
    ('BT-CAIPIROSK', 'Passion fruit caipiroska with Smirnoff', 'Smirnoff vodka, fresh passion fruit, lime and ice.', 'Caipiroska de maracuyá con Smirnoff', 'Vodka Smirnoff, maracuyá fresco, limón y hielo.'),
    ('BT-VINHO-T', 'Casillero del Diablo Cabernet Sauvignon (glass)', '150 ml glass of the Chilean red Casillero del Diablo Cabernet Sauvignon.', 'Casillero del Diablo Cabernet Sauvignon (copa)', 'Copa de 150 ml del tinto chileno Casillero del Diablo Cabernet Sauvignon.'),
    ('BT-VINHO-B', 'Casillero del Diablo Sauvignon Blanc (glass)', '150 ml glass of the Chilean white Casillero del Diablo Sauvignon Blanc.', 'Casillero del Diablo Sauvignon Blanc (copa)', 'Copa de 150 ml del blanco chileno Casillero del Diablo Sauvignon Blanc.'),
    ('BT-COCA', 'Coca-Cola can 350 ml', 'Original Coca-Cola, 350 ml can, served with a glass, ice and lime.', 'Coca-Cola lata 350 ml', 'Coca-Cola original en lata de 350 ml, servida con vaso, hielo y limón.'),
    ('BT-COCAZERO', 'Coca-Cola Zero Sugar can 350 ml', 'Zero sugar Coca-Cola, 350 ml can, served with a glass, ice and lime.', 'Coca-Cola Sin Azúcar lata 350 ml', 'Coca-Cola sin azúcar en lata de 350 ml, servida con vaso, hielo y limón.'),
    ('BT-FANTA', 'Fanta Orange Zero Sugar can 350 ml', 'Zero sugar Fanta Orange, 350 ml can, served with a glass and ice.', 'Fanta Naranja Sin Azúcar lata 350 ml', 'Fanta Naranja sin azúcar en lata de 350 ml, servida con vaso y hielo.'),
    ('BT-SPRITE', 'Sprite can 350 ml', 'Sprite, 350 ml can, served with a glass, ice and lime.', 'Sprite lata 350 ml', 'Sprite en lata de 350 ml, servida con vaso, hielo y limón.'),
    ('BT-TONICA', 'Schweppes Tonic can 350 ml', 'Schweppes tonic water, 350 ml can, served with a glass, ice and lime.', 'Schweppes Tónica lata 350 ml', 'Agua tónica Schweppes en lata de 350 ml, servida con vaso, hielo y limón.'),
    ('BT-REDBULL', 'Red Bull 250 ml', 'Red Bull energy drink, 250 ml can, ice-cold.', 'Red Bull 250 ml', 'Bebida energética Red Bull en lata de 250 ml, bien fría.'),
    ('BT-HEIN00', 'Heineken 0.0 long neck 330 ml', 'Non-alcoholic pure malt beer, 330 ml long neck, ice-cold.', 'Heineken 0.0 long neck 330 ml', 'Cerveza pura malta sin alcohol, long neck de 330 ml, bien fría.'),
    ('BT-HEINEKEN', 'Heineken long neck 330 ml', 'Heineken pure malt beer, 330 ml long neck, served ice-cold.', 'Heineken long neck 330 ml', 'Cerveza pura malta Heineken, long neck de 330 ml, servida bien helada.'),
    ('BT-CORONA', 'Corona Extra long neck 330 ml', 'Corona Extra beer, 330 ml long neck, served with a lime wedge.', 'Corona Extra long neck 330 ml', 'Cerveza Corona Extra, long neck de 330 ml, servida con rodaja de limón.'),
    ('BT-STELLA', 'Stella Artois long neck 330 ml', 'Stella Artois pure malt beer, 330 ml long neck, ice-cold.', 'Stella Artois long neck 330 ml', 'Cerveza pura malta Stella Artois, long neck de 330 ml, bien fría.'),
    ('BT-BUD', 'Budweiser long neck 330 ml', 'Budweiser beer, 330 ml long neck, ice-cold.', 'Budweiser long neck 330 ml', 'Cerveza Budweiser, long neck de 330 ml, bien fría.')
  ) as t(code, en_name, en_desc, es_name, es_desc)
  where m.restaurant_id = rid and m.code = t.code;

  insert into public.menu_assistant (restaurant_id, enabled, auto_translate, languages, next_run)
  values (rid, true, true, array['pt', 'en', 'es'], now())
  on conflict (restaurant_id) do update
  set enabled = true, auto_translate = true, languages = array['pt', 'en', 'es'], next_run = now();
end $$;
