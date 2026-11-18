-- Bistrô Teste (empresa virtual): indicações da Lebre com o motivo que o cliente vê
-- no cardápio ("Por que a Lebre indica"). Só pratos do cardápio real (0087).
do $$
declare rid uuid;
begin
  select id into rid from public.restaurants where slug = 'bistro-teste';
  if rid is null then return; end if;
  update public.pdv_menu_items i
  set menu_config = i.menu_config || jsonb_build_object('featured', true, 'lebrePick', jsonb_build_object('reason', p.reason))
  from (values
    ('BT-MOQUECA', 'O prato que mais tem a cara do Ceará: peixe, camarão e lula no leite de coco, com pirão. Divide bem entre dois e combina com um Sauvignon Blanc.'),
    ('BT-CAMALHO', 'Para começar enquanto escolhe o prato: camarão no alho dourado, chegando ainda chiando na frigideira. Vai muito bem com uma Heineken gelada.'),
    ('BT-CARNESOL', 'Carne de sol na manteiga de garrafa com macaxeira e queijo coalho: sertão no prato, para quem quer comida de verdade.'),
    ('BT-POLVO', 'Novidade da casa: polvo macio, grelhado e regado no azeite com tomate seco. Bom para dividir na entrada.'),
    ('BT-PUDIM', 'Liso, sem furinhos, com calda de caramelo. Fecha a refeição sem pesar, ainda mais com um café espresso.')
  ) as p(code, reason)
  where i.restaurant_id = rid and i.code = p.code;
end $$;
