// Atendimento da Lebre no WhatsApp comercial. Chamado pelo webhook depois que a
// mensagem do cliente foi gravada. Só responde dentro da janela de 24 h que o próprio
// cliente acabou de abrir; nunca inicia conversa e nunca responde quem pediu para sair.
import {
  OPTOUT_RESPOSTA,
  etapa,
  extrairFatos,
  historicoTexto,
  lerDecisao,
  mesclarFicha,
  origemPelaMensagem,
  pedeHumano,
  pedeOptout,
  promptComercial,
  respostaHumano,
  temperatura,
  type Etapa,
  type Ficha,
  type Turno,
} from "./lebre-whatsapp";

type Db = { from: (t: string) => any };
export type Conversa = {
  id: string;
  phone: string;
  name: string | null;
  lead_id: string | null;
  prospect_id?: string | null;
  lebre_ativa?: boolean;
  optout?: boolean;
  ficha?: Ficha | null;
  etapa?: Etapa;
  lebre_respostas?: number;
  primeira_resposta_at?: string | null;
  origem?: string | null;
};

const ultimos8 = (fone: string) => fone.replace(/\D/g, "").slice(-8);

/** Liga a conversa nova a um restaurante da Prospecção pelo telefone e marca que ele respondeu. */
export async function vincularProspect(db: Db, conv: Conversa) {
  if (conv.prospect_id) return;
  const fim = ultimos8(conv.phone);
  if (fim.length < 8) return;
  const { data: p } = await db
    .from("crm_prospects")
    .select("id, status, lead_id")
    .or(`whatsapp.like.%${fim},phone.like.%${fim}`)
    .limit(1)
    .maybeSingle();
  if (!p) return;
  await db
    .from("wa_conversations")
    .update({
      prospect_id: p.id,
      origem: "prospeccao",
      ...(p.lead_id && !conv.lead_id ? { lead_id: p.lead_id } : {}),
    })
    .eq("id", conv.id);
  if (p.status === "novo" || p.status === "em_contato")
    await db
      .from("crm_prospects")
      .update({ status: "respondeu", updated_at: new Date().toISOString() })
      .eq("id", p.id);
  conv.prospect_id = p.id;
  if (p.lead_id && !conv.lead_id) conv.lead_id = p.lead_id;
}

async function enviar(db: Db, conv: Conversa, texto: string) {
  const token = process.env["WHATSAPP_TOKEN"];
  const phoneNumberId = process.env["WHATSAPP_PHONE_NUMBER_ID"];
  if (!token || !phoneNumberId)
    return { ok: false as const, error: "WhatsApp sem credenciais de envio" };
  const { sendText } = await import("./whatsapp");
  const r = await sendText({ token, phoneNumberId }, conv.phone, texto);
  const agora = new Date().toISOString();
  await db.from("wa_messages").insert({
    conversation_id: conv.id,
    wa_message_id: r.ok ? r.id || null : null,
    direction: "out",
    body: texto,
    status: r.ok ? "sent" : "failed",
    error: r.ok ? null : r.error,
    autor: "lebre",
    at: agora,
  });
  if (conv.lead_id)
    await db
      .from("crm_activities")
      .insert({
        lead_id: conv.lead_id,
        kind: "whatsapp",
        title: r.ok ? "Lebre respondeu no WhatsApp" : "Falha ao enviar WhatsApp",
        body: texto.slice(0, 2000),
      });
  return r;
}

/** Cria o lead no CRM quando a ficha tem o mínimo que o funil exige (nome, restaurante e e-mail). */
async function criarLeadSePronto(db: Db, conv: Conversa, f: Ficha) {
  if (conv.lead_id || !f.nome || !f.restaurante || !f.email) return;
  const notas = [
    "Lead do WhatsApp comercial, qualificado pela Lebre.",
    f.dor ? `Dor principal: ${f.dor}` : "",
    f.interesse ? `Interesse: ${f.interesse}` : "",
    f.demo ? `Demonstração pedida para: ${f.demo}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const { data: lead } = await db
    .from("restaurant_leads")
    .insert({
      restaurant_name: f.restaurante,
      contact_name: f.nome,
      email: f.email,
      phone: `+${conv.phone}`,
      city: f.cidade ?? null,
      neighborhood: f.bairro ?? null,
      pdv_system: f.pdv ?? null,
      tables_range: f.mesas ? String(f.mesas) : null,
      message: f.dor ?? null,
      discovery_source: "whatsapp",
      origin_page: "whatsapp/comercial",
      utm_source: "whatsapp",
      utm_medium: conv.origem ?? "direto",
      marketing_opt_in: false,
      notes: notas,
    })
    .select("id")
    .single();
  if (!lead) return;
  conv.lead_id = lead.id;
  await db.from("wa_conversations").update({ lead_id: lead.id }).eq("id", conv.id);
  if (conv.prospect_id)
    await db
      .from("crm_prospects")
      .update({
        status: "convertido",
        lead_id: lead.id,
        next_touch_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", conv.prospect_id);
}

/** Atende uma mensagem que acabou de chegar. Erros aqui nunca impedem o webhook de confirmar. */
export async function atenderComLebre(db: Db, conv: Conversa, texto: string, agora = new Date()) {
  if (conv.optout) return;
  const ficha0: Ficha = (conv.ficha as Ficha) ?? {};

  if (pedeOptout(texto)) {
    await db
      .from("crm_optout")
      .upsert(
        { value: conv.phone, kind: "phone", reason: "Pediu para sair pelo WhatsApp" },
        { onConflict: "value" },
      );
    await db
      .from("wa_conversations")
      .update({
        optout: true,
        lebre_ativa: false,
        precisa_humano: false,
        status: "resolved",
        etapa: "perdido",
      })
      .eq("id", conv.id);
    if (conv.prospect_id)
      await db
        .from("crm_prospects")
        .update({ status: "opt_out", next_touch_at: null, updated_at: agora.toISOString() })
        .eq("id", conv.prospect_id);
    await enviar(db, conv, OPTOUT_RESPOSTA);
    return;
  }

  const { data: cfg } = await db
    .from("wa_settings")
    .select("lebre_ativa, limite_por_conversa")
    .eq("id", true)
    .maybeSingle();
  const ligada = cfg?.lebre_ativa ?? true;
  const limite = cfg?.limite_por_conversa ?? 30;
  if (!ligada || conv.lebre_ativa === false) {
    await db.from("wa_conversations").update({ precisa_humano: true }).eq("id", conv.id);
    return;
  }
  if ((conv.lebre_respostas ?? 0) >= limite) {
    await db
      .from("wa_conversations")
      .update({
        precisa_humano: true,
        motivo_humano: "Conversa longa: vale uma pessoa assumir",
        lebre_ativa: false,
      })
      .eq("id", conv.id);
    return;
  }

  const origem = conv.origem ?? origemPelaMensagem(texto);
  if (origem && !conv.origem) conv.origem = origem;
  let ficha = mesclarFicha(ficha0, extrairFatos(texto));
  let resposta: string;
  let humano = false;
  let motivo: string | undefined;

  if (pedeHumano(texto)) {
    humano = true;
    motivo = "Pediu para falar com uma pessoa";
    resposta = respostaHumano(ficha, agora);
  } else if (
    !conv.primeira_resposta_at &&
    !ficha.nome &&
    !ficha.restaurante &&
    /\b(vim pelo site|quero saber mais sobre a tipe|quero conhecer a tipe|quero saber como funciona)\b/i.test(texto)
  ) {
    // A entrada genérica do site recebe uma abertura fixa, curta e com uma pergunta só.
    resposta =
      "Oi! Sou a Lebre, assistente virtual da Tipe. Que bom que você quer conhecer a plataforma. Como posso te chamar?";
  } else {
    const { data: hist } = await db
      .from("wa_messages")
      .select("direction, body, autor, at")
      .eq("conversation_id", conv.id)
      .order("at", { ascending: false })
      .limit(14);
    const turnos: Turno[] = (
      (hist ?? []) as { direction: string; body: string; autor: string | null }[]
    )
      .reverse()
      .map((m) => ({
        autor: m.direction === "in" ? "cliente" : m.autor === "equipe" ? "equipe" : "lebre",
        texto: m.body,
      }));
    const { publicFacts } = await import("../lebre-fatos");
    const { askAI, AIUnavailable } = await import("../ai.server");
    try {
      const bruto = await askAI({
        system: promptComercial({
          fatos: publicFacts,
          ficha,
          agora,
          primeira: !conv.primeira_resposta_at,
        }),
        question: `Conversa até agora:\n${historicoTexto(turnos)}\n\nResponda à última mensagem do cliente.`,
        maxTokens: 700,
        tarefa: "esperta",
      });
      const d = lerDecisao(bruto, ficha);
      resposta = d.resposta;
      ficha = d.ficha;
      humano = d.humano;
      motivo = d.motivo ?? (d.humano ? "A Lebre pediu ajuda da equipe" : undefined);
    } catch (e) {
      if (!(e instanceof AIUnavailable)) console.error("[lebre-whatsapp]", (e as Error).message);
      humano = true;
      motivo = "Lebre indisponível no momento";
      resposta = respostaHumano(ficha, agora);
    }
  }
  if (!resposta.trim()) return;

  const novaEtapa = etapa(ficha, conv.etapa ?? "novo");
  const demoNova = Boolean(ficha.demo && ficha.demo !== ficha0.demo);
  if (demoNova && !humano) {
    humano = true;
    motivo = `Confirmar demonstração: ${ficha.demo}`;
  }

  const r = await enviar(db, conv, resposta);
  await criarLeadSePronto(db, conv, ficha);
  if (demoNova && conv.lead_id) {
    await db
      .from("crm_activities")
      .insert({
        lead_id: conv.lead_id,
        kind: "whatsapp",
        title: "Demonstração pedida pelo WhatsApp",
        body: `Horário pedido: ${ficha.demo}`,
      });
    await db
      .from("crm_tasks")
      .insert({
        lead_id: conv.lead_id,
        title: `Confirmar demonstração (${ficha.restaurante ?? ficha.nome ?? "WhatsApp"}): ${ficha.demo}`,
        due_at: agora.toISOString(),
      });
  }
  await db
    .from("wa_conversations")
    .update({
      ficha,
      temperatura: temperatura(ficha),
      etapa: novaEtapa,
      origem: conv.origem ?? null,
      lebre_respostas: (conv.lebre_respostas ?? 0) + (r.ok ? 1 : 0),
      ...(conv.primeira_resposta_at || !r.ok ? {} : { primeira_resposta_at: agora.toISOString() }),
      ...(ficha.nome && !conv.name ? { name: ficha.nome } : {}),
      ...(humano
        ? {
            precisa_humano: true,
            motivo_humano: motivo ?? null,
            status: "open",
            lebre_ativa: false,
          }
        : { unread: 0, status: "waiting" }),
      last_message_at: agora.toISOString(),
    })
    .eq("id", conv.id);
}
