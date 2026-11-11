// Conteúdo estático da FAQ. Política FICTÍCIA de um serviço de exemplo:
// não é legislação, não é orientação jurídica e não é a política do Tipe.

export const REFUND_FAQ = {
  id: "refund",
  question: "Como funciona o reembolso?",
  policyVersion: "v1",
  policy: [
    "Serviço fictício usado apenas como exemplo.",
    "O pedido de reembolso pode ser feito em até 7 dias corridos a partir da contratação.",
    "Todo pedido passa por análise antes de ser aprovado.",
    "Quando aprovado, o estorno é feito preferencialmente pelo mesmo meio de pagamento usado na compra.",
  ],
} as const;

/**
 * Chave de cache compartilhada por TODAS as requisições desta FAQ.
 * A resposta é pública e idêntica para todos, então pode ser compartilhada.
 * Troque o sufixo (v1 -> v2) sempre que a política, o prompt ou o modelo mudarem.
 * Nunca reutilize esta chave para conteúdo personalizado ou diferente.
 */
export const REFUND_CACHE_KEY = "faq:refund:v1";
export const REFUND_CACHE_TTL_SECONDS = 3600;

const SYSTEM_PROMPT = [
  "Você é o assistente de FAQ de um serviço fictício.",
  "Responda em português do Brasil, em no máximo 3 frases curtas, em texto simples sem markdown.",
  "Use somente a política fornecida. Não invente prazos, valores, exceções ou leis.",
  "Deixe claro que a política é deste serviço e não constitui orientação jurídica.",
].join(" ");

/** Corpo determinístico: mesmo texto, mesma ordem, temperatura 0, sem streaming. */
export function buildRefundChatRequest(model: string) {
  return {
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Política:\n- ${REFUND_FAQ.policy.join("\n- ")}\n\nPergunta: ${REFUND_FAQ.question}`,
      },
    ],
    temperature: 0,
    max_tokens: 200,
    stream: false,
  };
}
