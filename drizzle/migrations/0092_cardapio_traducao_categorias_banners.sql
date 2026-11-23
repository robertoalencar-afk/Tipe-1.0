-- Cardápio em inglês e espanhol além dos pratos: nomes de categorias (coluna i18n),
-- banners e promoções (campo i18n em cada item de menu_posts e menu_promos). Cada
-- tradução guarda `src`, o texto em português de quando foi feita: se o dono mudar o
-- texto, o cliente volta a ver o português até a Lebre traduzir de novo.
alter table public.pdv_menu_categories add column if not exists i18n jsonb not null default '{}'::jsonb;

-- A Lebre publica as traduções com compare-and-swap e só com a tradução ligada.
create or replace function public.publish_menu_extras_i18n(
  p_restaurant uuid, p_languages text[], p_categories jsonb,
  p_posts_prev jsonb, p_posts jsonb, p_promos_prev jsonb, p_promos jsonb)
returns boolean
language plpgsql security invoker set search_path = '' as $$
begin
  perform 1 from public.menu_assistant
  where restaurant_id = p_restaurant and enabled and auto_translate and languages = p_languages
  for share;
  if not found then return false; end if;
  update public.pdv_menu_categories c set i18n = x.i18n
  from jsonb_to_recordset(coalesce(p_categories, '[]'::jsonb)) as x(id uuid, name text, i18n jsonb)
  where c.restaurant_id = p_restaurant and c.id = x.id and c.name = x.name;
  update public.restaurants set menu_posts = p_posts
  where id = p_restaurant and menu_posts is not distinct from p_posts_prev and p_posts is not null;
  update public.restaurants set menu_promos = p_promos
  where id = p_restaurant and menu_promos is not distinct from p_promos_prev and p_promos is not null;
  return true;
end; $$;
revoke all on function public.publish_menu_extras_i18n(uuid, text[], jsonb, jsonb, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.publish_menu_extras_i18n(uuid, text[], jsonb, jsonb, jsonb, jsonb, jsonb) to service_role;

-- Bistrô Teste: traduções revisadas de categorias, banners e promoções.
do $$
declare rid uuid;
  posts jsonb := '{"5b0c1e9a-0f3d-4c11-9a51-0a8d8a1e0001": {"en": {"title": "Shrimp Tuesday", "caption": "Order a shrimp dish for two and dessert is on the house. Just ask your waiter."}, "es": {"title": "Martes de camarón", "caption": "Pide un plato de camarón para dos y el postre es cortesía de la casa. Pídelo al mesero."}}, "5b0c1e9a-0f3d-4c11-9a51-0a8d8a1e0002": {"en": {"title": "Moqueca Wednesday", "caption": "Mixed Ceará-style moqueca for two with two glasses of Casillero del Diablo Sauvignon Blanc on the house."}, "es": {"title": "Miércoles de moqueca", "caption": "Moqueca cearense mixta para dos con dos copas de Casillero del Diablo Sauvignon Blanc por cuenta de la casa."}}, "5b0c1e9a-0f3d-4c11-9a51-0a8d8a1e0003": {"en": {"title": "Happy hour 5 to 7 pm", "caption": "Double Heineken long neck: order one and the second comes with it. Dine-in, Monday to Friday."}, "es": {"title": "Happy hour de 17h a 19h", "caption": "Heineken long neck doble: pides una y la segunda viene con ella. En el salón, de lunes a viernes."}}, "5b0c1e9a-0f3d-4c11-9a51-0a8d8a1e0007": {"en": {"title": "Bacalhau Friday", "caption": "Bacalhau à Gomes de Sá fresh from the oven, and a glass of Casillero del Diablo Cabernet Sauvignon at half price."}, "es": {"title": "Viernes de bacalao", "caption": "Bacalao a la Gomes de Sá recién salido del horno, y la copa de Casillero del Diablo Cabernet Sauvignon a mitad de precio."}}, "5b0c1e9a-0f3d-4c11-9a51-0a8d8a1e0004": {"en": {"title": "New: octopus in olive oil", "caption": "Tender grilled octopus with garlic, sun-dried tomatoes and smashed potatoes. Here to stay."}, "es": {"title": "Nuevo: pulpo al aceite de oliva", "caption": "Pulpo tierno a la parrilla, con ajo, tomate seco y papas aplastadas. Llegó para quedarse."}}, "5b0c1e9a-0f3d-4c11-9a51-0a8d8a1e0005": {"en": {"title": "Family weekend", "caption": "On Saturdays and Sundays, one Kids meal is on the house for each dish for two at the table."}, "es": {"title": "Fin de semana en familia", "caption": "Sábados y domingos, el plato Kids es cortesía por cada plato para dos de la mesa."}}, "5b0c1e9a-0f3d-4c11-9a51-0a8d8a1e0006": {"en": {"title": "New: churros with dulce de leche", "caption": "Crispy, with sugar and cinnamon, and dulce de leche for dipping. The house''s new dessert."}, "es": {"title": "Nuevo: churros con dulce de leche", "caption": "Crujientes, con azúcar y canela, y dulce de leche para mojar. El nuevo postre de la casa."}}}'::jsonb;
  promos jsonb := '{"8c2d4f10-3a5b-4c6d-9e7f-0a1b2c3d0001": {"en": {"name": "Executive Monday", "rule": "Single-serving dish (sun-dried beef or grilled shrimp) with a Coca-Cola can. Per person, dine-in, at lunch. Cannot be combined."}, "es": {"name": "Lunes ejecutivo", "rule": "Plato individual (carne de sol o camarones a la parrilla) con Coca-Cola en lata. Por persona, en el salón, al almuerzo. No acumulable."}}, "8c2d4f10-3a5b-4c6d-9e7f-0a1b2c3d0002": {"en": {"name": "Shrimp Tuesday", "rule": "With a shrimp dish for two, one dessert per table is on the house. Cannot be combined with other offers."}, "es": {"name": "Martes de camarón", "rule": "Con un plato de camarón para dos, un postre por mesa es cortesía. No acumulable con otras promociones."}}, "8c2d4f10-3a5b-4c6d-9e7f-0a1b2c3d0003": {"en": {"name": "Moqueca Wednesday", "rule": "With the mixed Ceará-style moqueca for two, two glasses of Casillero del Diablo Sauvignon Blanc on the house. Once per table."}, "es": {"name": "Miércoles de moqueca", "rule": "Con la moqueca cearense mixta para dos, dos copas de Casillero del Diablo Sauvignon Blanc por cuenta de la casa. Una vez por mesa."}}, "8c2d4f10-3a5b-4c6d-9e7f-0a1b2c3d0004": {"en": {"name": "Happy hour", "rule": "Double Heineken long neck: for each one ordered, another comes with it. Dine-in, Monday to Friday, 5 to 7 pm."}, "es": {"name": "Happy hour", "rule": "Heineken long neck doble: por cada una pedida, viene otra. En el salón, de lunes a viernes, de 17h a 19h."}}, "8c2d4f10-3a5b-4c6d-9e7f-0a1b2c3d0005": {"en": {"name": "Bacalhau Friday", "rule": "With the Bacalhau à Gomes de Sá, a glass of Casillero del Diablo Cabernet Sauvignon is half price. Up to two glasses per dish."}, "es": {"name": "Viernes de bacalao", "rule": "Con el Bacalao a la Gomes de Sá, la copa de Casillero del Diablo Cabernet Sauvignon sale a mitad de precio. Hasta dos copas por plato."}}, "8c2d4f10-3a5b-4c6d-9e7f-0a1b2c3d0006": {"en": {"name": "Family weekend", "rule": "One Kids meal on the house for each dish for two ordered at the table. Saturday and Sunday, children up to 10."}, "es": {"name": "Fin de semana en familia", "rule": "Un plato Kids de cortesía por cada plato para dos pedido en la mesa. Sábado y domingo, niños hasta 10 años."}}, "8c2d4f10-3a5b-4c6d-9e7f-0a1b2c3d0007": {"en": {"name": "Sunday night caldinho", "rule": "Shrimp broth, sun-dried beef pastel and a Stella Artois long neck together, per person. From 6 pm."}, "es": {"name": "Domingo de caldito", "rule": "Caldito de camarón, pastel de carne de sol y una Stella Artois long neck juntos, por persona. Desde las 18h."}}}'::jsonb;
begin
  select id into rid from public.restaurants where slug = 'bistro-teste';
  if rid is null then return; end if;

  update public.pdv_menu_categories c
  set i18n = jsonb_build_object('src', c.name, 'en', t.en, 'es', t.es)
  from (values
    ('Entradas', 'Starters', 'Entrantes'),
    ('Saladas', 'Salads', 'Ensaladas'),
    ('Camarões', 'Shrimp', 'Camarones'),
    ('Peixes e frutos do mar', 'Fish and seafood', 'Pescados y mariscos'),
    ('Carnes e aves', 'Meat and poultry', 'Carnes y aves'),
    ('Pratos individuais', 'Single-serving dishes', 'Platos individuales'),
    ('Kids', 'Kids', 'Niños'),
    ('Sobremesas', 'Desserts', 'Postres'),
    ('Águas, sucos e refrigerantes', 'Water, juices and soft drinks', 'Aguas, jugos y refrescos'),
    ('Cafés', 'Coffee', 'Cafés'),
    ('Cervejas sem álcool', 'Non-alcoholic beers', 'Cervezas sin alcohol'),
    ('Cervejas', 'Beers', 'Cervezas'),
    ('Coquetéis', 'Cocktails', 'Cócteles'),
    ('Vinhos em taça', 'Wine by the glass', 'Vinos por copa'),
    ('Acompanhamentos', 'Sides', 'Guarniciones'),
    ('Principais', 'Mains', 'Principales')
  ) as t(name, en, es)
  where c.restaurant_id = rid and c.name = t.name;

  update public.restaurants r
  set menu_posts = (
    select coalesce(jsonb_agg(
      case when posts ? (p->>'id') then p || jsonb_build_object('i18n',
        (posts -> (p->>'id')) || jsonb_build_object('src',
          '[' || to_json(p->>'title')::text || ',' || to_json(p->>'caption')::text || ']'))
      else p end order by ord), '[]'::jsonb)
    from jsonb_array_elements(r.menu_posts) with ordinality as e(p, ord))
  where r.id = rid;

  update public.restaurants r
  set menu_promos = (
    select coalesce(jsonb_agg(
      case when promos ? (p->>'id') then p || jsonb_build_object('i18n',
        (promos -> (p->>'id')) || jsonb_build_object('src',
          '[' || to_json(p->>'name')::text || ',' || to_json(p->>'rule')::text || ']'))
      else p end order by ord), '[]'::jsonb)
    from jsonb_array_elements(r.menu_promos) with ordinality as e(p, ord))
  where r.id = rid;
end $$;
