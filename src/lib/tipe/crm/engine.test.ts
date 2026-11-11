import { describe, expect, it } from "vitest";
import { dispatch, type Command } from "./engine";
import { dashboard, periodRange, xpTotal } from "./metrics";
import { createSeed } from "./seed";
import type { CrmState } from "./types";

const NOW = "2026-10-22T15:00:00.000Z";
let clock = new Date(NOW).getTime();
const tick = () => new Date((clock += 60 * 60000)).toISOString();

function ok(s: CrmState, cmd: Command) {
  const r = dispatch(s, cmd, tick());
  if (!r.ok) throw new Error(`${cmd.type}: ${r.error}`);
  return r;
}
function fail(s: CrmState, cmd: Command) {
  const r = dispatch(s, cmd, tick());
  expect(r.ok).toBe(false);
  return r as Extract<typeof r, { ok: false }>;
}
const login = (s: CrmState, email: string) =>
  ok(s, { type: "login", email, password: "demo1234" }).state;

describe("dados de demonstração", () => {
  it("mantêm todas as relações dentro da mesma organização", () => {
    const s = createSeed(NOW);
    const org = (list: { id: string; orgId: string }[], id?: string) =>
      list.find((x) => x.id === id)?.orgId;
    for (const d of s.deals) {
      expect(org(s.contacts, d.contactId)).toBe(d.orgId);
      if (d.companyId) expect(org(s.companies, d.companyId)).toBe(d.orgId);
      expect(s.memberships.some((m) => m.orgId === d.orgId && m.userId === d.ownerId)).toBe(true);
      expect(d.createdAt <= (d.closedAt ?? d.createdAt)).toBe(true);
    }
    for (const t of s.tasks) {
      if (t.dealId) expect(org(s.deals, t.dealId)).toBe(t.orgId);
      if (t.contactId) expect(org(s.contacts, t.contactId)).toBe(t.orgId);
    }
    for (const c of s.conversations) expect(org(s.contacts, c.contactId)).toBe(c.orgId);
    for (const m of s.messages) expect(org(s.conversations, m.conversationId)).toBe(m.orgId);
    // Nenhum prêmio de pontos duplicado por fato.
    const net = new Map<string, number>();
    for (const e of s.xp) net.set(e.ref, (net.get(e.ref) ?? 0) + e.points);
    for (const [, v] of net) expect(v).toBeGreaterThanOrEqual(0);
    expect(new Set(s.xp.filter((e) => e.points > 0).map((e) => e.ref)).size).toBe(
      s.xp.filter((e) => e.points > 0).length,
    );
  });
});

describe("fluxo comercial", () => {
  it("contato → lead → qualificação → oportunidade → ganho atualiza painel e pontos uma única vez", () => {
    let s = login(createSeed(NOW), "thiago@tipe.demo");
    const scope = { orgId: "org_tipe" };
    const before = dashboard(s, scope, periodRange("mes", NOW), NOW);
    const xpBefore = xpTotal(s, "org_tipe", "usr_thiago");

    let r = ok(s, {
      type: "createContact",
      data: {
        name: "Cliente Teste",
        phone: "(85) 90000-9999",
        whatsapp: "",
        email: "teste@exemplo.demo",
        jobTitle: "Dono",
        source: "Manual",
        ownerId: "usr_thiago",
        status: "ativo",
        tags: [],
        notes: "",
      },
    });
    s = r.state;
    r = ok(s, {
      type: "createLead",
      data: {
        name: "Cliente Teste",
        companyName: "Bar Teste",
        email: "teste@exemplo.demo",
        phone: "",
        source: "Indicação",
        ownerId: "usr_thiago",
        profile: {},
      },
    });
    s = r.state;
    const leadId = r.id!;
    expect(fail(s, { type: "qualifyLead", id: leadId }).error).toMatch(/perfil/);
    s = ok(s, {
      type: "updateLead",
      id: leadId,
      data: { profile: { tables_range: "21_40", pdv_system: "Colibri", peak_queue: "sempre" } },
    }).state;
    s = ok(s, { type: "qualifyLead", id: leadId }).state;
    expect(xpTotal(s, "org_tipe", "usr_thiago")).toBe(xpBefore + 30);
    r = ok(s, { type: "convertLead", id: leadId, title: "Bar Teste: assinatura", value: 12000 });
    s = r.state;
    const dealId = r.id!;
    const deal = s.deals.find((d) => d.id === dealId)!;
    expect(deal.contactId).toBe(s.contacts.find((c) => c.email === "teste@exemplo.demo")!.id); // reaproveita o contato
    expect(s.leads.find((l) => l.id === leadId)!.status).toBe("convertido");

    const pipeline = s.pipelines.find((p) => p.id === deal.pipelineId)!;
    const won = pipeline.stages.find((st) => st.kind === "ganho")!;
    const neg = pipeline.stages.find((st) => st.name === "Negociação")!;
    s = ok(s, { type: "moveDeal", id: dealId, stageId: neg.id }).state;
    s = ok(s, { type: "moveDeal", id: dealId, stageId: won.id }).state;
    const later = tick();
    const after = dashboard(s, scope, { from: periodRange("mes", NOW).from, to: later }, later);
    expect(after.revenueWon).toBe(before.revenueWon + 12000);
    expect(after.won).toBe(before.won + 1);
    const xpWon = xpTotal(s, "org_tipe", "usr_thiago");
    expect(xpWon).toBeGreaterThanOrEqual(xpBefore + 30 + 150);
    expect(s.contacts.find((c) => c.id === deal.contactId)!.status).toBe("cliente");

    // Reabrir e ganhar de novo não duplica pontos.
    s = ok(s, { type: "moveDeal", id: dealId, stageId: neg.id }).state;
    expect(xpTotal(s, "org_tipe", "usr_thiago")).toBeLessThan(xpWon);
    s = ok(s, { type: "moveDeal", id: dealId, stageId: won.id }).state;
    expect(xpTotal(s, "org_tipe", "usr_thiago")).toBe(xpWon);
    expect(s.xp.filter((e) => e.ref === `deal:${dealId}`).reduce((a, e) => a + e.points, 0)).toBe(
      150,
    );
  });

  it("perder exige motivo", () => {
    const s = login(createSeed(NOW), "thiago@tipe.demo");
    const deal = s.deals.find((d) => d.ownerId === "usr_thiago" && d.status === "aberta")!;
    const lost = s.pipelines
      .find((p) => p.id === deal.pipelineId)!
      .stages.find((st) => st.kind === "perdido")!;
    expect(fail(s, { type: "moveDeal", id: deal.id, stageId: lost.id }).error).toMatch(/motivo/);
    const r = ok(s, { type: "moveDeal", id: deal.id, stageId: lost.id, lostReason: "Preço" });
    expect(r.state.deals.find((d) => d.id === deal.id)!.status).toBe("perdida");
  });
});

describe("permissões e isolamento", () => {
  it("somente leitura não altera nada e a tentativa fica na auditoria", () => {
    const s = login(createSeed(NOW), "lia@tipe.demo");
    const deal = s.deals.find((d) => d.orgId === "org_tipe" && d.status === "aberta")!;
    const r = fail(s, { type: "moveDeal", id: deal.id, stageId: deal.stageId + "x" });
    expect(r.error).toMatch(/só pode alterar|não permite/);
    expect(r.state.audit[0]?.result).toBe("negado");
  });

  it("vendedor não move oportunidade de outra pessoa", () => {
    const s = login(createSeed(NOW), "thiago@tipe.demo");
    const deal = s.deals.find((d) => d.ownerId === "usr_bruna" && d.status === "aberta")!;
    const stage = s.pipelines
      .find((p) => p.id === deal.pipelineId)!
      .stages.find((st) => st.id !== deal.stageId && st.kind === "aberta")!;
    expect(fail(s, { type: "moveDeal", id: deal.id, stageId: stage.id }).error).toMatch(/próprias/);
  });

  it("uma organização não alcança registros de outra", () => {
    const s = login(createSeed(NOW), "otavio@parceiro.demo");
    const dealA = s.deals.find((d) => d.orgId === "org_tipe")!;
    expect(fail(s, { type: "updateDeal", id: dealA.id, data: { value: 1 } }).error).toMatch(
      /não encontrad/,
    );
    expect(fail(s, { type: "switchOrg", orgId: "org_tipe" }).error).toMatch(/não participa/);
  });
});

describe("organizações e equipe", () => {
  it("cria organização, convida, define papel, alterna e vê dados isolados", () => {
    let s = login(createSeed(NOW), "helena@tipe.demo");
    let r = ok(s, { type: "createOrg", name: "Tipe Natal", segment: "Expansão" });
    s = r.state;
    const orgId = r.id!;
    expect(s.session!.orgId).toBe(orgId);
    expect(dashboard(s, { orgId }, periodRange("ano", NOW), NOW).pipelineValue).toBe(0);
    r = ok(s, {
      type: "inviteMember",
      email: "nova@exemplo.demo",
      name: "Nova Pessoa",
      role: "seller",
    });
    s = ok(r.state, { type: "acceptInvite", inviteId: r.id! }).state;
    const m = s.memberships.find((x) => x.orgId === orgId && x.userId !== "usr_helena")!;
    s = ok(s, { type: "changeRole", membershipId: m.id, role: "manager" }).state;
    // Starter permite 3 usuários: Helena, Nova e um convite.
    s = ok(s, {
      type: "inviteMember",
      email: "terceira@exemplo.demo",
      name: "Terceira",
      role: "agent",
    }).state;
    expect(
      fail(s, { type: "inviteMember", email: "quarta@exemplo.demo", name: "Quarta", role: "agent" })
        .error,
    ).toMatch(/Starter permite até 3/);
    r = ok(s, { type: "changePlan", planId: "professional" });
    s = r.state;
    expect(s.invoices[0]?.simulated).toBe(true);
    s = ok(s, {
      type: "inviteMember",
      email: "quarta@exemplo.demo",
      name: "Quarta",
      role: "agent",
    }).state;
    // A nova pessoa só enxerga a nova organização.
    s = ok(s, { type: "logout" }).state;
    s = login(s, "nova@exemplo.demo");
    expect(s.session!.orgId).toBe(orgId);
    expect(fail(s, { type: "switchOrg", orgId: "org_tipe" }).ok).toBe(false);
  });

  it("não deixa a organização sem proprietário", () => {
    const s = login(createSeed(NOW), "helena@tipe.demo");
    const own = s.memberships.find((m) => m.orgId === "org_tipe" && m.userId === "usr_helena")!;
    expect(fail(s, { type: "changeRole", membershipId: own.id, role: "admin" }).error).toMatch(
      /proprietário/,
    );
  });
});

describe("atendimento", () => {
  it("mensagem simulada → atribuição → resposta → oportunidade → encerramento", () => {
    let s = login(createSeed(NOW), "davi@tipe.demo");
    let r = ok(s, {
      type: "simulateInbound",
      name: "Novo Cliente",
      phone: "(85) 90000-7777",
      text: "Quero conhecer a Tipe",
    });
    s = r.state;
    const convId = r.id!;
    expect(s.conversations.find((c) => c.id === convId)!.unread).toBe(1);
    s = ok(s, { type: "assignConversation", conversationId: convId, userId: "usr_davi" }).state;
    s = ok(s, { type: "sendMessage", conversationId: convId, text: "Olá! Vamos agendar?" }).state;
    const out = s.messages.filter((m) => m.conversationId === convId && m.direction === "saida");
    expect(out[0]?.simulated).toBe(true);
    r = ok(s, {
      type: "createDealFromConversation",
      conversationId: convId,
      title: "Novo Cliente: assinatura",
      value: 6000,
    });
    s = r.state;
    expect(s.deals.find((d) => d.id === r.id)!.conversationId).toBe(convId);
    s = ok(s, { type: "setConversationStatus", conversationId: convId, status: "encerrada" }).state;
    expect(fail(s, { type: "sendMessage", conversationId: convId, text: "oi" }).error).toMatch(
      /Reabra/,
    );
  });
});

describe("produtividade e gamificação", () => {
  it("tarefa atribuída e concluída pontua uma vez; tarefa relâmpago sem vínculo não pontua", () => {
    let s = login(createSeed(NOW), "marina@tipe.demo");
    let r = ok(s, {
      type: "createTask",
      data: {
        title: "Ligar para o Bar Teste",
        description: "",
        type: "ligacao",
        assigneeId: "usr_bruna",
        priority: "alta",
        dueAt: NOW,
      },
    });
    s = ok(r.state, { type: "logout" }).state;
    s = login(s, "bruna@tipe.demo");
    const xp0 = xpTotal(s, "org_tipe", "usr_bruna");
    s = ok(s, { type: "setTaskStatus", id: r.id!, status: "concluida" }).state;
    expect(xpTotal(s, "org_tipe", "usr_bruna")).toBe(xp0 + 10);
    s = ok(s, { type: "setTaskStatus", id: r.id!, status: "pendente" }).state;
    s = ok(s, { type: "setTaskStatus", id: r.id!, status: "concluida" }).state;
    expect(xpTotal(s, "org_tipe", "usr_bruna")).toBe(xp0 + 10);

    // Criada e concluída na hora, sem vínculo: não pontua.
    const now = new Date(clock).toISOString();
    r = dispatch(
      s,
      {
        type: "createTask",
        data: {
          title: "Tarefa vazia",
          description: "",
          type: "tarefa",
          assigneeId: "usr_bruna",
          priority: "baixa",
          dueAt: now,
        },
      },
      now,
    ) as typeof r;
    const done = dispatch(
      r.state,
      { type: "setTaskStatus", id: r.id!, status: "concluida" },
      new Date(clock + 60000).toISOString(),
    );
    expect(xpTotal(done.state, "org_tipe", "usr_bruna")).toBe(xp0 + 10);
  });
});
