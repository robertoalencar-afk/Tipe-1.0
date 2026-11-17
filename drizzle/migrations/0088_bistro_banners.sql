-- Bistrô Teste (empresa virtual): banners do carrossel do cardápio com promoções por
-- dia da semana e pratos novos. Usa as publicações do cardápio (menu_posts), agora
-- com selo (promo/novo/evento) e dias da semana opcionais. O carrossel passa de 6
-- para até 8 artes.
alter table public.restaurants drop constraint if exists restaurants_menu_posts_array;
alter table public.restaurants add constraint restaurants_menu_posts_array
  check (jsonb_typeof(menu_posts) = 'array' and jsonb_array_length(menu_posts) <= 8);

update public.restaurants
set menu_posts = $json$[
  {"id":"5b0c1e9a-0f3d-4c11-9a51-0a8d8a1e0001","title":"Terça do camarão","caption":"Pediu um prato de camarão para dois, a sobremesa é cortesia da casa. Peça ao garçom.","itemCode":"BT-INTERNAC","theme":"photo","enabled":true,"tag":"promo","days":[2]},
  {"id":"5b0c1e9a-0f3d-4c11-9a51-0a8d8a1e0002","title":"Quarta da moqueca","caption":"Moqueca cearense mista para dois com duas taças de Casillero del Diablo Sauvignon Blanc por conta da casa.","itemCode":"BT-MOQUECA","theme":"photo","enabled":true,"tag":"promo","days":[3]},
  {"id":"5b0c1e9a-0f3d-4c11-9a51-0a8d8a1e0003","title":"Happy hour das 17h às 19h","caption":"Heineken long neck em dobro: pediu uma, a segunda vem junto. No salão, de segunda a sexta.","itemCode":"BT-HEINEKEN","theme":"paper","enabled":true,"tag":"promo","days":[1,2,3,4,5]},
  {"id":"5b0c1e9a-0f3d-4c11-9a51-0a8d8a1e0007","title":"Sexta do bacalhau","caption":"Bacalhau à Gomes de Sá saindo do forno, e a taça de Casillero del Diablo Cabernet Sauvignon pela metade do preço.","itemCode":"BT-BACALHAU","theme":"photo","enabled":true,"tag":"promo","days":[5]},
  {"id":"5b0c1e9a-0f3d-4c11-9a51-0a8d8a1e0004","title":"Novo: polvo ao azeite","caption":"Polvo macio grelhado, com alho, tomate seco e batatas ao murro. Chegou para ficar.","itemCode":"BT-POLVO","theme":"photo","enabled":true,"tag":"novo"},
  {"id":"5b0c1e9a-0f3d-4c11-9a51-0a8d8a1e0005","title":"Fim de semana em família","caption":"Sábado e domingo, o prato Kids sai cortesia para cada prato para dois da mesa.","itemCode":"BT-KIDS","theme":"paper","enabled":true,"tag":"evento","days":[0,6]},
  {"id":"5b0c1e9a-0f3d-4c11-9a51-0a8d8a1e0006","title":"Novo: churros com doce de leite","caption":"Crocantes, com açúcar e canela, e doce de leite para mergulhar. A sobremesa nova da casa.","itemCode":"BT-CHURROS","theme":"paper","enabled":true,"tag":"novo"}
]$json$::jsonb
where slug = 'bistro-teste';
