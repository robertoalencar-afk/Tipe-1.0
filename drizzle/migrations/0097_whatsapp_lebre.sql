-- WhatsApp comercial da Tipe: a Lebre atende as conversas que chegam pelo número oficial
-- (Cloud API da Meta), qualifica o restaurante, oferece a demonstração e passa para a
-- equipe quando precisa de uma pessoa. Só responde dentro da janela de 24 h aberta pelo
-- próprio cliente; nunca inicia conversa. Idempotente.

ALTER TABLE public.wa_conversations
  ADD COLUMN IF NOT EXISTS lebre_ativa boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ficha jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS temperatura text CHECK (temperatura IS NULL OR temperatura IN ('frio', 'morno', 'quente')),
  ADD COLUMN IF NOT EXISTS etapa text NOT NULL DEFAULT 'novo'
    CHECK (etapa IN ('novo', 'qualificando', 'qualificado', 'demo', 'cliente', 'perdido')),
  ADD COLUMN IF NOT EXISTS precisa_humano boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS motivo_humano text CHECK (motivo_humano IS NULL OR length(motivo_humano) <= 300),
  ADD COLUMN IF NOT EXISTS origem text CHECK (origem IS NULL OR length(origem) <= 40),
  ADD COLUMN IF NOT EXISTS optout boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS prospect_id uuid REFERENCES public.crm_prospects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lebre_respostas integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS primeira_resposta_at timestamptz;

CREATE INDEX IF NOT EXISTS wa_conversations_fila_idx
  ON public.wa_conversations (precisa_humano, last_message_at DESC);

-- Quem escreveu cada mensagem enviada: a Lebre ou uma pessoa da equipe.
ALTER TABLE public.wa_messages
  ADD COLUMN IF NOT EXISTS autor text CHECK (autor IS NULL OR autor IN ('lebre', 'equipe'));

-- Chave geral do atendimento automático (uma linha só). Desligada, a Lebre não responde
-- ninguém e todas as conversas ficam na fila da equipe.
CREATE TABLE IF NOT EXISTS public.wa_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  lebre_ativa boolean NOT NULL DEFAULT true,
  limite_por_conversa integer NOT NULL DEFAULT 30 CHECK (limite_por_conversa BETWEEN 1 AND 200),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
INSERT INTO public.wa_settings (id) VALUES (true) ON CONFLICT DO NOTHING;
ALTER TABLE public.wa_settings ENABLE ROW LEVEL SECURITY;
-- Sem políticas: só o servidor (service role) lê e grava, depois de conferir o acesso à Central.
