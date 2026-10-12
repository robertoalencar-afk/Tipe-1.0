CREATE OR REPLACE FUNCTION public.pdv_close_table(p_slug text, p_table text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_rid uuid;
BEGIN
  SELECT id INTO v_rid FROM restaurants WHERE slug = p_slug;
  IF v_rid IS NULL OR NOT has_restaurant_role(auth.uid(), v_rid, ARRAY['owner','cashier']::app_role[]) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF EXISTS (SELECT 1 FROM table_payment_requests WHERE restaurant_slug = p_slug AND table_number = p_table AND status = 'pending' AND payment_target = 'restaurant') THEN RAISE EXCEPTION 'Há pagamentos aguardando confirmação'; END IF;
  -- Gorjetas extras pendentes não pertencem à conta do restaurante: viram "failed" e são arquivadas.
  UPDATE table_payment_requests SET status = 'failed' WHERE restaurant_slug = p_slug AND table_number = p_table AND status = 'pending' AND payment_target = 'tipe';
  PERFORM archive_and_reopen_table(p_slug, p_table);
END; $function$;

CREATE OR REPLACE FUNCTION public.pdv_ingest_event(p_restaurant uuid, p_adapter text, p_event_id text, p_event jsonb)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_slug text; v_ev uuid; v_type text := p_event->>'type';
  v_table text := left(trim(p_event#>>'{table,number}'), 16);
  v_t record; v_row record; v_code text; v_qty integer; v_free numeric;
BEGIN
  SELECT slug INTO v_slug FROM restaurants WHERE id = p_restaurant;
  IF v_slug IS NULL THEN RAISE EXCEPTION 'Restaurante inexistente'; END IF;
  INSERT INTO pdv_events (restaurant_id, adapter, direction, external_event_id, event_type)
  VALUES (p_restaurant, p_adapter, 'in', left(p_event_id, 120), coalesce(v_type, 'unknown'))
  ON CONFLICT (restaurant_id, adapter, direction, external_event_id) DO NOTHING RETURNING id INTO v_ev;
  IF v_ev IS NULL THEN RETURN 'duplicate'; END IF;
  BEGIN
    IF v_table IS NULL OR v_table !~ '^[0-9A-Za-z]{1,16}$' THEN RAISE EXCEPTION 'Mesa inválida'; END IF;
    SELECT id, active INTO v_t FROM restaurant_tables WHERE restaurant_id = p_restaurant AND number = v_table;
    IF v_type IN ('table_opened','item_added') THEN
      IF NOT FOUND THEN
        INSERT INTO restaurant_tables (restaurant_id, number, code, external_id, source_adapter)
        VALUES (p_restaurant, v_table, 'mesa' || lower(v_table), p_event#>>'{table,external_id}', p_adapter);
      ELSIF NOT v_t.active THEN RAISE EXCEPTION 'Mesa desativada';
      END IF;
    ELSIF NOT FOUND THEN RAISE EXCEPTION 'Mesa inexistente';
    END IF;
    IF v_type = 'item_added' THEN
      v_qty := (p_event#>>'{item,quantity}')::integer;
      IF v_qty IS NULL OR v_qty < 1 OR v_qty > 999 THEN RAISE EXCEPTION 'Quantidade inválida'; END IF;
      v_code := left(coalesce(nullif(p_event#>>'{item,code}',''), 'ext-' || (p_event#>>'{item,external_id}')), 32);
      IF v_code IS NULL THEN RAISE EXCEPTION 'Item sem identificação'; END IF;
      INSERT INTO table_bill_items (restaurant_slug, table_number, item_code, item_name, unit_price, ordered_quantity, ordered_by, ordered_at, external_id, source_adapter, notes)
      VALUES (v_slug, v_table, v_code, left(p_event#>>'{item,name}', 80), (p_event#>>'{item,unit_price}')::numeric, v_qty,
              left(coalesce(nullif(p_event#>>'{item,waiter_name}',''), 'PDV'), 80), now(), p_event#>>'{item,external_id}', p_adapter, left(nullif(p_event#>>'{item,notes}',''), 140))
      ON CONFLICT (restaurant_slug, table_number, item_code) DO UPDATE
        SET ordered_quantity = table_bill_items.ordered_quantity + EXCLUDED.ordered_quantity, ordered_at = now();
    ELSIF v_type = 'item_cancelled' THEN
      v_qty := (p_event#>>'{item,quantity}')::integer;
      v_code := coalesce(nullif(p_event#>>'{item,code}',''), 'ext-' || (p_event#>>'{item,external_id}'));
      SELECT * INTO v_row FROM table_bill_items WHERE restaurant_slug = v_slug AND table_number = v_table AND item_code = v_code FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Item inexistente'; END IF;
      v_free := least(v_row.ordered_quantity - v_row.reserved_portion - v_row.paid_portion,
                      v_row.ordered_quantity - v_row.reserved_quantity - v_row.paid_quantity);
      IF v_qty IS NULL OR v_qty < 1 OR v_qty > v_free THEN RAISE EXCEPTION 'Item já pago ou reservado não pode ser cancelado'; END IF;
      IF v_row.ordered_quantity = v_qty THEN DELETE FROM table_bill_items WHERE id = v_row.id;
      ELSE UPDATE table_bill_items SET ordered_quantity = ordered_quantity - v_qty WHERE id = v_row.id; END IF;
      INSERT INTO pdv_voids (restaurant_id, table_number, item_code, item_name, unit_price, quantity, reason, actor_id)
      VALUES (p_restaurant, v_table, v_code, v_row.item_name, v_row.unit_price, v_qty, left('Cancelado no sistema: ' || coalesce(p_event->>'reason','sem motivo'), 140), NULL);
    ELSIF v_type = 'table_closed' THEN
      IF EXISTS (SELECT 1 FROM table_payment_requests WHERE restaurant_slug = v_slug AND table_number = v_table AND status = 'pending' AND payment_target = 'restaurant') THEN
        RAISE EXCEPTION 'Mesa com pagamento pendente';
      END IF;
      UPDATE table_payment_requests SET status = 'failed' WHERE restaurant_slug = v_slug AND table_number = v_table AND status = 'pending' AND payment_target = 'tipe';
      PERFORM archive_and_reopen_table(v_slug, v_table);
    ELSIF v_type <> 'table_opened' THEN
      RAISE EXCEPTION 'Tipo de evento desconhecido';
    END IF;
    UPDATE pdv_events SET detail = left(coalesce(v_type,'') || ' mesa ' || v_table, 200) WHERE id = v_ev;
    RETURN 'ok';
  EXCEPTION WHEN OTHERS THEN
    UPDATE pdv_events SET status = 'error', detail = left(SQLERRM, 200) WHERE id = v_ev;
    RETURN 'error:' || left(SQLERRM, 160);
  END;
END; $function$;