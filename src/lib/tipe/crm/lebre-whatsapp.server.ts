// Atendimento da Lebre no WhatsApp comercial. Chamado pelo webhook depois que a
// mensagem do cliente foi gravada. Só responde dentro da janela de 24 h que o próprio
// cliente acabou de abrir; nunca inicia conversa e nunca responde quem pediu para sair.
import { AgendaGoogleError, criarGoogleMeet, formatoDemoFortaleza, horarioDemo } from "./google-calendar.server";
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
  proximaPergunta,
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

const normalizarTexto = (texto: string) =>
  texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

function pedidoReinicio(texto: string) {
  const t = normalizarTexto(texto);
  return /\b(recomec(ar|e)|comec(e|ar).*(de novo|do zero)|como se fosse.*primeira mensagem|primeira mensagem)\b/.test(t);
}

function pedidoNaoEntendi(texto: string) {
  const t = normalizarTexto(texto);
  return /\b(nao entendi|nao compreendi|explica de novo|pode repetir)\b/.test(t);
}

function respostaReinicio(ficha: Ficha): string {
  const nome = ficha.nome?.split(" ")[0];
  const partes = [
    ficha.restaurante ? ficha.restaurante + (ficha.cidade ? " fica em " + ficha.cidade : "") : "",
    ficha.mesas ? "tem " + ficha.mesas + " mesas" : "",
    ficha.dor ? "o principal desafio é " + ficha.dor : "",
    ficha.pdv ? "usa " + ficha.pdv + " como PDV" : "",
  ].filter(Boolean);
  const resumo = partes.length ? " Já tenho: " + partes.join(", ") + "." : "";
  const perguntas: Partial<Record<keyof Ficha, string>> = {
    nome: "Como posso te chamar?",
    restaurante: "Qual é o nome do restaurante?",
    cidade: "Em que cidade fica o restaurante?",
    mesas: "Quantas mesas o restaurante tem?",
    dor: "O que você gostaria de melhorar na operação?",
    pdv: "Qual sistema de PDV vocês usam?",
    demo: "Qual dia e horário, de segunda a sexta entre 8h e 18h, funcionam para uma demonstração de 20 minutos?",
  };
  const proxima = proximaPergunta(ficha);
  const pergunta = proxima ? perguntas[proxima] : "Quer que eu explique como o Tipe Pay pode ajudar?";
  return "Claro" + (nome ? ", " + nome : "") + ". Vamos recomeçar sem perder seus dados." + resumo + " " + pergunta;
}

function respostaSimplificada(ficha: Ficha): string {
  const nome = ficha.nome?.split(" ")[0];
  const cumprimento = "Claro" + (nome ? ", " + nome : "") + ". ";
  if (ficha.demoLink && ficha.demoInicio)
    return cumprimento + "Sua demonstração está marcada para " + ficha.demo + ". Vou te enviar o link do Google Meet por aqui no dia anterior.";
  return cumprimento + "O cliente abre a conta pelo QR Code da mesa e paga pelo celular, sem esperar o garçom trazer a conta nem pegar fila no caixa. Quer marcar uma demonstração de 20 minutos?";
}

function respostaAgendamento(nome?: string): string {
  return (nome ? "Perfeito, " + nome.split(" ")[0] + "! " : "Perfeito! ") +
    "Qual dia e horário, de segunda a sexta entre 8h e 18h, funcionam para uma conversa de 20 minutos?";
}

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
    f.demo ? `Demonstração: ${f.demo}` : "",
    f.demoLink ? `Google Meet: ${f.demoLink}` : "",
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
  const fatosMensagem = extrairFatos(texto);
  let ficha = mesclarFicha(ficha0, fatosMensagem);
  let resposta: string;
  let humano = false;
  let motivo: string | undefined;

  const horarioPedido = horarioDemo(texto, agora);
  let ultimaRespostaPediaHorario = false;
  if (horarioPedido) {
    const { data: ultimaSaida } = await db
      .from("wa_messages")
      .select("body")
      .eq("conversation_id", conv.id)
      .eq("direction", "out")
      .eq("autor", "lebre")
      .order("at", { ascending: false })
      .limit(1)
      .maybeSingle();
    ultimaRespostaPediaHorario = /demonstr|videochamada|video chamada|reuniao|meet/i.test(ultimaSaida?.body ?? "");
  }
  const contextoDemo = Boolean(ficha0.demo || ficha0.interesse) ||
    /demonstr|videochamada|video chamada|reuniao|meet/i.test(texto) || ultimaRespostaPediaHorario;
  if (horarioPedido && contextoDemo && !ficha0.demoEventId) {
    try {
      const meet = await criarGoogleMeet({
        conversationId: conv.id,
        inicio: horarioPedido,
        restaurante: ficha.restaurante ?? "Restaurante",
        contato: ficha.nome ?? conv.name ?? conv.phone,
        dor: ficha.dor,
      });
      ficha = {
        ...ficha,
        demo: formatoDemoFortaleza(horarioPedido),
        demoInicio: horarioPedido.toISOString(),
        demoLink: meet.link,
        demoEventId: meet.eventId,
      };
      resposta = "Combinado" + (ficha.nome ? ", " + ficha.nome.split(" ")[0] : "") + "! Sua demonstração da Tipe ficou confirmada para " + ficha.demo + ". Vou te enviar o link do Google Meet por aqui no dia anterior. Você poderá entrar pelo navegador.";
    } catch (e) {
      if (e instanceof AgendaGoogleError && e.code === "busy") {
        resposta = "Esse horário já está ocupado na agenda. Qual outro dia e horário, de segunda a sexta entre 8h e 18h, funcionam para você?";
      } else {
        await db.from("crm_tasks").insert({
          lead_id: conv.lead_id ?? null,
          title: "Criar Google Meet e confirmar demonstração (" + (ficha.restaurante ?? ficha.nome ?? "WhatsApp") + ")",
          due_at: agora.toISOString(),
        });
        humano = true;
        motivo = "Confirmar manualmente o horário solicitado e criar o Google Meet";
        resposta = "Anotei sua preferência para " + formatoDemoFortaleza(horarioPedido) + ", mas ainda preciso confirmar a agenda para fechar o horário. Vou pedir à equipe que confirme por aqui.";
      }
    }
  } else if (pedidoReinicio(texto)) {
    resposta = respostaReinicio(ficha);
  } else if (pedidoNaoEntendi(texto)) {
    resposta = respostaSimplificada(ficha);
  } else if (pedeHumano(texto)) {
    humano = true;
    motivo = "Pediu para falar com uma pessoa";
    resposta = respostaHumano(ficha, agora);
  } else if (
    fatosMensagem.pdv &&
    fatosMensagem.pdv !== ficha0.pdv &&
    ficha0.nome &&
    ficha0.restaurante &&
    ficha0.dor &&
    /pagamento|pagar|conta|caixa|fila|demor|atendimento/i.test(ficha0.dor)
  ) {
    const primeiroNome = ficha0.nome.split(" ")[0];
    resposta = `Certo, ${primeiroNome}! Então o ${ficha.restaurante} usa o ${fatosMensagem.pdv} como sistema de PDV. Com o Tipe Pay, o cliente pode pagar a conta pelo celular, sem precisar esperar o garçom trazer a conta ou enfrentar a fila do caixa. Quer saber mais sobre como funciona?`;
  } else if (
    !conv.primeira_resposta_at &&
    !ficha.nome &&
    !ficha.restaurante &&
    !ficha.mesas &&
    !ficha.email &&
    !ficha.pdv &&
    /\b(vim pelo site|quero saber mais sobre a tipe|quero conhecer a tipe|quero saber como funciona)\b/i.test(texto)
  ) {
    // A entrada genérica do site recebe uma abertura fixa, curta e com uma pergunta só.
    resposta =
      "Oi! Eu sou a Lebre, da Tipe. Sou assistente virtual e vou te ajudar por aqui. Como posso te chamar?";
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
  // Última barreira: nunca envia a ficha/decisão interna como texto ao cliente.
  if (/^\s*\{\s*"(?:resposta|ficha|humano)"\s*:/i.test(resposta)) {
    humano = true;
    motivo = "Resposta automática em formato inválido";
    resposta =
      "Desculpa, tive um problema para preparar minha resposta. Vou chamar alguém da equipe para continuar com você.";
  }

  const novaEtapa = etapa(ficha, conv.etapa ?? "novo");
  const meetNovo = Boolean(ficha.demoEventId && ficha.demoEventId !== ficha0.demoEventId);

  const r = await enviar(db, conv, resposta);
  await criarLeadSePronto(db, conv, ficha);
  if (meetNovo) {
    if (conv.lead_id) {
      await db.from("crm_activities").insert({
        lead_id: conv.lead_id,
        kind: "whatsapp",
        title: "Demonstração confirmada pela Lebre",
        body: ficha.demo + ". Google Meet: " + ficha.demoLink,
      });
    }
    const quando = ficha.demoInicio ? new Date(ficha.demoInicio) : agora;
    const lembrete = new Date(Math.max(agora.getTime(), quando.getTime() - 24 * 60 * 60_000));
    await db.from("crm_tasks").insert({
      lead_id: conv.lead_id ?? null,
      title: "Enviar link do Google Meet para " + (ficha.nome ?? "contato") + " — " + (ficha.restaurante ?? "restaurante") + " (" + ficha.demo + ")",
      due_at: lembrete.toISOString(),
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
