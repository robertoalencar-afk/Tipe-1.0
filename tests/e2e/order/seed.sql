-- Dados fictícios para os testes de ponta a ponta do Tipe Order (banco local tipe_e2e).
-- Dois restaurantes: "Casa do Caju" com Tipe Pay + Tipe Order e "Bar da Orla" só com Tipe Pay.
SET search_path = public, extensions;

-- O Supabase falso passa as claims como JSON (request.jwt.claims), como o PostgREST atual.
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''), nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'sub')::uuid
$$;

DO $$
DECLARE
  v_caju uuid; v_orla uuid; c_pratos uuid; c_bebidas uuid; c_sobremesas uuid;
  u_dono uuid := '00000000-0000-4000-8000-0000000000d1';
  u_ana uuid := '00000000-0000-4000-8000-0000000000a1';
  u_dono_orla uuid := '00000000-0000-4000-8000-0000000000d2';
  u_fundador uuid := '00000000-0000-4000-8000-0000000000f1';
  w_ana uuid;
BEGIN
  INSERT INTO restaurants (slug, name, pos_provider, pos_mode, onboarding_step, address, opening_hours)
  VALUES ('casa-do-caju', 'Casa do Caju', 'none', 'tipe', 'done', 'Rua dos Tabajaras, Fortaleza - CE', 'Ter a Dom, 11h às 23h')
  RETURNING id INTO v_caju;
  INSERT INTO restaurants (slug, name, pos_provider, pos_mode, onboarding_step, address)
  VALUES ('bar-da-orla', 'Bar da Orla', 'none', 'tipe', 'done', 'Av. Beira Mar, Fortaleza - CE')
  RETURNING id INTO v_orla;

  INSERT INTO restaurant_tables (restaurant_id, number) SELECT v_caju, n::text FROM generate_series(1, 8) n;
  INSERT INTO restaurant_tables (restaurant_id, number) SELECT v_orla, n::text FROM generate_series(1, 6) n;
  UPDATE restaurant_tables SET access_token = 'qrcaju' || number || 'token00' WHERE restaurant_id = v_caju;
  UPDATE restaurant_tables SET access_token = 'qrorla' || number || 'token00' WHERE restaurant_id = v_orla;

  INSERT INTO auth.users (id, email) VALUES
    (u_dono, 'dono@casadocaju.test'), (u_ana, 'ana@casadocaju.test'),
    (u_dono_orla, 'dono@bardaorla.test'), (u_fundador, 'fundador@tipe.test');
  INSERT INTO user_roles (user_id, role, restaurant_id) VALUES
    (u_dono, 'owner', v_caju), (u_ana, 'waiter', v_caju), (u_dono_orla, 'owner', v_orla);
  INSERT INTO user_roles (user_id, role) VALUES (u_fundador, 'founder');
  INSERT INTO staff_members (restaurant_id, user_id, display_name, email) VALUES
    (v_caju, u_dono, 'Helena Dono', 'dono@casadocaju.test'), (v_caju, u_ana, 'Ana Souza', 'ana@casadocaju.test'),
    (v_orla, u_dono_orla, 'Caio Dono', 'dono@bardaorla.test');
  INSERT INTO pdv_waiters (restaurant_id, code, name, user_id, email) VALUES (v_caju, 'G01', 'Ana Souza', u_ana, 'ana@casadocaju.test') RETURNING id INTO w_ana;
  UPDATE restaurant_tables SET waiter_id = w_ana WHERE restaurant_id = v_caju;

  INSERT INTO pdv_menu_categories (restaurant_id, name, position) VALUES (v_caju, 'Pratos', 1) RETURNING id INTO c_pratos;
  INSERT INTO pdv_menu_categories (restaurant_id, name, position) VALUES (v_caju, 'Bebidas', 2) RETURNING id INTO c_bebidas;
  INSERT INTO pdv_menu_categories (restaurant_id, name, position) VALUES (v_caju, 'Sobremesas', 3) RETURNING id INTO c_sobremesas;
  INSERT INTO pdv_menu_items (restaurant_id, category_id, code, name, price, sector, position, description) VALUES
    (v_caju, c_pratos, 'baiao', 'Baião de dois', 42.00, 'kitchen', 1, 'Arroz, feijão-verde, queijo coalho e nata'),
    (v_caju, c_pratos, 'peixe', 'Peixe na brasa', 68.00, 'kitchen', 2, 'Filé de pargo com pirão e salada'),
    (v_caju, c_pratos, 'tapioca', 'Tapioca de carne de sol', 28.00, 'kitchen', 3, 'Com queijo coalho e manteiga de garrafa'),
    (v_caju, c_bebidas, 'caju', 'Suco de caju', 9.50, 'bar', 1, 'Copo de 400 ml'),
    (v_caju, c_bebidas, 'coco', 'Água de coco', 8.00, 'bar', 2, NULL),
    (v_caju, c_sobremesas, 'cartola', 'Cartola', 19.00, 'kitchen', 1, 'Banana, queijo coalho, açúcar e canela');

  -- Bar da Orla só tem a conta: um pedido lançado pela equipe na mesa 3.
  INSERT INTO table_bill_items (restaurant_slug, table_number, item_code, item_name, unit_price, ordered_quantity, ordered_by, ordered_at)
  VALUES ('bar-da-orla', '3', 'chope', 'Chope 300 ml', 12.00, 4, 'Equipe', now() - interval '40 minutes'),
         ('bar-da-orla', '3', 'isca', 'Isca de peixe', 54.00, 1, 'Equipe', now() - interval '35 minutes');

  UPDATE restaurants SET self_order_enabled = true, order_session_mode = 'staff_opens' WHERE id = v_caju;
  -- O Bar da Orla até liga a opção, mas sem o módulo contratado o servidor recusa.
  UPDATE restaurants SET self_order_enabled = true WHERE id = v_orla;
  PERFORM set_restaurant_module(v_caju, 'order', 'active', NULL, u_fundador, 'founder');
END $$;
