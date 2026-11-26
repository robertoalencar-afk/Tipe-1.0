import { beforeEach, describe, expect, it, vi } from "vitest";

const enviados: { to: string; body: string }[] = [];
let respostaModelo = "";
vi.mock("./whatsapp", () => ({
  sendText: vi.fn(async (_cfg: unknown, to: string, body: string) => {
    enviados.push({ to, body });
    return { ok: true, id: `wamid.${enviados.length}` };
  }),
}));
vi.mock("../ai.server", () => ({
  AIUnavailable: class extends Error {},
  askAI: vi.fn(async () => respostaModelo),
}));

import { atenderComLebre, type Conversa } from "./lebre-whatsapp.server";

type Op = { tabela: string; op: string; valor?: unknown; filtros: unknown[] };
/** Banco falso: registra cada operação e devolve dados por tabela. */
function bancoFalso(dados: Record<string, unknown> = {}) {
  const ops: Op[] = [];
  const db = {
    from(tabela: string) {
      const reg: Op = { tabela, op: "select", filtros: [] };
      const q: Record<string, unknown> = {};
      const chain = (op?: string) => (valor?: unknown) => {
        if (op) {
          reg.op = op;
          reg.valor = valor;
          ops.push(reg);
        } else reg.filtros.push(valor);
        return q;
      };
      Object.assign(q, {
        select: chain(),
        eq: chain(),
        or: chain(),
        order: chain(),
        limit: chain(),
        insert: chain("insert"),
        update: chain("update"),
        upsert: chain("upsert"),
        single: async () => ({ data: dados[`${tabela}:single`] ?? null }),
        maybeSingle: async () => ({ data: dados[tabela] ?? null }),
        then: (ok: (v: unknown) => void) => ok({ data: dados[tabela] ?? [], error: null }),
      });
      return q;
    },
  };
  return { db, ops };
}

const conv = (extra: Partial<Conversa> = {}): Conversa => ({ id: "c1", phone: "558599990000", name: null, lead_id: null, lebre_ativa: true, ficha: {}, etapa: "novo", lebre_respostas: 0, primeira_resposta_at: null, ...extra });
const quarta22h = new Date(Date.UTC(2026, 10, 26, 1));

beforeEach(() => {
  enviados.length = 0;
  process.env["WHATSAPP_TOKEN"] = "t";
  process.env["WHATSAPP_PHONE_NUMBER_ID"] = "p";
});

describe("atendimento da Lebre", () => {
  it("responde, guarda a ficha e marca a primeira resposta", async () => {
    respostaModelo = JSON.stringify({ resposta: "Boa noite! Aqui é a Lebre, da Tipe. Como você se chama e qual é o restaurante?", ficha: { cidade: "Fortaleza" }, humano: false });
    const { db, ops } = bancoFalso({ wa_settings: { lebre_ativa: true, limite_por_conversa: 30 } });
    await atenderComLebre(db, conv(), "Olá! Vim pelo site e quero conhecer a Tipe. Temos 18 mesas.", quarta22h);
    expect(enviados).toHaveLength(1);
    expect(enviados[0]!.body).toContain("Lebre, da Tipe");
    const upd = ops.find((o) => o.tabela === "wa_conversations" && o.op === "update")!.valor as Record<string, unknown>;
    expect(upd["ficha"]).toEqual({ mesas: 18, cidade: "Fortaleza" });
    expect(upd["origem"]).toBe("site");
    expect(upd["etapa"]).toBe("qualificando");
    expect(upd["primeira_resposta_at"]).toBeTruthy();
    expect(upd["precisa_humano"]).toBeUndefined();
    const msg = ops.find((o) => o.tabela === "wa_messages" && o.op === "insert")!.valor as Record<string, unknown>;
    expect(msg["autor"]).toBe("lebre");
  });

  it("SAIR: confirma, registra opt-out e não chama a IA", async () => {
    respostaModelo = "não deveria ser usado";
    const { db, ops } = bancoFalso();
    await atenderComLebre(db, conv({ prospect_id: "p1" }), "SAIR", quarta22h);
    expect(enviados[0]!.body).toMatch(/não vai mais receber/);
    expect(ops.some((o) => o.tabela === "crm_optout" && o.op === "upsert")).toBe(true);
    expect(ops.some((o) => o.tabela === "crm_prospects" && (o.valor as Record<string, unknown>)["status"] === "opt_out")).toBe(true);
  });

  it("quem já saiu nunca recebe resposta", async () => {
    const { db } = bancoFalso();
    await atenderComLebre(db, conv({ optout: true }), "oi", quarta22h);
    expect(enviados).toHaveLength(0);
  });

  it("conversa assumida pela equipe ou Lebre desligada: só vai para a fila", async () => {
    const a = bancoFalso({ wa_settings: { lebre_ativa: true } });
    await atenderComLebre(a.db, conv({ lebre_ativa: false }), "oi", quarta22h);
    const b = bancoFalso({ wa_settings: { lebre_ativa: false } });
    await atenderComLebre(b.db, conv(), "oi", quarta22h);
    expect(enviados).toHaveLength(0);
    for (const { ops } of [a, b]) expect(ops.find((o) => o.op === "update")!.valor).toEqual({ precisa_humano: true });
  });

  it("pedido de pessoa: avisa quando a equipe responde e pausa a Lebre", async () => {
    const { db, ops } = bancoFalso({ wa_settings: { lebre_ativa: true } });
    await atenderComLebre(db, conv({ ficha: { nome: "Carla" } }), "quero falar com uma pessoa", quarta22h);
    expect(enviados[0]!.body).toBe("Combinado, Carla. Já passei sua conversa para o Roberto, da equipe da Tipe, e ele te responde por aqui amanhã a partir das 8h.");
    const upd = ops.filter((o) => o.tabela === "wa_conversations" && o.op === "update").pop()!.valor as Record<string, unknown>;
    expect(upd).toMatchObject({ precisa_humano: true, lebre_ativa: false, motivo_humano: "Pediu para falar com uma pessoa" });
  });

  it("demonstração pedida com ficha completa: cria lead, tarefa e chama o Roberto", async () => {
    respostaModelo = JSON.stringify({
      resposta: "Perfeito, Carla. Anotei quinta às 15h e o Roberto confirma por aqui.",
      ficha: { nome: "Carla", restaurante: "Bistrô da Praia", email: "carla@bistro.com", demo: "quinta 15h", mesas: 22 },
      humano: false,
    });
    const { db, ops } = bancoFalso({ wa_settings: { lebre_ativa: true }, "restaurant_leads:single": { id: "lead1" } });
    await atenderComLebre(db, conv(), "pode ser quinta às 15h, meu e-mail é carla@bistro.com", quarta22h);
    const lead = ops.find((o) => o.tabela === "restaurant_leads" && o.op === "insert")!.valor as Record<string, unknown>;
    expect(lead).toMatchObject({ restaurant_name: "Bistrô da Praia", contact_name: "Carla", email: "carla@bistro.com", discovery_source: "whatsapp", phone: "+558599990000" });
    expect(ops.some((o) => o.tabela === "crm_tasks" && o.op === "insert")).toBe(true);
    const upd = ops.filter((o) => o.tabela === "wa_conversations" && o.op === "update").pop()!.valor as Record<string, unknown>;
    expect(upd).toMatchObject({ etapa: "demo", temperatura: "quente", precisa_humano: true, motivo_humano: "Confirmar demonstração: quinta 15h" });
  });

  it("limite de respostas por conversa passa para a equipe", async () => {
    const { db } = bancoFalso({ wa_settings: { lebre_ativa: true, limite_por_conversa: 5 } });
    await atenderComLebre(db, conv({ lebre_respostas: 5 }), "oi", quarta22h);
    expect(enviados).toHaveLength(0);
  });
});
