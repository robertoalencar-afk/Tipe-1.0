-- 04/11 (Roberto): o Tipe Order sai de "em desenvolvimento" e fica disponível no site. Só o
-- Tipe Guest continua "em breve" (ele não usa esta tabela).
INSERT INTO public.product_launch_states (product_slug, state, updated_at)
VALUES ('order', 'disponivel', now())
ON CONFLICT (product_slug) DO UPDATE SET state = 'disponivel', updated_at = now();
