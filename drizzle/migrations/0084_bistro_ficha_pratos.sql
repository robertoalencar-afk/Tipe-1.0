-- Bistrô Teste: ficha completa de cada prato no lugar do crédito da foto.
-- Descrição com porção e acompanhamentos, alergênicos e dietas (vegano,
-- vegetariano, sem glúten, sem lactose) analisados prato a prato.
do $$
declare rid uuid;
begin
  select id into rid from public.restaurants where slug = 'bistro-teste';
  if rid is null then return; end if;

  update public.pdv_menu_items m
  set allergens = f.allergens,
      description = f.description,
      menu_config = coalesce(m.menu_config, '{}'::jsonb) || jsonb_build_object('diets', f.diets::jsonb)
  from (values
    ('MAR-PASTEL', array['glúten','ovo','crustáceos']::text[], '[]', 'Quatro pastéis de massa crocante recheados com camarão refogado no coentro, alho e limão. Acompanha molho de pimenta da casa.'),
    ('MAR-ISCA', array['peixe','glúten','ovo']::text[], '["lactose_free"]', 'Tiras de peixe branco empanadas, com batata frita, limão e molho tártaro. Serve duas pessoas.'),
    ('BT-DADINHO', array['leite']::text[], '["vegetarian", "gluten_free"]', 'Doze cubos de tapioca com queijo coalho, dourados por fora e macios por dentro, com geleia de pimenta.'),
    ('BT-BOLINHO', array['leite','gergelim']::text[], '["gluten_free"]', 'Oito bolinhos de macaxeira recheados com carne de sol desfiada e nata, empanados no gergelim.'),
    ('BT-CALDINHO', array['glúten']::text[], '["lactose_free"]', 'Caldo de feijão preto temperado, com bacon crocante, cebolinha e torradinhas. Cumbuca de 250 ml.'),
    ('BT-CARNESOL', array[]::text[], '["gluten_free", "lactose_free"]', 'Carne de sol em cubos na chapa, com macaxeira frita, arroz branco e vinagrete. Serve duas pessoas.'),
    ('BT-SALADA', array[]::text[], '["vegan", "vegetarian", "gluten_free", "lactose_free"]', 'Folhas verdes, manga, tomate, abacate e cebola roxa, com molho de limão e azeite.'),
    ('MAR-BAIAO', array['leite']::text[], '["vegetarian", "gluten_free"]', 'Arroz com feijão-verde, queijo coalho em cubos, nata e coentro, como no sertão. Serve uma pessoa.'),
    ('MAR-PEIXE', array['peixe']::text[], '["gluten_free", "lactose_free"]', 'Peixe inteiro na brasa, temperado com limão e ervas, servido na folha de bananeira com pirão e arroz. Serve duas pessoas.'),
    ('BT-MOQUECA', array['crustáceos']::text[], '["gluten_free", "lactose_free"]', 'Camarão no leite de coco e dendê com pimentões, tomate e coentro. Acompanha arroz branco e pirão. Serve duas pessoas.'),
    ('BT-PICANHA', array['leite']::text[], '["gluten_free"]', 'Picanha grelhada e fatiada, com arroz, farofa de manteiga de garrafa e vinagrete. Serve duas pessoas.'),
    ('BT-ESCONDID', array['leite']::text[], '["gluten_free"]', 'Carne de sol desfiada coberta com purê de macaxeira e queijo coalho gratinado. Serve uma pessoa.'),
    ('BT-FRANGO', array['leite']::text[], '["gluten_free"]', 'Sobrecoxa grelhada sobre purê de macaxeira, com milho tostado e molho da casa. Serve uma pessoa.'),
    ('BT-RISOTO', array['leite','castanhas']::text[], '["vegetarian", "gluten_free"]', 'Risoto cremoso de queijo coalho, finalizado com mel de engenho e castanha de caju. Serve uma pessoa.'),
    ('BT-MACAX', array[]::text[], '["vegan", "vegetarian", "gluten_free", "lactose_free"]', 'Porção de macaxeira frita no óleo vegetal, crocante por fora e macia por dentro. Serve duas pessoas.'),
    ('BT-FAROFA', array['leite']::text[], '["vegetarian", "gluten_free"]', 'Farinha de mandioca dourada na manteiga de garrafa com cebola. Porção para acompanhar.'),
    ('BT-ARROZ', array[]::text[], '["vegan", "vegetarian", "gluten_free", "lactose_free"]', 'Porção de arroz branco soltinho, feito no alho. Serve uma pessoa.'),
    ('MAR-CARTOLA', array['leite']::text[], '["vegetarian", "gluten_free"]', 'Banana assada com queijo coalho derretido, açúcar e canela.'),
    ('MAR-ABACATE', array[]::text[], '["vegan", "vegetarian", "gluten_free", "lactose_free"]', 'Abacate batido com limão e rapadura, sem leite. Gire o abacate em 3D.'),
    ('BT-PUDIM', array['leite','ovo']::text[], '["vegetarian", "gluten_free"]', 'Pudim de leite condensado com calda de caramelo. Fatia individual.'),
    ('BT-COCADA', array['leite','ovo']::text[], '["vegetarian", "gluten_free"]', 'Cocada cremosa assada no forno, em pedaços, servida morna.'),
    ('MAR-CAJU', array[]::text[], '["vegan", "vegetarian", "gluten_free", "lactose_free"]', 'Suco natural de caju, sem conservantes. Copo de 400 ml, com ou sem açúcar.'),
    ('MAR-COCO', array[]::text[], '["vegan", "vegetarian", "gluten_free", "lactose_free"]', 'Água de coco servida no próprio coco verde, bem gelada.'),
    ('BT-LIMONADA', array[]::text[], '["vegan", "vegetarian", "gluten_free", "lactose_free"]', 'Limão, hortelã, açúcar e gelo. Copo de 400 ml.'),
    ('BT-AGUA', array[]::text[], '["vegan", "vegetarian", "gluten_free", "lactose_free"]', 'Água mineral de 500 ml, com ou sem gás. Informe sua preferência ao pedir.'),
    ('BT-REFRI', array[]::text[], '["vegan", "vegetarian", "gluten_free", "lactose_free"]', 'Lata de 350 ml, servida com copo e gelo. Consulte os sabores.'),
    ('BT-CAFE', array[]::text[], '["vegan", "vegetarian", "gluten_free", "lactose_free"]', 'Espresso curto de grãos especiais, servido com água com gás.'),
    ('BT-CERV-ZERO', array['glúten']::text[], '["vegan", "vegetarian", "lactose_free"]', 'Long neck de 355 ml, 0,0% de álcool, bem gelada.'),
    ('BT-CERVEJA', array['glúten']::text[], '["vegan", "vegetarian", "lactose_free"]', 'Long neck de 355 ml, servida trincando com copo gelado.'),
    ('BT-CAIPI', array[]::text[], '["vegan", "vegetarian", "gluten_free", "lactose_free"]', 'Cachaça artesanal, limão, açúcar e gelo.'),
    ('BT-CAIPIROSK', array[]::text[], '["vegan", "vegetarian", "gluten_free", "lactose_free"]', 'Vodka com maracujá fresco, limão e gelo.'),
    ('BT-VINHO-T', array['sulfitos']::text[], '["vegetarian", "gluten_free", "lactose_free"]', 'Taça de 150 ml. Tinto seco, macio e frutado.'),
    ('BT-VINHO-B', array['sulfitos']::text[], '["vegetarian", "gluten_free", "lactose_free"]', 'Taça de 150 ml. Branco seco, fresco e aromático.')
  ) as f(code, allergens, diets, description)
  where m.restaurant_id = rid and m.code = f.code;
end $$;
