import { describe, expect, it } from "vitest";
import { dispatch, type Command } from "./engine";
import {
  benefitBlocker,
  defaultFoundingPartnerRules,
  FOUNDING_PARTNER_APPROVED_RULES,
  FP_STATUS_ORDER,
  FP_TRANSITIONS,
  rulesApproved,
  rulesOf,
  transitionBlocker,
} from "./founding-partner";
import { createSeed } from "./seed";
import { DEMO_TERMS_VERSION } from "./seed-ecosystem";
import type { CrmState, FoundingPartnerEnrollment, RestaurantAccount } from "./types";

// Programa Restaurante Fundador: transições permitidas e negadas, auditoria de cada
// mudança e nenhum benefício por padrão.

const NOW = "2026-11-04T15:00:00.000Z";
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

/** Conta ativa da Tipe ainda fora do programa. */
function freeAccount(s: CrmState): RestaurantAccount {
  const a = s.accounts.find(
    (x) =>
      x.orgId === "org_tipe" &&
      x.status === "ativa" &&
      !s.foundingPartners.some((e) => e.accountId === x.id),
  );
  if (!a) throw new Error("sem conta livre no seed");
  return a;
}
const enr = (s: CrmState, accountId: string) =>
  s.foundingPartners.find((e) => e.accountId === accountId)!;

describe("seed do Restaurante Fundador", () => {
  const s = createSeed(NOW);
  it("tem poucas adesões, todas da organização da Tipe e ligadas a contas existentes", () => {
    expect(s.foundingPartners.length).toBeGreaterThan(2);
    expect(s.foundingPartners.length).toBeLessThanOrEqual(8);
    for (const e of s.foundingPartners) {
      const a = s.accounts.find((x) => x.id === e.accountId);
      expect(a?.orgId).toBe(e.orgId);
      expect(e.orgId).toBe("org_tipe");
    }
  });
  it("nenhum benefício concedido e regras comerciais aprovadas em 28/10 sem preço nem desconto", () => {
    for (const e of s.foundingPartners) expect(e.benefits).toEqual([]);
    const r = rulesOf(s, "org_tipe");
    expect(r.slots).toBe(FOUNDING_PARTNER_APPROVED_RULES.slots);
    expect(r.enrollmentOpensAt).toBe(FOUNDING_PARTNER_APPROVED_RULES.enrollmentOpensAt);
    expect(r.enrollmentClosesAt).toBe(FOUNDING_PARTNER_APPROVED_RULES.enrollmentClosesAt);
    expect(r.advantages).toEqual([...FOUNDING_PARTNER_APPROVED_RULES.advantages]);
    expect(rulesApproved(r)).toBe(true);
    for (const a of r.advantages) expect(a).not.toMatch(/R\$|%|desconto|grátis|gratuit|vagas limitadas/i);
  });
  it("todo participante tem aceite de termos com versão e data de entrada", () => {
    for (const e of s.foundingPartners.filter((x) =>
      ["participante", "selecionado_piloto"].includes(x.status),
    )) {
      expect(e.terms?.version).toBe(DEMO_TERMS_VERSION);
      expect(e.joinedAt).toBeDefined();
    }
  });
  it("a trilha de cada adesão termina no estado atual", () => {
    for (const e of s.foundingPartners) {
      const last = e.history.find((h) => h.to);
      expect(last?.to).toBe(e.status);
    }
  });
  it("regras padrão vêm todas vazias", () => {
    const r = defaultFoundingPartnerRules("x");
    expect(r).toMatchObject({ slots: null, advantages: [], termsVersion: null, approvedAt: null });
  });
});

describe("tabela de transições", () => {
  const base = createSeed(NOW);
  const account = { ...freeAccount(base) };
  const rules = { ...defaultFoundingPartnerRules("org_tipe"), termsVersion: "v1" };
  const mk = (
    status: FoundingPartnerEnrollment["status"],
    extra: Partial<FoundingPartnerEnrollment> = {},
  ): FoundingPartnerEnrollment => ({
    id: "fp_t",
    orgId: "org_tipe",
    accountId: account.id,
    status,
    createdAt: NOW,
    statusChangedAt: NOW,
    pilotEligible: false,
    invites: [],
    benefits: [],
    communications: [],
    feedback: [],
    history: [],
    ...extra,
  });
  const check = (
    e: FoundingPartnerEnrollment,
    to: FoundingPartnerEnrollment["status"],
    reason = "motivo registrado",
  ) => transitionBlocker({ enrollment: e, to, account, rules, activeCount: 0, reason });

  it("encerrado é estado final", () => {
    expect(FP_TRANSITIONS.encerrado).toEqual([]);
    for (const to of FP_STATUS_ORDER) expect(check(mk("encerrado"), to)).not.toBeNull();
  });
  it("não pula etapas: convidado não vira participante nem piloto", () => {
    expect(check(mk("convidado"), "participante")).toMatch(/Não é possível/);
    expect(check(mk("convidado"), "selecionado_piloto")).toMatch(/Não é possível/);
    expect(check(mk("interessado"), "participante")).toMatch(/Não é possível/);
  });
  it("participar exige aceite dos termos na versão vigente", () => {
    expect(check(mk("elegivel"), "participante")).toMatch(/aceite dos termos/);
    const old = mk("elegivel", {
      terms: { version: "v0", acceptedAt: NOW, acceptedByName: "Ana", recordedBy: "u" },
    });
    expect(check(old, "participante")).toMatch(/versão vigente/);
    const cur = mk("elegivel", {
      terms: { version: "v1", acceptedAt: NOW, acceptedByName: "Ana", recordedBy: "u" },
    });
    expect(check(cur, "participante")).toBeNull();
  });
  it("sem versão aprovada dos termos ninguém participa", () => {
    const e = mk("elegivel", {
      terms: { version: "v1", acceptedAt: NOW, acceptedByName: "Ana", recordedBy: "u" },
    });
    const r = transitionBlocker({
      enrollment: e,
      to: "participante",
      account,
      rules: defaultFoundingPartnerRules("org_tipe"),
      activeCount: 0,
      reason: "",
    });
    expect(r).toMatch(/versão aprovada/);
  });
  it("piloto exige elegibilidade registrada", () => {
    expect(check(mk("participante"), "selecionado_piloto")).toMatch(/elegível para o piloto/);
    expect(check(mk("participante", { pilotEligible: true }), "selecionado_piloto")).toBeNull();
  });
  it("suspender e encerrar pedem motivo", () => {
    expect(check(mk("participante"), "suspenso", "")).toMatch(/motivo/);
    expect(check(mk("participante"), "encerrado", " ")).toMatch(/motivo/);
    expect(check(mk("participante"), "suspenso")).toBeNull();
  });
  it("vagas, quando aprovadas, são respeitadas", () => {
    const e = mk("elegivel", {
      terms: { version: "v1", acceptedAt: NOW, acceptedByName: "Ana", recordedBy: "u" },
    });
    const r = transitionBlocker({
      enrollment: e,
      to: "participante",
      account,
      rules: { ...rules, slots: 2 },
      activeCount: 2,
      reason: "",
    });
    expect(r).toMatch(/vagas/);
  });
  it("benefício sem regra comercial aprovada é recusado", () => {
    expect(benefitBlocker(mk("participante"), rules, "Qualquer coisa")).toMatch(/Pendente/i);
  });
});

describe("motor: comandos do programa", () => {
  it("convite, interesse, elegibilidade, termos e participação, tudo auditado", () => {
    let s = login(createSeed(NOW), "helena@tipe.demo");
    const a = freeAccount(s);
    const auditBefore = s.audit.length;
    s = ok(s, { type: "fpInvite", accountId: a.id, channel: "email" }).state;
    const id = enr(s, a.id).id;
    expect(enr(s, a.id).status).toBe("convidado");
    expect(enr(s, a.id).invites[0]?.simulated).toBe(true);
    s = ok(s, { type: "fpTransition", enrollmentId: id, to: "interessado" }).state;
    s = ok(s, { type: "fpTransition", enrollmentId: id, to: "elegivel" }).state;
    // Sem aceite, não participa.
    const denied = fail(s, { type: "fpTransition", enrollmentId: id, to: "participante" });
    expect(denied.error).toMatch(/aceite dos termos/);
    expect(enr(denied.state, a.id).status).toBe("elegivel");
    s = ok(s, { type: "fpRecordTerms", enrollmentId: id, acceptedByName: "Ana Ribeiro" }).state;
    expect(enr(s, a.id).terms?.version).toBe(DEMO_TERMS_VERSION);
    s = ok(s, { type: "fpTransition", enrollmentId: id, to: "participante" }).state;
    const e = enr(s, a.id);
    expect(e.status).toBe("participante");
    expect(e.joinedAt).toBeDefined();
    expect(e.benefits).toEqual([]);
    const states = e.history.filter((h) => h.kind === "estado").map((h) => `${h.from}>${h.to}`);
    expect(states).toEqual([
      "elegivel>participante",
      "interessado>elegivel",
      "convidado>interessado",
    ]);
    for (const h of e.history) {
      expect(h.actorId).toBeTruthy();
      expect(h.at).toBeTruthy();
    }
    const fpAudit = s.audit
      .slice(0, s.audit.length - auditBefore)
      .filter((x) => x.action.startsWith("founding_partner."));
    expect(fpAudit.map((x) => x.action)).toEqual([
      "founding_partner.estado",
      "founding_partner.termos",
      "founding_partner.estado",
      "founding_partner.estado",
      "founding_partner.convite",
    ]);
    expect(fpAudit.every((x) => x.result === "ok" && x.actorId)).toBe(true);
  });

  it("transição inválida não muda nada e não entra na trilha", () => {
    let s = login(createSeed(NOW), "helena@tipe.demo");
    const a = freeAccount(s);
    s = ok(s, { type: "fpInvite", accountId: a.id, channel: "whatsapp" }).state;
    const id = enr(s, a.id).id;
    const r = fail(s, { type: "fpTransition", enrollmentId: id, to: "selecionado_piloto" });
    expect(enr(r.state, a.id).status).toBe("convidado");
    expect(enr(r.state, a.id).history).toHaveLength(1);
  });

  it("não convida duas vezes a mesma conta nem conta cancelada", () => {
    let s = login(createSeed(NOW), "helena@tipe.demo");
    const a = freeAccount(s);
    s = ok(s, { type: "fpInvite", accountId: a.id, channel: "email" }).state;
    expect(fail(s, { type: "fpInvite", accountId: a.id, channel: "email" }).error).toMatch(
      /já está no programa/,
    );
    const canceled = s.accounts.find((x) => x.orgId === "org_tipe" && x.status === "cancelada");
    if (canceled)
      expect(fail(s, { type: "fpInvite", accountId: canceled.id, channel: "email" }).error).toMatch(
        /cancelada/,
      );
  });

  it("vantagem fora do texto aprovado é recusada", () => {
    let s = login(createSeed(NOW), "helena@tipe.demo");
    const e = s.foundingPartners.find((x) => x.status === "participante")!;
    const r = fail(s, {
      type: "fpGrantBenefit",
      enrollmentId: e.id,
      advantage: "Qualquer vantagem",
    });
    expect(r.error).toMatch(/exatamente como aprovada/i);
    s = r.state;
    expect(s.foundingPartners.every((x) => x.benefits.length === 0)).toBe(true);
  });

  it("com regra aprovada, só a vantagem com texto idêntico é concedida e auditada", () => {
    let s = login(createSeed(NOW), "helena@tipe.demo");
    s = ok(s, {
      type: "fpSetRules",
      slots: null,
      enrollmentOpensAt: null,
      enrollmentClosesAt: null,
      advantages: ["Vantagem A aprovada"],
      termsVersion: DEMO_TERMS_VERSION,
      approvalRef: "Ata de teste",
    }).state;
    const e = s.foundingPartners.find((x) => x.status === "participante")!;
    fail(s, { type: "fpGrantBenefit", enrollmentId: e.id, advantage: "Vantagem B" });
    s = ok(s, {
      type: "fpGrantBenefit",
      enrollmentId: e.id,
      advantage: "Vantagem A aprovada",
    }).state;
    const after = s.foundingPartners.find((x) => x.id === e.id)!;
    expect(after.benefits).toHaveLength(1);
    expect(after.benefits[0]?.approvalRef).toBe("Ata de teste");
    expect(s.audit[0]?.action).toBe("founding_partner.beneficio");
  });

  it("papéis: vendedor não altera, gestor altera, só proprietário/admin mexe nas regras", () => {
    const seed = createSeed(NOW);
    const e = seed.foundingPartners.find((x) => x.status === "convidado")!;
    // thiago é vendedor na organização da Tipe.
    const seller = login(seed, "thiago@tipe.demo");
    const r = fail(seller, { type: "fpTransition", enrollmentId: e.id, to: "interessado" });
    expect(r.state.audit[0]).toMatchObject({ result: "negado", action: "fpTransition" });
    const manager = login(seed, "marina@tipe.demo");
    ok(manager, { type: "fpTransition", enrollmentId: e.id, to: "interessado" });
    fail(manager, {
      type: "fpSetRules",
      slots: 10,
      enrollmentOpensAt: null,
      enrollmentClosesAt: null,
      advantages: [],
      termsVersion: null,
      approvalRef: "x",
    });
  });

  it("organização parceira não opera o programa da Tipe", () => {
    const seed = createSeed(NOW);
    const s = login(seed, "otavio@parceiro.demo");
    const acc = s.accounts.find((a) => a.orgId === s.session!.orgId);
    if (acc) {
      const r = fail(s, { type: "fpInvite", accountId: acc.id, channel: "email" });
      expect(r.error).toMatch(/organização da Tipe/);
    }
    const tipeE = seed.foundingPartners[0]!;
    const r2 = fail(s, {
      type: "fpTransition",
      enrollmentId: tipeE.id,
      to: "encerrado",
      reason: "x y z",
    });
    expect(r2.error).toBeTruthy();
  });

  it("encerrar suspende benefícios concedidos e é estado final", () => {
    let s = login(createSeed(NOW), "helena@tipe.demo");
    s = ok(s, {
      type: "fpSetRules",
      slots: null,
      enrollmentOpensAt: null,
      enrollmentClosesAt: null,
      advantages: ["Vantagem A aprovada"],
      termsVersion: DEMO_TERMS_VERSION,
      approvalRef: "Ata de teste",
    }).state;
    const e = s.foundingPartners.find((x) => x.status === "participante")!;
    s = ok(s, {
      type: "fpGrantBenefit",
      enrollmentId: e.id,
      advantage: "Vantagem A aprovada",
    }).state;
    s = ok(s, {
      type: "fpTransition",
      enrollmentId: e.id,
      to: "encerrado",
      reason: "Pediu para sair",
    }).state;
    const after = s.foundingPartners.find((x) => x.id === e.id)!;
    expect(after.benefits[0]?.revokedAt).toBeDefined();
    fail(s, { type: "fpTransition", enrollmentId: e.id, to: "participante" });
  });
});

describe("adaptador do banco", () => {
  it("converte as linhas da migração 0041 sem inventar benefício", async () => {
    const { foundingPartnerFromRows } = await import("./adapters");
    const e = foundingPartnerFromRows(
      {
        enrollment: {
          id: "e1",
          restaurant_id: "r1",
          crm_account_id: null,
          status: "participante",
          created_at: "2026-10-01T10:00:00Z",
          status_changed_at: "2026-10-05T10:00:00Z",
          joined_at: "2026-10-05T10:00:00Z",
          pilot_eligible: false,
          pilot_note: null,
        },
        terms: [
          {
            version: "v1",
            accepted_by_name: "Ana",
            accepted_at: "2026-10-04T10:00:00Z",
            recorded_by: "u",
          },
        ],
        invites: [],
        benefits: [],
        communications: [],
        feedback: [],
        events: [
          {
            id: 1,
            kind: "estado",
            from_status: null,
            to_status: "convidado",
            detail: "",
            actor_id: "u",
            at: "2026-10-01T10:00:00Z",
          },
          {
            id: 2,
            kind: "estado",
            from_status: "elegivel",
            to_status: "participante",
            detail: "",
            actor_id: "u",
            at: "2026-10-05T10:00:00Z",
          },
        ],
      },
      { orgId: "org_tipe", accountId: "acc1" },
    );
    expect(e.benefits).toEqual([]);
    expect(e.terms?.version).toBe("v1");
    expect(e.history[0]?.to).toBe("participante");
  });
});
