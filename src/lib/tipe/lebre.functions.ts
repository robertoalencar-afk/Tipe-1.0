import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Question = z.string().trim().min(2).max(600);
const Slug = z.string().min(1).max(64).regex(/^[a-z0-9-]+$/);

export type LebreProposal = {
  id: string;
  action: "add_table";
  title: string;
  summary: string;
  payload: { number: string };
};

export type LebreReply = { answer: string; proposal?: LebreProposal };

const publicFacts = `
A TIPE leva a conta para o celular pelo QR Code da mesa, sem aplicativo.
O cliente vê os itens, escolhe o que deseja pagar e pode dividir um item por duas, três ou quatro pessoas.
Pagamentos no estabelecimento podem ser feitos em dinheiro ou maquininha e aguardam confirmação do restaurante.
A TIPE oferece 30 dias grátis, sem cartão e sem fidelidade. Os planos publicados começam em R$ 49,90 por mês.
O restaurante pode usar o PDV TIPE ou solicitar uma integração assistida com o PDV que já usa.
Não afirme que uma marca específica já está homologada. Diga que a equipe confirma a compatibilidade.
Apple Pay e Google Pay dependem da habilitação comercial do provedor e ainda não devem ser apresentados como ativos.
Para experimentar, indique /simulador. Para criar a conta, indique /cadastro. Para falar com a equipe, indique #fale-conosco.
`;

function readOutput(body: unknown): string {
  const value = body as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> };
  if (value.output_text) return value.output_text.trim();
  return value.output?.flatMap((item) => item.content ?? []).map((part) => part.text ?? "").join("").trim() ?? "";
}

async function askModel(instructions: string, question: string) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return "A Lebre está se preparando para responder. Enquanto isso, você pode simular a experiência ou falar com nossa equipe.";
  const response = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({ model: "openai/gpt-6-astra", instructions, input: question, stream: false, store: false, reasoning: { effort: "low" } }),
  });
  if (!response.ok) throw new Error(response.status === 429 ? "A Lebre recebeu muitas perguntas agora. Tente novamente em instantes." : "A Lebre não conseguiu responder agora.");
  const text = readOutput(await response.json());
  if (!text) throw new Error("A Lebre não conseguiu responder agora.");
  return text;
}

export const askPublicLebre = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ question: Question }).parse(data))
  .handler(async ({ data }): Promise<LebreReply> => {
    const { enforceRate, clientIp } = await import("./security.server");
    await enforceRate(`lebre-public:${clientIp()}`, 12, 60);
    const answer = await askModel(
      `Você é a Lebre, especialista oficial da TIPE. Responda em português brasileiro, com tom pessoal, claro e breve. Nunca use travessões. Use somente os fatos abaixo. Se não souber, diga que a equipe confirma. Não invente integrações, taxas, resultados ou funcionalidades.\n${publicFacts}`,
      data.question,
    );
    return { answer };
  });

export const askRestaurantLebre = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ slug: Slug, question: Question }).parse(data))
  .handler(async ({ data, context }): Promise<LebreReply> => {
    const { enforceRate, logSecurityEvent } = await import("./security.server");
    await enforceRate(`lebre-panel:${context.userId}`, 20, 60, data.slug);
    const { data: restaurant } = await context.supabase.from("restaurants").select("id, name, pos_mode, pos_provider").eq("slug", data.slug).maybeSingle();
    if (!restaurant) throw new Error("Restaurante não encontrado ou sem acesso.");
    const { data: roles } = await context.supabase.from("user_roles").select("role").eq("restaurant_id", restaurant.id).eq("user_id", context.userId);
    if (!roles?.length) throw new Error("Você não tem acesso a este restaurante.");
    const roleNames = roles.map((row) => row.role);
    const tableMatch = data.question.match(/(?:criar|cadastrar|adicionar|abrir)\s+(?:a\s+)?mesa\s+([0-9a-z]+)/i);
    if (tableMatch?.[1] && (roleNames.includes("owner") || roleNames.includes("founder"))) {
      const number = tableMatch[1].slice(0, 8);
      const proposal: LebreProposal = {
        id: crypto.randomUUID(), action: "add_table", title: `Cadastrar mesa ${number}`,
        summary: `A Lebre vai cadastrar a mesa ${number} em ${restaurant.name}. Nenhum pedido ou pagamento será alterado.`, payload: { number },
      };
      await logSecurityEvent({ action: "lebre_proposal", resource: "restaurant_table", restaurantSlug: data.slug, restaurantId: restaurant.id, actorId: context.userId, detail: proposal.summary });
      return { answer: "Posso preparar isso para você. Confira a ação antes de confirmar.", proposal };
    }
    const [tables, payments, items] = await Promise.all([
      context.supabase.from("restaurant_tables").select("number, active").eq("restaurant_id", restaurant.id),
      context.supabase.from("table_payment_requests").select("status, amount").eq("restaurant_slug", data.slug).eq("payment_target", "restaurant"),
      context.supabase.from("table_bill_items").select("ordered_quantity, paid_portion, unit_price").eq("restaurant_slug", data.slug),
    ]);
    const openValue = (items.data ?? []).reduce((sum, item) => sum + Math.max(0, Number(item.ordered_quantity) - Number(item.paid_portion)) * Number(item.unit_price), 0);
    const pending = (payments.data ?? []).filter((payment) => payment.status === "pending");
    const contextText = `Restaurante: ${restaurant.name}. Cargo do usuário: ${roleNames.join(", ")}. Mesas ativas: ${(tables.data ?? []).filter((table) => table.active).length}. Pagamentos pendentes: ${pending.length}. Valor aproximado ainda aberto, sem taxa de serviço: R$ ${openValue.toFixed(2)}. PDV: ${restaurant.pos_mode === "external" ? `externo, fornecedor ${restaurant.pos_provider ?? "não informado"}` : "TIPE"}.`;
    const answer = await askModel(
      `Você é a Lebre, assistente operacional da TIPE. Responda em português brasileiro, de forma pessoal, objetiva e sem travessões. Use somente o contexto fornecido. Não revele dados pessoais, não invente números e não diga que executou ações. Explique o uso do painel e sugira o próximo passo. Para alterações, explique que a pessoa pode pedir à Lebre e confirmar a proposta.\n${contextText}`,
      data.question,
    );
    return { answer };
  });

export const executeLebreProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ slug: Slug, proposalId: z.string().uuid(), action: z.literal("add_table"), number: z.string().min(1).max(8).regex(/^[0-9A-Za-z]+$/) }).parse(data))
  .handler(async ({ data, context }) => {
    const { logSecurityEvent } = await import("./security.server");
    const { data: restaurant } = await context.supabase.from("restaurants").select("id, name").eq("slug", data.slug).maybeSingle();
    if (!restaurant) throw new Error("Restaurante não encontrado.");
    const { data: allowed } = await context.supabase.rpc("has_restaurant_role", { _user_id: context.userId, _restaurant_id: restaurant.id, _roles: ["owner"] });
    if (!allowed) {
      await logSecurityEvent({ action: "lebre_execute_denied", resource: "restaurant_table", result: "denied", restaurantSlug: data.slug, restaurantId: restaurant.id, actorId: context.userId, detail: `proposal=${data.proposalId}` });
      throw new Error("Seu cargo não permite cadastrar mesas.");
    }
    const { error } = await context.supabase.from("restaurant_tables").insert({ restaurant_id: restaurant.id, number: data.number, code: `mesa${data.number.toLowerCase()}` });
    if (error) throw new Error(error.code === "23505" ? "Essa mesa já existe." : "Não foi possível cadastrar a mesa.");
    await logSecurityEvent({ action: "lebre_execute", resource: "restaurant_table", restaurantSlug: data.slug, restaurantId: restaurant.id, actorId: context.userId, detail: `proposal=${data.proposalId}; mesa=${data.number}` });
    return { ok: true, message: `Mesa ${data.number} cadastrada com sucesso.` };
  });