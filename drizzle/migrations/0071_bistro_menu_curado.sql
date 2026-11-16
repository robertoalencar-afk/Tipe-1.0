-- Bistrô Teste (empresa virtual de demonstração): troca o cardápio importado da
-- internet, sem coerência e com fotos de terceiros, por um cardápio autoral de
-- cozinha nordestina contemporânea. Fotos só dos arquivos próprios da Tipe
-- (public/cardapio e public/modelos); os demais itens ficam sem foto até o dono
-- aplicar imagens pelo Banco de imagens. Pedidos antigos guardam nome e preço
-- próprios, então nada do histórico depende destes itens.
begin;
do $$
declare rid uuid;
begin
  select id into rid from public.restaurants where slug = 'bistro-teste';
  if rid is null then return; end if;

  delete from public.pdv_menu_items where restaurant_id = rid;
  delete from public.pdv_menu_categories where restaurant_id = rid;

  insert into public.pdv_menu_categories (restaurant_id, name, position)
  select rid, c.name, c.pos
  from (values
    ('Entradas', 0), ('Saladas', 20), ('Principais', 30), ('Acompanhamentos', 50),
    ('Sobremesas', 60), ('Águas, sucos e refrigerantes', 100), ('Cafés', 120),
    ('Cervejas sem álcool', 130), ('Cervejas', 200), ('Coquetéis', 230), ('Vinhos em taça', 250)
  ) as c(name, pos);

  insert into public.pdv_menu_items
    (restaurant_id, category_id, code, name, description, price, sector, position, available,
     image_url, depth_url, model_url, badge, allergens, menu_config)
  select rid, cat.id, i.code, i.name, i.description, i.price, i.sector, i.pos, true,
         i.image_url, i.depth_url, i.model_url, i.badge, i.allergens, i.config::jsonb
  from (values
    -- Entradas
    ('Entradas', 'MAR-PASTEL', 'Pastel de camarão', 'Seis pastéis crocantes recheados com camarão refogado no coentro e limão.', 34.00, 'kitchen', 1,
      '/cardapio/pastel-1080.webp', '/cardapio/pastel-depth.png', '/modelos/pastel-triposr.glb', null, array['crustáceos','glúten'], '{"featured":true,"recommendations":["MAR-CAJU","BT-CAIPI"]}'),
    ('Entradas', 'MAR-ISCA', 'Isca de peixe', 'Tiras de peixe empanadas, servidas com molho tártaro da casa e limão.', 54.00, 'kitchen', 2,
      '/cardapio/isca-1080.webp', '/cardapio/isca-depth.png', null, 'Mais pedido', array['peixe','ovo','glúten'], '{"recommendations":["BT-CERVEJA","BT-LIMONADA"]}'),
    ('Entradas', 'BT-DADINHO', 'Dadinho de tapioca', 'Cubos de tapioca com queijo coalho, dourados e servidos com geleia de pimenta.', 32.00, 'kitchen', 3,
      null, null, null, null, array['leite'], '{"diets":["vegetarian","gluten_free"]}'),
    ('Entradas', 'BT-BOLINHO', 'Bolinho de macaxeira com carne de sol', 'Oito bolinhos de macaxeira recheados com carne de sol desfiada e nata.', 38.00, 'kitchen', 4,
      null, null, null, null, array['leite'], '{}'),
    ('Entradas', 'BT-CALDINHO', 'Caldinho de feijão', 'Caldo de feijão temperado, com bacon crocante, cebolinha e torradinhas.', 16.00, 'kitchen', 5,
      null, null, null, null, array['glúten'], '{}'),
    ('Entradas', 'BT-CARNESOL', 'Carne de sol acebolada', 'Para dividir: carne de sol na chapa com cebola, macaxeira cozida e manteiga de garrafa.', 69.00, 'kitchen', 6,
      null, null, null, null, array['leite'], '{"recommendations":["BT-VINHO-T","BT-CERVEJA"]}'),
    -- Saladas
    ('Saladas', 'BT-SALADA', 'Salada de folhas com manga', 'Folhas verdes, manga, tomate-cereja, castanha de caju e molho de maracujá.', 36.00, 'kitchen', 1,
      null, null, null, null, array['castanhas'], '{"diets":["vegan","gluten_free","lactose_free"]}'),
    -- Principais
    ('Principais', 'MAR-BAIAO', 'Baião de dois', 'Arroz com feijão-verde, queijo coalho, nata e coentro, como no sertão.', 42.00, 'kitchen', 1,
      '/cardapio/baiao-1080.webp', '/cardapio/baiao-depth.png', null, null, array['leite'], '{"featured":true,"recommendations":["BT-CARNESOL","MAR-CAJU"]}'),
    ('Principais', 'MAR-PEIXE', 'Peixe na brasa', 'Pargo inteiro na brasa com pirão, arroz e salada da casa.', 68.00, 'kitchen', 2,
      '/cardapio/peixe-720.webp', null, null, 'Saindo da brasa', array['peixe'], '{"recommendations":["BT-VINHO-B","MAR-COCO"]}'),
    ('Principais', 'BT-MOQUECA', 'Moqueca de camarão', 'Serve duas pessoas. Camarão no leite de coco e dendê, com arroz branco e pirão.', 159.00, 'kitchen', 3,
      null, null, null, null, array['crustáceos'], '{"featured":true,"recommendations":["BT-VINHO-B","BT-CAIPI"]}'),
    ('Principais', 'BT-PICANHA', 'Picanha na chapa', 'Picanha fatiada com arroz, farofa de manteiga de garrafa e vinagrete.', 89.00, 'kitchen', 4,
      null, null, null, null, array['leite'], '{"recommendations":["BT-MACAX","BT-VINHO-T"]}'),
    ('Principais', 'BT-ESCONDID', 'Escondidinho de carne de sol', 'Purê de macaxeira gratinado com queijo coalho sobre carne de sol desfiada.', 58.00, 'kitchen', 5,
      null, null, null, null, array['leite'], '{}'),
    ('Principais', 'BT-FRANGO', 'Frango grelhado com purê de jerimum', 'Sobrecoxa grelhada, purê de jerimum e farofa de castanha de caju.', 49.00, 'kitchen', 6,
      null, null, null, null, array['castanhas','leite'], '{}'),
    ('Principais', 'BT-RISOTO', 'Risoto de queijo coalho', 'Risoto cremoso de queijo coalho, finalizado com mel de engenho e castanha.', 54.00, 'kitchen', 7,
      null, null, null, null, array['leite','castanhas'], '{"diets":["vegetarian","gluten_free"]}'),
    -- Acompanhamentos
    ('Acompanhamentos', 'BT-MACAX', 'Macaxeira frita', 'Porção de macaxeira frita, crocante por fora e macia por dentro.', 22.00, 'kitchen', 1,
      null, null, null, null, array[]::text[], '{"diets":["vegan","gluten_free","lactose_free"]}'),
    ('Acompanhamentos', 'BT-FAROFA', 'Farofa de manteiga de garrafa', 'Farofa de mandioca dourada na manteiga de garrafa com cebola.', 14.00, 'kitchen', 2,
      null, null, null, null, array['leite'], '{"diets":["vegetarian","gluten_free"]}'),
    ('Acompanhamentos', 'BT-ARROZ', 'Arroz branco', 'Porção de arroz branco soltinho.', 12.00, 'kitchen', 3,
      null, null, null, null, array[]::text[], '{"diets":["vegan","gluten_free","lactose_free"]}'),
    -- Sobremesas
    ('Sobremesas', 'MAR-CARTOLA', 'Cartola', 'Banana assada com queijo coalho derretido, açúcar e canela.', 19.00, 'kitchen', 1,
      '/cardapio/cartola-1080.webp', '/cardapio/cartola-depth.png', null, null, array['leite'], '{"featured":true,"diets":["vegetarian","gluten_free"]}'),
    ('Sobremesas', 'MAR-ABACATE', 'Creme de abacate', 'Creme de abacate com limão e raspas de rapadura. Gire o abacate em 3D.', 16.00, 'kitchen', 2,
      null, null, '/modelos/abacate.glb', 'Em 3D', array[]::text[], '{"diets":["vegan","gluten_free","lactose_free"]}'),
    ('Sobremesas', 'BT-PUDIM', 'Pudim de leite', 'Pudim de leite condensado com calda de caramelo.', 18.00, 'kitchen', 3,
      null, null, null, null, array['leite','ovo'], '{"diets":["vegetarian","gluten_free"]}'),
    ('Sobremesas', 'BT-COCADA', 'Cocada de forno com sorvete', 'Cocada cremosa assada, servida quente com uma bola de sorvete de creme.', 22.00, 'kitchen', 4,
      null, null, null, null, array['leite','ovo'], '{"diets":["vegetarian"]}'),
    -- Águas, sucos e refrigerantes
    ('Águas, sucos e refrigerantes', 'MAR-CAJU', 'Suco de caju', 'Suco natural de caju, copo de 400 ml.', 9.50, 'bar', 1,
      '/cardapio/caju-1080.webp', '/cardapio/caju-depth.png', null, null, array[]::text[], '{"diets":["vegan","gluten_free","lactose_free"]}'),
    ('Águas, sucos e refrigerantes', 'MAR-COCO', 'Água de coco', 'Servida no próprio coco, bem gelada.', 8.00, 'bar', 2,
      '/cardapio/coco-720.webp', null, null, null, array[]::text[], '{"diets":["vegan","gluten_free","lactose_free"]}'),
    ('Águas, sucos e refrigerantes', 'BT-LIMONADA', 'Limonada suíça', 'Limão batido com gelo e leite condensado, copo de 400 ml.', 12.00, 'bar', 3,
      null, null, null, null, array['leite'], '{"diets":["vegetarian","gluten_free"]}'),
    ('Águas, sucos e refrigerantes', 'BT-AGUA', 'Água mineral 500 ml', 'Com ou sem gás. Informe sua preferência ao pedir.', 6.00, 'bar', 4,
      null, null, null, null, array[]::text[], '{"diets":["vegan","gluten_free","lactose_free"]}'),
    ('Águas, sucos e refrigerantes', 'BT-REFRI', 'Refrigerante lata', 'Lata de 350 ml. Consulte os sabores disponíveis.', 7.00, 'bar', 5,
      null, null, null, null, array[]::text[], '{"diets":["vegan","gluten_free","lactose_free"]}'),
    -- Cafés
    ('Cafés', 'BT-CAFE', 'Café espresso', 'Espresso curto de grãos especiais, servido com água com gás.', 7.00, 'bar', 1,
      null, null, null, null, array[]::text[], '{"diets":["vegan","gluten_free","lactose_free"]}'),
    -- Cervejas sem álcool
    ('Cervejas sem álcool', 'BT-CERV-ZERO', 'Cerveja sem álcool long neck', 'Long neck de 355 ml, 0,0% de álcool, bem gelada.', 13.00, 'bar', 1,
      null, null, null, null, array['glúten'], '{}'),
    -- Cervejas
    ('Cervejas', 'BT-CERVEJA', 'Cerveja pilsen long neck', 'Long neck de 355 ml, servida trincando.', 14.00, 'bar', 1,
      null, null, null, null, array['glúten'], '{}'),
    -- Coquetéis
    ('Coquetéis', 'BT-CAIPI', 'Caipirinha de cachaça', 'Cachaça artesanal, limão, açúcar e gelo.', 26.00, 'bar', 1,
      null, null, null, null, array[]::text[], '{"featured":true}'),
    ('Coquetéis', 'BT-CAIPIROSK', 'Caipiroska de caju', 'Vodka com caju fresco, limão e gelo.', 28.00, 'bar', 2,
      null, null, null, null, array[]::text[], '{}'),
    -- Vinhos em taça
    ('Vinhos em taça', 'BT-VINHO-T', 'Vinho tinto da casa', 'Taça de 150 ml. Tinto seco, macio e frutado.', 32.00, 'bar', 1,
      null, null, null, null, array['sulfitos'], '{}'),
    ('Vinhos em taça', 'BT-VINHO-B', 'Vinho branco da casa', 'Taça de 150 ml. Branco seco, fresco e aromático.', 32.00, 'bar', 2,
      null, null, null, null, array['sulfitos'], '{}')
  ) as i(category, code, name, description, price, sector, pos, image_url, depth_url, model_url, badge, allergens, config)
  join public.pdv_menu_categories cat on cat.restaurant_id = rid and cat.name = i.category;
end $$;
commit;
