-- Papel Gerente (manager). Sozinho neste arquivo: ALTER TYPE ADD VALUE não roda junto de outros comandos na mesma transação.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'manager';
