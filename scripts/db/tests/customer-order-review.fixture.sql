-- Somente banco descartável de testes. Recusa banco que já contenha tabelas.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_tables WHERE schemaname='public') THEN RAISE EXCEPTION 'O banco de teste deve estar vazio'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END $$;
CREATE EXTENSION pgcrypto;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE TYPE app_role AS ENUM('founder','owner','manager','cashier','waiter');
CREATE TABLE restaurants(id uuid PRIMARY KEY,slug text);
CREATE TABLE user_roles(user_id uuid,restaurant_id uuid,role app_role);
CREATE FUNCTION has_restaurant_role(uuid,uuid,app_role[]) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT EXISTS(SELECT 1 FROM user_roles WHERE user_id=$1 AND restaurant_id=$2 AND role=ANY($3)) $$;
CREATE TABLE restaurant_tables(restaurant_id uuid,number text,active boolean,session_token text, PRIMARY KEY(restaurant_id,number));
CREATE TABLE pdv_menu_items(restaurant_id uuid,code text,name text,price numeric,sector text,available boolean);
CREATE TABLE pdv_orders(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),restaurant_id uuid,table_number text,channel text,customer_name text,request_id text,UNIQUE(restaurant_id,request_id));
CREATE TABLE pdv_order_items(order_id uuid,restaurant_id uuid,item_code text,item_name text,unit_price numeric,quantity integer,notes text,sector text);
CREATE TABLE table_bill_items(restaurant_slug text,table_number text,item_code text,item_name text,unit_price numeric,ordered_quantity integer,ordered_by text,ordered_at timestamptz,source_adapter text,notes text,UNIQUE(restaurant_slug,table_number,item_code));
CREATE FUNCTION table_ordering_block(uuid,text,text) RETURNS text LANGUAGE sql AS $$ SELECT coalesce(nullif(current_setting('test.order_block',true),''),'open') $$;
CREATE FUNCTION table_is_over_limit(uuid,text) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
