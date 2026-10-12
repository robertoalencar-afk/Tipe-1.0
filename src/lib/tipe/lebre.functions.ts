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
A TIPE leva a conta para o celular pelo QR Code da mesa, sem precisar baixar nada.
O cliente vê os itens, escolhe o que deseja pagar e pode dividir um item por duas, três ou quatro pessoas.
Pagamentos no estabelecimento podem ser feitos em dinheiro ou maquininha e aguardam confirmação do restaurante.
A TIPE oferece 30 dias grátis, sem cartão. Os valores dos planos serão divulgados no lançamento.
O restaurante conecta obrigatoriamente o PDV que já usa (qualquer PDV do mercado é aceito); a TIPE ainda não oferece PDV próprio.
Não afirme que uma marca específica já está homologada. Diga que a equipe confirma a compatibilidade.
Apple Pay e Google Pay dependem da habilitação comercial do provedor e ainda não devem ser apresentados como ativos.
Para experimentar, indique /simulador. Para criar a conta, indique /cadastro. Para falar com a equipe, indique o WhatsApp oficial no site.
`;

function readOutput(body: unknown): string {
  const value = body as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> };
  if (value.output_text) return value.output_text.trim();
  return value.output?.flatMap((item) => item.content ?? []).map((part) => part.text ?? "").join("").trim() ?? "";
}

export type LebreFile = { name: string; mediaType: string; dataUrl: string };

const FileSchema = z.object({
  name: z.string().trim().min(1).max(160),
  mediaType: z.enum(["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"]),
  dataUrl: z.string().max(7_000_000).regex(/^data:[a-z/+.-]+;base64,[A-Za-z0-9+/=]+$/),
});
const Files = z.array(FileSchema).max(3).optional();

function buildInput(question: string, files: LebreFile[] = []) {
  if (!files.length) return question;
  const parts: Array<Record<string, string>> = [{ type: "input_text", text: question }];
  for (const file of files) {
    if (!file.dataUrl.startsWith(`data:${file.mediaType};base64,`)) throw new Error("Anexo inválido.");
    if (file.mediaType === "application/pdf") parts.push({ type: "input_file", filename: file.name, file_data: file.dataUrl });
    else parts.push({ type: "input_image", image_url: file.dataUrl });
  }
  return [{ role: "user", content: parts }];
}

async function askModel(instructions: string, question: string, files?: LebreFile[]) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return "A Lebre está se preparando para responder. Enquanto isso, você pode simular a experiência ou falar com nossa equipe.";
  const response = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({ model: "openai/gpt-6-astra", instructions, input: buildInput(question, files), stream: false, store: false, reasoning: { effort: "low" } }),
  });
  if (!response.ok) throw new Error(response.status === 429 ? "A Lebre recebeu muitas perguntas agora. Tente novamente em instantes." : "A Lebre não conseguiu responder agora.");
  const text = readOutput(await response.json());
  if (!text) throw new Error("A Lebre não conseguiu responder agora.");
  return text;
}

export const askPublicLebre = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ question: Question, files: Files }).parse(data))
  .handler(async ({ data }): Promise<LebreReply> => {
    const { enforceRate, clientIp, consumeLebreQuota } = await import("./security.server");
    await enforceRate(`lebre-public:${clientIp()}`, 12, 60);
    const limitMsg = await consumeLebreQuota("public");
    if (limitMsg) return { answer: limitMsg };
    const answer = await askModel(
      `Você é a Lebre, especialista oficial da TIPE. Responda em português brasileiro, com tom pessoal, claro e breve. Nunca use travessões. Use somente os fatos abaixo. Se não souber, diga que a equipe confirma. Se receber anexos, descreva com precisão apenas o que aparece neles. Não invente integrações, taxas, resultados ou funcionalidades.\n${publicFacts}`,
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
    const limitMsg = await consumeLebreQuota("panel", data.slug);
    if (limitMsg) return { answer: limitMsg };
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
    const history = (data.history ?? []).map((m) => `${m.role === "user" ? "Usuário" : "Lebre"}: ${m.text}`).join("\n");
    const raw = await askModel(
      `Você é a Lebre, assistente operacional da TIPE. Fale em português brasileiro, pessoal, objetiva, sem travessões. Use só o contexto. Não revele dados pessoais nem invente números.
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
      const { error } = await sb.from("restaurant_tables").insert({ restaurant_id: rid, number: a.number, code: `mesa${a.number.toLowerCase()}` });
      if (error) throw new Error(error.code === "23505" ? "Essa mesa já existe." : "Não foi possível cadastrar a mesa.");
      message = `Mesa ${a.number} cadastrada. O QR Code já está em Mesas e QR Codes.`;
    } else if (a.action === "close_table") {
      const { error } = await sb.rpc("pdv_close_table", { p_slug: data.slug, p_table: a.number });
      if (error) throw new Error(error.message.includes("aguardando") ? `A mesa ${a.number} tem um pagamento presencial aguardando confirmação. Confirme ou recuse no painel e eu fecho em seguida.` : `Não foi possível fechar a mesa ${a.number}.`);
      message = `Mesa ${a.number} fechada e liberada. Os pagamentos ficaram guardados no histórico.`;
    } else if (a.action === "set_table_active") {
      const { data: rows, error } = await sb.from("restaurant_tables").update({ active: a.active }).eq("restaurant_id", rid).eq("number", a.number).select("id");
      if (error) throw new Error("Não foi possível alterar a mesa.");
      if (!rows?.length) throw new Error(`Não encontrei a mesa ${a.number}. Quer que eu cadastre?`);
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
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("O áudio ainda não está disponível. Escreva sua pergunta.");
    const type = data.mediaType.split(";")[0]!;
    const ext = type.includes("mp4") || type.includes("m4a") ? "m4a" : type.includes("mpeg") ? "mp3" : type.split("/")[1]!;
    const bytes = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
    const form = new FormData();
    form.append("model", "openai/gpt-transcribe");
    form.append("file", new File([bytes], `lebre.${ext}`, { type }));
    form.append("response_format", "json");
    form.append("language", "pt");
    form.append("prompt", "Conversa com a Lebre, assistente da TIPE (marca pronunciada \"tchípi\", escrita TIPE). Termos: TIPE, Lebre, mesa, garçom, restaurante, PDV, Pix, QR Code, gorjeta, cardápio.");
    const response = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "X-Lovable-AIG-SDK": "fetch" },
      body: form,
    });
    if (!response.ok) {
      console.error("lebre transcription", response.status, (await response.text()).slice(0, 300));
      throw new Error(response.status === 429 ? "Muitos áudios agora. Tente em instantes." : "Não consegui entender o áudio. Tente de novo ou escreva.");
    }
    const body = (await response.json()) as { text?: string };
    const text = fixBrand(body.text?.trim() ?? "");
    if (!text) throw new Error("Não ouvi nada no áudio. Tente falar mais perto do microfone.");
    return { text: text.slice(0, 600) };
  });
