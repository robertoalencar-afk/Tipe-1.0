import { describe, expect, it } from "vitest";
import { leadFromWaitlist, visitFromPayment } from "./adapters";
import { dispatch, type Command } from "./engine";
import {
  accountHealth,
  accountJourney,
  consumerProfiles,
  journeyCounts,
  onboardingProgress,
  SITE_SOURCE,
} from "./ecosystem";
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

describe("seed do ecossistema", () => {
  const s = createSeed(NOW);
  it("todo negócio ganho da Tipe tem uma conta de restaurante com rastro até a oportunidade", () => {
    const won = s.deals.filter((d) => d.orgId === "org_tipe" && d.status === "ganha");
    expect(won.length).toBeGreaterThan(5);
    for (const d of won) {
      const a = s.accounts.find((x) => x.dealId === d.id);
      expect(a, d.title).toBeDefined();
      expect(a!.orgId).toBe(d.orgId);
      expect(a!.companyId).toBe(d.companyId);
    }
  });
  it("só contas que já passaram da implantação têm contas pagas, e cada visita pertence à conta certa", () => {
    for (const a of s.accounts) {
      const visits = s.visits.filter((v) => v.accountId === a.id);
      if (a.status === "implantacao") expect(visits).toHaveLength(0);
      else expect(visits.length).toBeGreaterThan(0);
    }
    for (const v of s.visits) {
      if (!v.consumerId) continue;
      expect(s.consumers.find((c) => c.id === v.consumerId)?.accountId).toBe(v.accountId);
    }
  });
  it("tem uma conta em risco ou em atenção para a equipe de sucesso agir", () => {
    const labels = s.accounts.map((a) => accountHealth(s, a, NOW).label);
    expect(labels).toContain("Em implantação");
    expect(labels.some((l) => l === "Em risco" || l === "Atenção")).toBe(true);
    expect(labels).toContain("Saudável");
  });
  it("a jornada liga as três camadas na ordem dos fatos", () => {
    const a = s.accounts.find((x) => x.status === "ativa" && x.leadId)!;
    const j = accountJourney(s, a);
    const layers = j.map((x) => x.layer).join("");
    expect(layers.indexOf("A")).toBe(0);
    expect(layers.lastIndexOf("A")).toBeLessThan(layers.indexOf("B"));
    expect(layers).toContain("C");
  });
});

describe("do negócio ganho à primeira conta paga", () => {
  it("ganhar cria a conta, a implantação e as tarefas do responsável de sucesso", () => {
    let s = login(createSeed(NOW), "marina@tipe.demo");
    const deal = s.deals.find(
      (d) =>
        d.orgId === "org_tipe" &&
        d.status === "aberta" &&
        !s.accounts.some((a) => a.companyId === d.companyId),
    )!;
    const won = s.pipelines
      .find((p) => p.id === deal.pipelineId)!
      .stages.find((x) => x.kind === "ganho")!;
    s = ok(s, { type: "moveDeal", id: deal.id, stageId: won.id }).state;
    const a = s.accounts.find((x) => x.dealId === deal.id)!;
    expect(a.status).toBe("implantacao");
    expect(onboardingProgress(a).done).toBe(1);
    expect(["usr_caio", "usr_davi"]).toContain(a.csmId);
    expect(s.tasks.filter((t) => t.accountId === a.id)).toHaveLength(3);

    // Reabrir antes de começar a implantação desfaz a conta.
    const open = s.pipelines.find((p) => p.id === deal.pipelineId)!.stages[3]!;
    s = ok(s, { type: "moveDeal", id: deal.id, stageId: open.id }).state;
    expect(s.accounts.find((x) => x.dealId === deal.id)).toBeUndefined();
    expect(s.tasks.filter((t) => t.accountId === a.id)).toHaveLength(0);
  });

  it("implantação completa + primeira conta paga ativa a conta e alimenta o CRM de clientes", () => {
    let s = login(createSeed(NOW), "caio@tipe.demo");
    const a = s.accounts.find(
      (x) => x.status === "implantacao" && x.onboarding.filter((o) => o.doneAt).length === 1,
    )!;
    // Sem mesas e recebimentos não há conta paga.
    fail(s, { type: "simulateVisit", accountId: a.id });
    // Recebimentos exigem a conta de recebimento aprovada.
    expect(
      fail(s, { type: "completeOnboardingStep", accountId: a.id, key: "pagamentos" }).error,
    ).toMatch(/aprovada/);
    s = ok(s, {
      type: "setAccountIntegration",
      accountId: a.id,
      pagarme: "aprovada",
      pdv: "conectada",
    }).state;
    for (const key of ["cadastro", "cardapio", "mesas_qr", "pagamentos", "equipe"] as const)
      s = ok(s, { type: "completeOnboardingStep", accountId: a.id, key }).state;
    // A primeira conta paga só é marcada pelo fato, não à mão.
    fail(s, { type: "completeOnboardingStep", accountId: a.id, key: "primeira_conta" });
    s = ok(s, { type: "simulateVisit", accountId: a.id }).state;
    let acc = s.accounts.find((x) => x.id === a.id)!;
    expect(acc.status).toBe("implantacao"); // falta o treinamento
    s = ok(s, { type: "completeOnboardingStep", accountId: a.id, key: "treinamento" }).state;
    acc = s.accounts.find((x) => x.id === a.id)!;
    expect(acc.status).toBe("ativa");
    expect(acc.activatedAt).toBeDefined();
    for (let i = 0; i < 12; i++) s = ok(s, { type: "simulateVisit", accountId: a.id }).state;
    expect(s.visits.filter((v) => v.accountId === a.id)).toHaveLength(13);
    const counts = journeyCounts(s, "org_tipe", NOW);
    expect(counts.active).toBeGreaterThan(0);
  });

  it("módulos respeitam o plano e sempre deixam uma forma de pagar a conta", () => {
    let s = login(createSeed(NOW), "caio@tipe.demo");
    const a = s.accounts.find((x) => x.plan === "essencial")!;
    expect(
      fail(s, { type: "setAccountModule", accountId: a.id, module: "kds", enabled: true }).error,
    ).toMatch(/Premium/);
    for (const m of ["pix", "apple_pay", "google_pay"] as const)
      s = ok(s, { type: "setAccountModule", accountId: a.id, module: m, enabled: false }).state;
    fail(s, {
      type: "setAccountModule",
      accountId: a.id,
      module: "pagar_no_estabelecimento",
      enabled: false,
    });
    expect(
      fail(s, { type: "changeAccountPlan", accountId: a.id, plan: "essencial", tables: 30 }).error,
    ).toMatch(/10 mesas/);
  });
});

describe("clientes do restaurante", () => {
  it("campanha só alcança quem deu consentimento, e vendedor não cria campanha", () => {
    let s = login(createSeed(NOW), "marina@tipe.demo");
    const a = s.accounts.find((x) => x.status === "ativa")!;
    const profiles = consumerProfiles(s, "org_tipe", NOW, a.id);
    const optIn = profiles.filter((p) => p.consumer.marketingOptIn).length;
    expect(optIn).toBeLessThan(profiles.length);
    const r = ok(s, {
      type: "createCampaign",
      accountId: a.id,
      name: "Teste",
      segment: "todos",
      message: "Mensagem de teste para os clientes",
    });
    expect(r.state.campaigns[0]!.audience).toBe(optIn);
    s = login(r.state, "thiago@tipe.demo");
    fail(s, {
      type: "createCampaign",
      accountId: a.id,
      name: "Outra",
      segment: "todos",
      message: "Mensagem de teste para todos",
    });
  });
  it("outra organização não enxerga nem mexe nas contas da Tipe", () => {
    const s = login(createSeed(NOW), "otavio@parceiro.demo");
    const a = s.accounts.find((x) => x.orgId === "org_tipe")!;
    fail(s, { type: "simulateVisit", accountId: a.id });
  });
});

describe("entrada pelo site e adaptadores do Supabase", () => {
  it("cadastro no site vira lead novo distribuído para quem vende", () => {
    const s = login(createSeed(NOW), "helena@tipe.demo");
    const r = ok(s, { type: "simulateSiteLead" });
    const lead = r.state.leads.find((l) => l.id === r.id)!;
    expect(lead.source).toBe(SITE_SOURCE);
    expect(lead.status).toBe("novo");
    const role = r.state.memberships.find(
      (m) => m.orgId === "org_tipe" && m.userId === lead.ownerId,
    )?.role;
    expect(["seller", "manager"]).toContain(role);
  });
  it("lista de espera e pagamentos reais viram registros do CRM", () => {
    const lead = leadFromWaitlist({
      id: "l1",
      contact_name: "Ana",
      restaurant_name: "Casa Ana",
      email: "ANA@EXEMPLO.DEMO",
      phone: null,
      status: "demo_feita",
      tables_range: "11_20",
      utm_source: "instagram",
      marketing_opt_in: true,
      created_at: NOW,
    } as Parameters<typeof leadFromWaitlist>[0]);
    expect(lead.status).toBe("qualificado");
    expect(lead.email).toBe("ana@exemplo.demo");
    expect(lead.source).toContain("instagram");
    const base = {
      id: "p1",
      amount: 120,
      created_at: NOW,
      payment_method: "apple_pay",
      payment_target: "restaurant",
      service_fee_amount: 12,
      status: "approved",
      table_number: "7",
    } as Parameters<typeof visitFromPayment>[0];
    const ctx = { orgId: "org_tipe", accountId: "acc_1", tip: 6, rating: { stars: 5 } };
    expect(visitFromPayment(base, ctx)).toMatchObject({
      method: "apple_pay",
      tip: 6,
      rating: 5,
      table: "7",
    });
    expect(visitFromPayment({ ...base, status: "pending" }, ctx)).toBeNull();
    expect(visitFromPayment({ ...base, payment_target: "tipe" }, ctx)).toBeNull();
  });
});
