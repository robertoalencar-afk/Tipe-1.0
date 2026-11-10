import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Question = z.string().trim().min(2).max(600);
const Slug = z.string().min(1).max(64).regex(/^[a-z0-9-]+$/);

export type LebreAction =
  | { action: "add_table"; number: string }
  | { action: "set_table_active"; number: string; active: boolean }
  | { action: "close_table"; number: string }
  | { action: "add_waiter"; name: string; email?: string }
  | { action: "invite_waiter"; name: string; email: string }
  | { action: "set_item_available"; name: string; available: boolean };

export type LebreProposal = {
  id: string;
  action: LebreAction["action"];
  title: string;
  summary: string;
  payload: LebreAction;
};

export type LebreReply = { answer: string; proposal?: LebreProposal };

const publicFacts = `
A TIPE é uma plataforma para restaurantes, bares e cafés. O carro chefe é o Tipe Pay; os outros produtos se somam a ele.
Tipe Pay: a conta abre no celular pelo QR Code da mesa, sem baixar nada. O cliente vê os itens, escolhe o que vai pagar e pode dividir um item por duas, três ou quatro pessoas. Paga com Pix, Apple Pay ou Google Pay, ou escolhe pagar no estabelecimento (dinheiro ou maquininha), que aparece para o restaurante confirmar. Não há cartão digitado na conta.
Os pagamentos digitais são processados pelo Pagar.me e o dinheiro cai direto na conta do restaurante. A TIPE não retém o valor das contas e não cobra taxa do cliente.
Gorjeta extra: depois da conta paga, o cliente pode dar uma gorjeta extra como um segundo pagamento, separado e opcional (3%, 5%, 8% ou outro valor). 70% vão para quem atendeu e 30% são a taxa da plataforma.
Tipe Order: o mesmo QR Code abre o cardápio, o cliente pede pelo celular, o pedido vai para a cozinha e entra na conta da mesa. É um módulo adicional do Tipe Pay, já disponível.
Tipe Kitchen: tela da cozinha e do bar (KDS) com os pedidos por ordem de chegada e por setor.
Tipe Staff: área do garçom com gorjetas, saldo e avaliações.
Tipe Restaurant: painel do salão, caixa e relatórios em tempo real.
Lebre, a inteligência da Tipe (é você; antes se chamava Tipe AI): resume o salão para o dono, responde dúvidas e executa pedidos simples no painel, como mesas, equipe e cardápio, sempre com confirmação. Também lê fotos e PDFs, como um cardápio, e entende áudio.
Tipe Guest: reserva, lista de espera e volta do cliente. Ainda está em breve; não diga que já está disponível.
PDV: a TIPE tem PDV próprio, o Lançamento TIPE, para lançar os pedidos no próprio painel sem outro sistema. Quem já usa um PDV pode enviar mesas e itens pela API TIPE ou usar os conectores (Saipos, Consumer, Linx, TOTVS Chef e outros), com integração assistida e baixa automática do item pago. A equipe confirma os detalhes do sistema de cada restaurante.
Planos: assinatura mensal pelo número de mesas, sem tarifa da TIPE por transação; o restaurante paga só as tarifas do Pagar.me. Essencial até 10 mesas, Profissional até 20, Premium até 40 (inclui cozinha e bar e controle de caixa) e Personalizado acima de 40. Mensal sem fidelidade; no anual, os totens com QR Code estão incluídos. Os valores serão divulgados no lançamento: não informe preços.
Teste grátis: 30 dias, sem cartão de crédito. A implantação é acompanhada: a equipe cadastra as mesas, gera os QR Codes e treina a equipe.
Para ver como funciona, indique /simulador. Para criar a conta, /cadastro. Preços em /precos, integrações em /integracoes, produtos em /produtos/pay (e order, kitchen, staff, restaurant, ai). Para falar com a equipe, o WhatsApp oficial no site.
`;

export type LebreFile = { name: string; mediaType: string; dataUrl: string };

const FileSchema = z.object({
  name: z.string().trim().min(1).max(160),
  mediaType: z.enum(["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"]),
  dataUrl: z.string().max(7_000_000).regex(/^data:[a-z/+.-]+;base64,[A-Za-z0-9+/=]+$/),
});
const Files = z.array(FileSchema).max(3).optional();

// Usada quando as cotas grátis de IA do dia acabaram (ou nenhum provedor respondeu).
/** Jeito de falar da Lebre, igual no site e no painel. */
const LEBRE_PERSONA = `Você é a Lebre, a inteligência da Tipe. Seu jeito: rápida, esperta e perspicaz, como uma lebre que já chegou antes de a pergunta terminar.
Como responder:
- A primeira frase já é a resposta. Nada de "Ótima pergunta", nada de rodeio, nada de repetir a pergunta.
- Depois, no máximo duas ou três frases curtas, ou uma lista de até quatro itens, só quando ajudar.
- Destaque o dado principal em **negrito**.
- Antecipe o próximo passo útil: um link do site, uma ação ou uma pergunta certeira.
- Tom caloroso e confiante, com no máximo uma pitada de humor leve por resposta, e nenhuma quando o assunto for erro, dinheiro ou reclamação.
- No máximo um emoji, e só se couber.
- Português brasileiro. Nunca use travessões.`;

const AI_REST_MESSAGE = "Corri tanto hoje que preciso recuperar o fôlego. Volto amanhã cedinho! Se for urgente, fale com a equipe da Tipe no WhatsApp.";

async function askModel(instructions: string, question: string, files?: LebreFile[]) {
  const { askAI, AIUnavailable } = await import("./ai.server");
  try {
    return await askAI({ system: instructions, question, files });
  } catch (error) {
    if (error instanceof AIUnavailable) return AI_REST_MESSAGE;
    throw error;
  }
}

export const askPublicLebre = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ question: Question, files: Files }).parse(data))
  .handler(async ({ data }): Promise<LebreReply> => {
    const { enforceRate, clientIp, consumeLebreQuota } = await import("./security.server");
    await enforceRate(`lebre-public:${clientIp()}`, 12, 60);
    // Perguntas frequentes têm resposta pronta: não gastam IA nem a cota do dia.
    if (!data.files?.length) {
      const { respostaFaq } = await import("./lebre-regras");
      const pronta = respostaFaq(data.question);
      if (pronta) return { answer: pronta };
    }
    const limitMsg = await consumeLebreQuota("public");
    if (limitMsg) return { answer: limitMsg };
    const answer = await askModel(
      `${LEBRE_PERSONA}
Aqui você atende o site da Tipe. Use somente os fatos abaixo. Se não souber, diga que a equipe confirma. Se receber anexos, descreva com precisão apenas o que aparece neles. Não invente integrações, taxas, resultados ou funcionalidades.\n${publicFacts}`,
      data.question,
      data.files,
    );
    return { answer };
  });

const ActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("add_table"), number: z.string().trim().min(1).max(8).regex(/^[0-9A-Za-z]+$/) }),
  z.object({ action: z.literal("set_table_active"), number: z.string().trim().min(1).max(8).regex(/^[0-9A-Za-z]+$/), active: z.boolean() }),
  z.object({ action: z.literal("close_table"), number: z.string().trim().min(1).max(8).regex(/^[0-9A-Za-z]+$/) }),
  z.object({ action: z.literal("add_waiter"), name: z.string().trim().min(2).max(80), email: z.string().trim().toLowerCase().email().max(200).optional() }),
  z.object({ action: z.literal("invite_waiter"), name: z.string().trim().min(2).max(80), email: z.string().trim().toLowerCase().email().max(200) }),
  z.object({ action: z.literal("set_item_available"), name: z.string().trim().min(2).max(120), available: z.boolean() }),
]);

const History = z.array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(2000) })).max(12).optional();

function describe(a: LebreAction, restaurant: string): { title: string; summary: string } {
  switch (a.action) {
    case "add_table": return { title: `Cadastrar mesa ${a.number}`, summary: `Vou cadastrar a mesa ${a.number} em ${restaurant}, já com QR Code pronto para imprimir.` };
    case "set_table_active": return a.active
      ? { title: `Abrir mesa ${a.number}`, summary: `Vou ativar a mesa ${a.number} para receber clientes pelo QR Code.` }
      : { title: `Desativar mesa ${a.number}`, summary: `Vou desativar a mesa ${a.number}. O QR Code dela deixa de abrir a conta.` };
    case "close_table": return { title: `Fechar e liberar mesa ${a.number}`, summary: `Vou fechar a conta da mesa ${a.number}, guardar os pagamentos no histórico e deixar a mesa livre para novos clientes.` };
    case "add_waiter": return { title: `Cadastrar garçom ${a.name}`, summary: a.email ? `Vou cadastrar ${a.name} na equipe e enviar o convite para ${a.email} criar a senha.` : `Vou cadastrar ${a.name} na equipe. Depois você pode me passar o e-mail para eu enviar o convite.` };
    case "invite_waiter": return { title: `Convidar ${a.name}`, summary: `Vou ligar o e-mail ${a.email} ao garçom ${a.name} e enviar o convite para ele criar a senha.` };
    case "set_item_available": return a.available
      ? { title: `Voltar "${a.name}" ao cardápio`, summary: `Vou marcar "${a.name}" como disponível.` }
      : { title: `Pausar "${a.name}"`, summary: `Vou marcar "${a.name}" como indisponível até você reativar.` };
  }
}

function parseIntent(text: string): { reply?: string; action?: unknown } | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}

export const askRestaurantLebre = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ slug: Slug, question: Question, history: History, files: Files }).parse(data))
  .handler(async ({ data, context }): Promise<LebreReply> => {
    const { enforceRate, logSecurityEvent, consumeLebreQuota } = await import("./security.server");
    await enforceRate(`lebre-panel:${context.userId}`, 20, 60, data.slug);
    const { data: restaurant } = await context.supabase.from("restaurants").select("id, name, pos_mode, pos_provider").eq("slug", data.slug).maybeSingle();
    if (!restaurant) throw new Error("Restaurante não encontrado ou sem acesso.");
    const { data: roles } = await context.supabase.from("user_roles").select("role").eq("restaurant_id", restaurant.id).eq("user_id", context.userId);
    if (!roles?.length) throw new Error("Você não tem acesso a este restaurante.");
    const roleNames = roles.map((row) => row.role);
    const canManage = roleNames.includes("owner") || roleNames.includes("founder");
    const [tables, payments, items, waiters] = await Promise.all([
      context.supabase.from("restaurant_tables").select("number, active").eq("restaurant_id", restaurant.id),
      context.supabase.from("table_payment_requests").select("status, amount, table_number").eq("restaurant_slug", data.slug).eq("payment_target", "restaurant"),
      context.supabase.from("table_bill_items").select("table_number, ordered_quantity, paid_portion, unit_price").eq("restaurant_slug", data.slug),
      context.supabase.from("pdv_waiters").select("name, active, email").eq("restaurant_id", restaurant.id),
    ]);
    const openValue = (items.data ?? []).reduce((sum, item) => sum + Math.max(0, Number(item.ordered_quantity) - Number(item.paid_portion)) * Number(item.unit_price), 0);
    const pending = (payments.data ?? []).filter((payment) => payment.status === "pending");
    const pendingTables = [...new Set(pending.map((p) => p.table_number))].join(", ") || "nenhuma";
    const busyTables = [...new Set((items.data ?? []).map((i) => i.table_number))].join(", ") || "nenhuma";
    const tableList = (tables.data ?? []).map((t) => `${t.number}${t.active ? "" : " (inativa)"}`).join(", ") || "nenhuma";
    const waiterList = (waiters.data ?? []).map((w) => `${w.name}${w.email ? " (com acesso)" : " (sem acesso)"}${w.active ? "" : " inativo"}`).join(", ") || "nenhum";
    const contextText = `Restaurante: ${restaurant.name}. Cargo do usuário: ${roleNames.join(", ")}. Mesas: ${tableList}. Mesas com conta aberta: ${busyTables}. Mesas com pagamento presencial aguardando confirmação: ${pendingTables}. Garçons: ${waiterList}. Pagamentos pendentes: ${pending.length}. Valor aproximado em aberto, sem taxa: R$ ${openValue.toFixed(2)}. PDV: ${restaurant.pos_mode === "external" ? `externo, ${restaurant.pos_provider ?? "não informado"}` : "TIPE"}.`;
    // Consultas rápidas e comandos claros são resolvidos sem IA e sem gastar a cota do dia.
    let raw: string | null = null;
    if (!data.files?.length) {
      const { lerComando, respostaSalao } = await import("./lebre-regras");
      const salao = respostaSalao(data.question, {
        mesas: (tables.data ?? []).map((t) => ({ number: String(t.number), active: !!t.active })),
        mesasComConta: [...new Set((items.data ?? []).map((i) => String(i.table_number)))],
        mesasAguardando: [...new Set(pending.map((p) => String(p.table_number)))],
        pendentes: pending.length,
        valorAberto: openValue,
        garcons: (waiters.data ?? []).map((w) => ({ name: w.name, active: !!w.active, comAcesso: !!w.email })),
      });
      if (salao) return { answer: salao };
      const comando = lerComando(data.question, (tables.data ?? []).map((t) => String(t.number)));
      if (comando) {
        if (!canManage) return { answer: "Só o dono do restaurante pode alterar cadastros. Peça a ele para fazer essa mudança." };
        raw = JSON.stringify({ reply: "Posso fazer isso. Confira e confirme abaixo.", action: comando });
      }
    }
    if (raw === null) {
      const limitMsg = await consumeLebreQuota("panel", data.slug);
      if (limitMsg) return { answer: limitMsg };
    }
    const history = (data.history ?? []).map((m) => `${m.role === "user" ? "Usuário" : "Lebre"}: ${m.text}`).join("\n");
    raw ??= await askModel(
      `${LEBRE_PERSONA}
Aqui você atende a equipe do restaurante no painel. Use só o contexto. Seja a gerente mais rápida do salão: números exatos, mesas pelo número, e quando algo pede atenção (pagamento aguardando, mesa parada), diga primeiro. Não revele dados pessoais nem invente números.
Você pode PROPOR estas ações (o sistema mostra um botão para o usuário confirmar; você nunca diz que já executou):
- add_table {number}: cadastrar mesa nova
- set_table_active {number, active}: ativar (true) ou desativar (false) o QR Code de uma mesa existente
- close_table {number}: fechar a conta e liberar a mesa para novos clientes. Use quando pedirem "fechar e liberar", "encerrar a conta" ou "zerar a mesa". Se a mesa tiver pagamento presencial aguardando confirmação, explique que primeiro é preciso confirmar ou recusar esse pagamento no painel
- add_waiter {name, email?}: cadastrar garçom novo, com e-mail opcional para convite
- invite_waiter {name, email}: enviar convite de acesso a garçom já cadastrado
- set_item_available {name, available}: pausar ou reativar item do cardápio
${canManage ? "" : "Este usuário NÃO pode alterar cadastros. Nunca proponha ações; explique que só o dono pode."}
Se faltar dado obrigatório (ex.: número da mesa ou e-mail incompleto), pergunte em vez de propor.
Responda SEMPRE apenas com JSON: {"reply": "texto curto", "action": null ou {"action": "...", ...campos}}.
Contexto: ${contextText}
${history ? `Conversa recente:\n${history}` : ""}
Se houver anexos (foto, comprovante, cardápio ou PDF), leia com atenção, descreva só o que realmente aparece e use isso para responder ou propor ações.`,
      data.question,
      data.files,
    );
    const parsed = parseIntent(raw);
    const answer = parsed && typeof parsed.reply === "string" && parsed.reply.trim() ? parsed.reply.trim() : parsed ? "Certo." : raw;
    if (!canManage) return { answer };
    const normalize = (value: unknown) => {
      if (!value || typeof value !== "object") return value;
      const obj = { ...(value as Record<string, unknown>) };
      if (typeof obj["number"] === "number") obj["number"] = String(obj["number"]);
      for (const key of ["active", "available"]) if (typeof obj[key] === "string") obj[key] = obj[key] === "true";
      return obj;
    };
    let action = ActionSchema.safeParse(normalize(parsed?.action));
    if (!action.success) {
      // Fallback: the reply asks for confirmation without a valid action; infer table action from the conversation.
      const transcript = [...(data.history ?? []).map((m) => m.text), data.question, answer].join("\n");
      const mesa = [...transcript.matchAll(/mesa\s+(\d{1,4})/gi)].pop()?.[1];
      if (mesa && /confirm|cadastr|abrir|ativar|fechar|desativar/i.test(answer + " " + data.question)) {
        const exists = (tables.data ?? []).find((t) => String(t.number) === mesa);
        const recent = transcript.split("\n").slice(-3).join(" ");
        const release = /liberar|encerrar|zerar|fechar (a )?conta|fechar e/i.test(recent);
        const close = /fechar|desativar/i.test(recent);
        action = ActionSchema.safeParse(!exists ? { action: "add_table", number: mesa } : release ? { action: "close_table", number: mesa } : { action: "set_table_active", number: mesa, active: !close });
      }
    }
    if (!action.success) return { answer };
    const ad = action.data;
    if (ad.action === "add_table" || (ad.action === "set_table_active" && ad.active)) {
      const { tableLimitInfo, LIMIT_MESSAGE } = await import("./table-limit.server");
      const info = await tableLimitInfo(restaurant.id);
      const exists = ad.action === "set_table_active" && (tables.data ?? []).some((t) => t.number === ad.number && t.active);
      if (!exists && info.active >= info.limit) {
        await logSecurityEvent({ action: "table_limit_blocked", resource: `lebre:mesa:${ad.number}`, result: "denied", restaurantSlug: data.slug, restaurantId: restaurant.id, actorId: context.userId, detail: `limite=${info.limit} ativas=${info.active}` });
        return { answer: `${LIMIT_MESSAGE} Hoje vocês usam ${info.active} de ${info.limit} mesas do plano. ${canManage ? "Se quiser mais mesas, toque em \"Falar com a TIPE\" na tela de Mesas e QR Codes que a equipe ativa o upgrade na hora." : "Peça ao dono do restaurante para falar com a TIPE."}` };
      }
    }
    const proposal: LebreProposal = { id: crypto.randomUUID(), action: action.data.action, payload: action.data as LebreAction, ...describe(action.data as LebreAction, restaurant.name) };
    await logSecurityEvent({ action: "lebre_proposal", resource: action.data.action, restaurantSlug: data.slug, restaurantId: restaurant.id, actorId: context.userId, detail: proposal.summary });
    return { answer, proposal };
  });

export const executeLebreProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ slug: Slug, proposalId: z.string().uuid(), payload: ActionSchema }).parse(data))
  .handler(async ({ data, context }) => {
    const { logSecurityEvent } = await import("./security.server");
    const { data: restaurant } = await context.supabase.from("restaurants").select("id, name").eq("slug", data.slug).maybeSingle();
    if (!restaurant) throw new Error("Restaurante não encontrado.");
    const { data: allowed } = await context.supabase.rpc("has_restaurant_role", { _user_id: context.userId, _restaurant_id: restaurant.id, _roles: ["owner"] });
    const a = data.payload;
    if (!allowed) {
      await logSecurityEvent({ action: "lebre_execute_denied", resource: a.action, result: "denied", restaurantSlug: data.slug, restaurantId: restaurant.id, actorId: context.userId, detail: `proposal=${data.proposalId}` });
      throw new Error("Somente o dono do restaurante pode confirmar essa ação.");
    }
    const sb = context.supabase;
    const rid = restaurant.id;
    let message = "";
    if (a.action === "add_table") {
      const { data: ins, error } = await sb.from("restaurant_tables").insert({ restaurant_id: rid, number: a.number, code: `mesa${a.number.toLowerCase()}` }).select("id");
      if (error) throw new Error(error.code === "23505" ? "Essa mesa já existe." : "Não foi possível cadastrar a mesa.");
      if (!ins?.length) { const { LIMIT_MESSAGE } = await import("./table-limit.server"); throw new Error(LIMIT_MESSAGE); }
      message = `Mesa ${a.number} cadastrada. O QR Code já está em Mesas e QR Codes.`;
    } else if (a.action === "close_table") {
      const { error } = await sb.rpc("pdv_close_table", { p_slug: data.slug, p_table: a.number });
      if (error) throw new Error(error.message.includes("aguardando") ? `A mesa ${a.number} tem um pagamento presencial aguardando confirmação. Confirme ou recuse no painel e eu fecho em seguida.` : `Não foi possível fechar a mesa ${a.number}.`);
      message = `Mesa ${a.number} fechada e liberada. Os pagamentos ficaram guardados no histórico.`;
    } else if (a.action === "set_table_active") {
      const { data: rows, error } = await sb.from("restaurant_tables").update({ active: a.active }).eq("restaurant_id", rid).eq("number", a.number).select("id");
      if (error) throw new Error("Não foi possível alterar a mesa.");
      if (!rows?.length) {
        const { data: seen } = await sb.from("restaurant_tables").select("id").eq("restaurant_id", rid).eq("number", a.number).maybeSingle();
        if (seen && a.active) { const { LIMIT_MESSAGE } = await import("./table-limit.server"); throw new Error(LIMIT_MESSAGE); }
        throw new Error(`Não encontrei a mesa ${a.number}. Quer que eu cadastre?`);
      }
      message = a.active ? `Mesa ${a.number} aberta.` : `Mesa ${a.number} desativada.`;
    } else if (a.action === "add_waiter") {
      const { data: existing } = await sb.from("pdv_waiters").select("code").eq("restaurant_id", rid);
      const used = new Set((existing ?? []).map((w) => w.code));
      let n = (existing?.length ?? 0) + 1;
      while (used.has(`G${n}`)) n++;
      const { data: row, error } = await sb.from("pdv_waiters").insert({ restaurant_id: rid, code: `G${n}`, name: a.name, active: true }).select("id").single();
      if (error || !row) throw new Error("Não foi possível cadastrar o garçom.");
      message = `${a.name} cadastrado na equipe.`;
      if (a.email) {
        const { grantWaiterAccessCore } = await import("./waiter-access.server");
        await grantWaiterAccessCore({ restaurantId: rid, slug: data.slug, waiterId: row.id, email: a.email, actorId: context.userId });
        message += ` Convite enviado para ${a.email}.`;
      }
    } else if (a.action === "invite_waiter") {
      const { data: found } = await sb.from("pdv_waiters").select("id, name").eq("restaurant_id", rid).ilike("name", `%${a.name}%`).limit(2);
      if (!found?.length) throw new Error(`Não encontrei o garçom ${a.name}. Quer que eu cadastre?`);
      if (found.length > 1) throw new Error(`Encontrei mais de um garçom com "${a.name}". Use o nome completo.`);
      const { grantWaiterAccessCore } = await import("./waiter-access.server");
      await grantWaiterAccessCore({ restaurantId: rid, slug: data.slug, waiterId: found[0]!.id, email: a.email, actorId: context.userId });
      message = `Convite enviado para ${a.email}. ${found[0]!.name} vai receber o link para criar a senha.`;
    } else if (a.action === "set_item_available") {
      const { data: found } = await sb.from("pdv_menu_items").select("id, name").eq("restaurant_id", rid).ilike("name", `%${a.name}%`).limit(2);
      if (!found?.length) throw new Error(`Não encontrei "${a.name}" no cardápio.`);
      if (found.length > 1) throw new Error(`Encontrei mais de um item com "${a.name}". Seja mais específico.`);
      const { error } = await sb.from("pdv_menu_items").update({ available: a.available }).eq("id", found[0]!.id);
      if (error) throw new Error("Não foi possível alterar o item.");
      message = a.available ? `"${found[0]!.name}" voltou ao cardápio.` : `"${found[0]!.name}" pausado.`;
    }
    await logSecurityEvent({ action: "lebre_execute", resource: a.action, restaurantSlug: data.slug, restaurantId: rid, actorId: context.userId, detail: `proposal=${data.proposalId}` });
    return { ok: true, message };
  });

// O nome TIPE soa como "tchípi" e costuma virar "chip", "chipe", "type" ou "tipi".
function fixBrand(text: string): string {
  return text
    .replace(/\b(?:a|da|na|pela|com a)\s+(?:chip|chipe|chips|xip|ship|type|tipi|tchip|tchipe|tipe)\b/gi, (m) => m.replace(/\S+$/, "TIPE"))
    .replace(/\b(?:tchipe|tchípi|tchip|chipe|tipi|tipe)\b/gi, "TIPE");
}

export const transcribeLebreAudio = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({
    mediaType: z.string().regex(/^audio\/(webm|mp4|mpeg|ogg|wav|x-m4a|aac)(;.*)?$/),
    base64: z.string().min(100).max(6_000_000).regex(/^[A-Za-z0-9+/=]+$/),
  }).parse(data))
  .handler(async ({ data }) => {
    const { enforceRate, clientIp } = await import("./security.server");
    await enforceRate(`lebre-audio:${clientIp()}`, 10, 60);
    // A transcrição usa o Whisper do Workers AI (Cloudflare), de preferência pelo binding do Worker
    // (sem token), e conta no teto diário grátis.
    const { aiBinding, consumeProviderQuota, cloudflareDailyLimit } = await import("./ai.server");
    const binding = aiBinding();
    const accountId = process.env["CLOUDFLARE_ACCOUNT_ID"];
    const token = process.env["CLOUDFLARE_AI_TOKEN"];
    if (!binding && (!accountId || !token)) throw new Error("O áudio ainda não está disponível. Escreva sua pergunta.");
    if (!(await consumeProviderQuota("cloudflare", cloudflareDailyLimit()))) throw new Error("O áudio da Lebre descansa por hoje. Escreva sua pergunta.");
    const whisper = "@cf/openai/whisper-large-v3-turbo";
    const input = {
      audio: data.base64,
      language: "pt",
      initial_prompt: "Conversa com a Lebre, assistente da TIPE (marca pronunciada \"tchípi\", escrita TIPE). Termos: TIPE, Lebre, mesa, garçom, restaurante, PDV, Pix, QR Code, gorjeta, cardápio.",
    };
    let body: { text?: string };
    if (binding) {
      try {
        body = (await binding.run(whisper, input)) as { text?: string };
      } catch (error) {
        console.error("lebre transcription", error);
        throw new Error("Não consegui entender o áudio. Tente de novo ou escreva.");
      }
    } else {
      const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${whisper}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        console.error("lebre transcription", response.status, (await response.text()).slice(0, 300));
        throw new Error(response.status === 429 ? "Muitos áudios agora. Tente em instantes." : "Não consegui entender o áudio. Tente de novo ou escreva.");
      }
      body = ((await response.json()) as { result?: { text?: string } }).result ?? {};
    }
    const text = fixBrand(body.text?.trim() ?? "");
    if (!text) throw new Error("Não ouvi nada no áudio. Tente falar mais perto do microfone.");
    return { text: text.slice(0, 600) };
  });
