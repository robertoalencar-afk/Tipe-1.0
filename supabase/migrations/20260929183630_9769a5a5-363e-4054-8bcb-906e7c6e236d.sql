DO $$
DECLARE v_rid uuid; v_d integer; v_n integer; v_order uuid; v_w uuid; v_it record;
BEGIN
  SELECT id INTO v_rid FROM restaurants WHERE slug = 'marealta';
  IF v_rid IS NULL OR (SELECT count(*) FROM pdv_orders WHERE restaurant_id = v_rid AND created_at < now() - interval '4 days') > 5 THEN RETURN; END IF;
  FOR v_d IN 1..7 LOOP
    FOR v_n IN 1..6 LOOP
      SELECT id INTO v_w FROM pdv_waiters WHERE restaurant_id = v_rid ORDER BY random() LIMIT 1;
      INSERT INTO pdv_orders (restaurant_id, table_number, waiter_id, created_at)
      VALUES (v_rid, (1 + floor(random()*20))::int::text, v_w, now() - make_interval(days => v_d, hours => floor(random()*8)::int))
      RETURNING id INTO v_order;
      FOR v_it IN SELECT code, name, price, sector FROM pdv_menu_items WHERE restaurant_id = v_rid ORDER BY random() LIMIT 4 LOOP
        INSERT INTO pdv_order_items (order_id, restaurant_id, item_code, item_name, unit_price, quantity, sector, status, created_at)
        SELECT v_order, v_rid, v_it.code, v_it.name, v_it.price, 1 + floor(random()*3)::int, v_it.sector, 'delivered', created_at FROM pdv_orders WHERE id = v_order;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;