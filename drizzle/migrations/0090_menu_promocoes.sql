-- Promoções do cardápio (Gestão > Cardápio > Promoções): lista em restaurants.menu_promos,
-- validada no servidor (src/lib/tipe/menu-promos.ts). Bistrô Teste recebe a semana de
-- promoções que acompanha os banners (0088) e duas sugestões da Lebre para os dias fracos.
alter table public.restaurants add column if not exists menu_promos jsonb not null default '[]'::jsonb;
alter table public.restaurants drop constraint if exists restaurants_menu_promos_array;
alter table public.restaurants add constraint restaurants_menu_promos_array
  check (jsonb_typeof(menu_promos) = 'array' and jsonb_array_length(menu_promos) <= 20);

update public.restaurants
set menu_promos = $json$[
  {"id":"8c2d4f10-3a5b-4c6d-9e7f-0a1b2c3d0001","name":"Segunda do executivo","kind":"combo","itemCodes":["BT-IND-SOL","BT-IND-CAMAR","BT-COCA"],"days":[1],"start":"11:30","end":"15:00","rule":"Prato individual (carne de sol ou camarão grelhado) com Coca-Cola lata. Por pessoa, no salão, no almoço. Não cumulativa.","until":"","enabled":true,"why":"Segunda é o dia mais fraco da semana; um combo de almoço para quem trabalha perto traz movimento sem baixar o preço do jantar."},
  {"id":"8c2d4f10-3a5b-4c6d-9e7f-0a1b2c3d0002","name":"Terça do camarão","kind":"cortesia","itemCodes":["BT-INTERNAC","BT-CAMCOCO","BT-SCAMPI"],"days":[2],"start":"","end":"","rule":"Na compra de um prato de camarão para dois, uma sobremesa por mesa é cortesia. Não cumulativa com outras promoções.","until":"","enabled":true,"why":"Terça também é fraca; dia temático com o carro-chefe da casa cria hábito, e a cortesia custa menos que um desconto."},
  {"id":"8c2d4f10-3a5b-4c6d-9e7f-0a1b2c3d0003","name":"Quarta da moqueca","kind":"cortesia","itemCodes":["BT-MOQUECA","BT-VINHO-B"],"days":[3],"start":"","end":"","rule":"Na moqueca cearense mista para dois, duas taças de Casillero del Diablo Sauvignon Blanc por conta da casa. Uma vez por mesa.","until":"","enabled":true},
  {"id":"8c2d4f10-3a5b-4c6d-9e7f-0a1b2c3d0004","name":"Happy hour","kind":"dobro","itemCodes":["BT-HEINEKEN","BT-CAMALHO"],"days":[1,2,3,4,5],"start":"17:00","end":"19:00","rule":"Heineken long neck em dobro: a cada uma pedida, vem outra junto. No salão, de segunda a sexta, das 17h às 19h.","until":"","enabled":true},
  {"id":"8c2d4f10-3a5b-4c6d-9e7f-0a1b2c3d0005","name":"Sexta do bacalhau","kind":"desconto","itemCodes":["BT-BACALHAU","BT-VINHO-T"],"days":[5],"start":"","end":"","rule":"Com o Bacalhau à Gomes de Sá, a taça de Casillero del Diablo Cabernet Sauvignon sai pela metade do preço. Até duas taças por prato.","until":"","enabled":true},
  {"id":"8c2d4f10-3a5b-4c6d-9e7f-0a1b2c3d0006","name":"Fim de semana em família","kind":"cortesia","itemCodes":["BT-KIDS","BT-PARMEGIA","BT-PAELLA"],"days":[0,6],"start":"","end":"","rule":"Um prato Kids cortesia para cada prato para dois pedido na mesa. Sábado e domingo, crianças até 10 anos.","until":"","enabled":true},
  {"id":"8c2d4f10-3a5b-4c6d-9e7f-0a1b2c3d0007","name":"Domingo à noite do caldinho","kind":"combo","itemCodes":["BT-CALDINHO","BT-PASTEL","BT-STELLA"],"days":[0],"start":"18:00","end":"","rule":"Caldinho de camarão, pastel de carne de sol e uma Stella Artois long neck juntos, por pessoa. A partir das 18h.","until":"","enabled":false,"why":"Domingo à noite costuma esvaziar depois do almoço em família; um petisco com cerveja segura quem já está no bairro. Ative se fizer sentido para a equipe."}
]$json$::jsonb
where slug = 'bistro-teste';
