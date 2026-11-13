-- Somente banco descartável. Nunca executar em produção.
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END $$;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE TYPE public.app_role AS ENUM('founder','owner','manager','cashier','waiter');
CREATE TABLE public.restaurants(id uuid PRIMARY KEY,slug text,cnpj text);
CREATE TABLE public.pdv_menu_items(id uuid PRIMARY KEY,restaurant_id uuid REFERENCES public.restaurants(id),code text);
CREATE TABLE public.user_roles(user_id uuid,restaurant_id uuid,role public.app_role);
CREATE FUNCTION public.has_restaurant_role(_user_id uuid,_restaurant_id uuid,_roles public.app_role[])
RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND restaurant_id=_restaurant_id AND role=ANY(_roles)) $$;
CREATE SCHEMA extensions;
CREATE FUNCTION extensions.gen_random_bytes(integer) RETURNS bytea LANGUAGE sql AS $$ SELECT public.gen_random_bytes($1) $$;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;
CREATE TABLE restaurant_tables(restaurant_id uuid,number text,session_token text,waiter_id uuid,PRIMARY KEY(restaurant_id,number));
CREATE TABLE table_bill_items(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),restaurant_slug text,table_number text,item_code text,item_name text,unit_price numeric,ordered_quantity integer,paid_portion numeric,reserved_portion numeric);
CREATE TABLE table_payment_requests(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),restaurant_slug text,table_number text,customer_name text,payment_target text,payment_method text,status text,amount numeric,item_quantities jsonb,created_at timestamptz DEFAULT now(),idempotency_key text,waiter_id uuid,establishment_method text,cash_received numeric,change_due numeric,service_rate_suggested numeric,service_fee_suggested numeric,service_fee_amount numeric,service_fee_changed boolean,provider text,provider_order_id text);
CREATE TABLE archived_payments(LIKE table_payment_requests INCLUDING ALL);
CREATE TABLE payment_audit_log(payment_id uuid,restaurant_slug text,table_number text,action text,actor_id uuid,amount numeric);
