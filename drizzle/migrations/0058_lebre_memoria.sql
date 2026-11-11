-- Memória da Lebre: o que ela aprende com cada restaurante e com cada usuário do painel.
-- Só preferências e fatos de operação ("mesa 10 é a varanda", "me responda em lista").
-- O servidor filtra dado sensível antes de gravar (CPF, cartão, senha, e-mail, telefone,
-- chave Pix, saúde); aqui ficam os limites de tamanho e o acesso.
-- user_id nulo = memória do restaurante inteiro; preenchido = só daquele usuário.
CREATE TABLE IF NOT EXISTS public.lebre_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) BETWEEN 3 AND 200),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lebre_memories_rest_user ON public.lebre_memories (restaurant_id, user_id, used_at DESC);

ALTER TABLE public.lebre_memories ENABLE ROW LEVEL SECURITY;

-- Leitura: memórias do restaurante para quem é da equipe; as pessoais só para o próprio usuário.
DROP POLICY IF EXISTS lebre_memories_read ON public.lebre_memories;
CREATE POLICY lebre_memories_read ON public.lebre_memories FOR SELECT TO authenticated
  USING (
    (user_id IS NULL AND public.has_restaurant_role(auth.uid(), restaurant_id, ARRAY['owner','founder','manager','cashier','waiter']::public.app_role[]))
    OR user_id = auth.uid()
  );
-- Cada usuário apaga as próprias; o dono apaga as do restaurante.
DROP POLICY IF EXISTS lebre_memories_delete ON public.lebre_memories;
CREATE POLICY lebre_memories_delete ON public.lebre_memories FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR (user_id IS NULL AND public.has_restaurant_role(auth.uid(), restaurant_id, ARRAY['owner','founder']::public.app_role[]))
  );
-- Gravação só pelo servidor (service_role), depois do filtro de dado sensível.
REVOKE INSERT, UPDATE ON public.lebre_memories FROM anon, authenticated;
GRANT SELECT, DELETE ON public.lebre_memories TO authenticated;
