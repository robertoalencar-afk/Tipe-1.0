import {
  campaignAudience,
  consumerProfiles,
  DEFAULT_MODULES,
  DEMO_WAITERS,
  menuFor,
  ONBOARDING,
  planForTables,
} from "./ecosystem";
import {
  defaultFoundingPartnerRules,
  FOUNDING_PARTNER_APPROVED_RULES,
  FP_STATUS,
} from "./founding-partner";
import type {
  BillMethod,
  FoundingPartnerEnrollment,
  FoundingPartnerStatus,
  Consumer,
  CrmState,
  ID,
  ModuleKey,
  OnboardingKey,
  RestaurantAccount,
  Task,
  Visit,
} from "./types";

// Camadas B e C da demonstração, montadas a partir dos negócios ganhos da camada A:
// cada negócio ganho vira uma conta de restaurante, e cada conta ativa recebe um histórico
// de contas pagas pela Tipe, com clientes identificados, gorjetas e avaliações.

const DAY = 864e5;

type Ctx = {
  s: CrmState;
  now: number;
  nowIso: string;
  rand: () => number;
  id: (prefix: string) => string;
  personName: () => string;
  csm: ID[];
};

/** Quantos dias de histórico de contas pagas a demonstração guarda por conta. */
const HISTORY_DAYS = 75;

type Plan = {
  status: RestaurantAccount["status"];
  /** Etapas concluídas, quando ainda em implantação. */
  steps?: OnboardingKey[] | undefined;
  trend?: "queda" | undefined;
  canceledDaysAgo?: number | undefined;
};

export function seedEcosystem(ctx: Ctx, orgId: ID) {
  const { s, rand, id } = ctx;
  const pick = <T>(list: readonly T[]) => list[Math.floor(rand() * list.length)]!;
  const iso = (t: number) => new Date(Math.min(t, ctx.now - 60000)).toISOString();

  const won = s.deals
    .filter((d) => d.orgId === orgId && d.status === "ganha" && d.closedAt)
    .sort((a, b) => a.closedAt!.localeCompare(b.closedAt!));
  const daysAgo = (at: string) => Math.round((ctx.now - new Date(at).getTime()) / DAY);

  const accounts: RestaurantAccount[] = [];
  won.forEach((d, i) => {
    const company = s.companies.find((c) => c.id === d.companyId);
    const contact = s.contacts.find((c) => c.id === d.contactId);
    const lead = s.leads.find((l) => l.dealId === d.id);
    const closed = new Date(d.closedAt!).getTime();
    const age = daysAgo(d.closedAt!);
    const p: Plan =
      age <= 3
        ? { status: "implantacao", steps: ["contrato"] }
        : age <= 6
          ? { status: "implantacao", steps: ["contrato", "cadastro", "cardapio"] }
          : age <= 12
            ? {
                status: "implantacao",
                steps: ["contrato", "cadastro", "cardapio", "mesas_qr", "equipe"],
              }
            : age >= 90 && age <= 100
              ? { status: "cancelada", canceledDaysAgo: 25 }
              : age >= 40 && age <= 50
                ? { status: "ativa", trend: "queda" }
                : { status: "ativa" };
    const { plan, tables } = planForTables(company?.size);
    const name = company?.name ?? contact?.name ?? d.title;
    const activated = Math.min(closed + (9 + (i % 5)) * DAY, ctx.now - 2 * DAY);
    const done = (k: OnboardingKey) =>
      p.status === "implantacao" ? (p.steps ?? []).includes(k) : true;
    const stepAt = (idx: number) =>
      p.status === "implantacao"
        ? iso(closed + (idx * (ctx.now - closed)) / 7)
        : iso(closed + (idx * (activated - closed)) / 7);
    const modules: ModuleKey[] = [...DEFAULT_MODULES];
    if (plan === "premium") modules.push("kds", "totem");
    if (plan === "profissional" && i % 2) modules.push("totem");
    if (i % 3 === 0) modules.push("pedido_na_mesa");
    if (i % 4 === 1) modules.push("lebre");
    const manualPdv = !company?.pdv || /planilha|próprio/i.test(company.pdv);
    const csmId = ctx.csm[i % ctx.csm.length]!;
    const a: RestaurantAccount = {
      id: id("acc"),
      orgId,
      name,
      slug: name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
      segment: company?.segment ?? "Restaurante",
      city: company?.city ?? "Fortaleza",
      neighborhood: company?.neighborhood ?? "",
      companyId: company?.id,
      contactId: contact?.id,
      dealId: d.id,
      leadId: lead?.id,
      csmId,
      plan,
      tables,
      status: p.status,
      onboarding: ONBOARDING.map((o, idx) =>
        done(o.key)
          ? {
              key: o.key,
              doneAt: o.key === "contrato" ? d.closedAt : stepAt(idx),
              doneBy: o.key === "contrato" ? d.ownerId : csmId,
            }
          : { key: o.key },
      ),
      modules,
      pdv: {
        provider: company?.pdv || "A definir",
        status: manualPdv
          ? "lancamento_tipe"
          : p.status === "implantacao"
            ? done("mesas_qr")
              ? "em_homologacao"
              : "nao_iniciada"
            : "conectada",
      },
      pagarme:
        p.status !== "implantacao" ? "aprovada" : done("mesas_qr") ? "em_analise" : "pendente",
      createdAt: d.closedAt!,
      activatedAt: p.status === "implantacao" ? undefined : iso(activated),
      statusChangedAt:
        p.status === "cancelada"
          ? iso(ctx.now - (p.canceledDaysAgo ?? 20) * DAY)
          : p.status === "implantacao"
            ? d.closedAt
            : iso(activated),
      statusReason: p.status === "cancelada" ? "Restaurante fechou para reforma" : undefined,
    };
    if (p.status !== "implantacao") {
      // A primeira conta paga acontece no dia da ativação.
      const first = a.onboarding.find((x) => x.key === "primeira_conta");
      if (first) first.doneAt = iso(activated - 3 * 36e5);
    }
    accounts.push(a);
    s.accounts.push(a);
    s.activities.push({
      id: id("act"),
      orgId,
      at: a.createdAt,
      actorId: d.ownerId,
      kind: "account.created",
      summary: `Conta ${name} criada: implantação iniciada`,
      entity: { type: "account", id: a.id },
      contactId: contact?.id,
      dealId: d.id,
    });
    if (a.activatedAt)
      s.activities.push({
        id: id("act"),
        orgId,
        at: a.activatedAt,
        actorId: csmId,
        kind: "account.activated",
        summary: `${name} está ativa na Tipe`,
        entity: { type: "account", id: a.id },
      });
    if (a.status === "cancelada")
      s.activities.push({
        id: id("act"),
        orgId,
        at: a.statusChangedAt!,
        actorId: csmId,
        kind: "account.cancelada",
        summary: `${name} cancelada: ${a.statusReason}`,
        entity: { type: "account", id: a.id },
      });

    // Tarefas de implantação (as automáticas do motor), concluídas conforme o avanço.
    const tasks: [string, Task["type"], number, OnboardingKey][] = [
      ["Kickoff de implantação", "reuniao", 1, "cadastro"],
      ["Cadastrar cardápio, mesas e QR Codes", "tarefa", 3, "mesas_qr"],
      ["Treinar a equipe no salão", "reuniao", 7, "treinamento"],
    ];
    for (const [title, type, days, step] of tasks) {
      const dueAt = new Date(closed + days * DAY).toISOString();
      const isDone = done(step);
      if (p.status !== "implantacao" && daysAgo(dueAt) > 60) continue;
      s.tasks.push({
        id: id("tsk"),
        orgId,
        title: `${title}: ${name}`,
        description: "Criada automaticamente quando o negócio foi ganho.",
        type,
        assigneeId: csmId,
        createdBy: d.ownerId,
        priority: days === 1 ? "alta" : "media",
        status: isDone ? "concluida" : "pendente",
        dueAt,
        contactId: contact?.id,
        dealId: d.id,
        accountId: a.id,
        comments: [],
        createdAt: d.closedAt!,
        completedAt: isDone ? iso(Math.min(new Date(dueAt).getTime(), ctx.now - DAY)) : undefined,
      });
    }

    if (p.status === "implantacao") return;
    seedVisits(ctx, a, activated, p, pick);
  });
  return accounts;
}

function seedVisits(
  ctx: Ctx,
  a: RestaurantAccount,
  activated: number,
  p: Plan,
  pick: <T>(list: readonly T[]) => T,
) {
  const { s, rand, id } = ctx;
  const menu = menuFor(a.segment);
  const waiters = DEMO_WAITERS.slice((a.name.length % 4) * 2, (a.name.length % 4) * 2 + 4);
  const pool: Consumer[] = [];
  const methods: [BillMethod, number][] = [
    ["pix", 0.46],
    ["apple_pay", 0.16],
    ["google_pay", 0.13],
    ["estabelecimento", 0.25],
  ];
  const method = (): BillMethod => {
    let x = rand();
    for (const [m, w] of methods) {
      if ((x -= w) <= 0) return m;
    }
    return "pix";
  };
  const end =
    p.status === "cancelada" ? ctx.now - (p.canceledDaysAgo ?? 20) * DAY : ctx.now - 30 * 60000;
  const start = Math.max(activated, ctx.now - HISTORY_DAYS * DAY);
  const base = Math.max(2, Math.round(a.tables * 0.25));

  const addVisit = (at: number) => {
    let consumer: Consumer | undefined;
    if (rand() < 0.55) {
      const reuse = pool.length > 0 && rand() < Math.min(0.72, pool.length / 30);
      if (reuse) consumer = pool[Math.floor(pool.length * rand() * rand())];
      else {
        const optIn = rand() < 0.62;
        consumer = {
          id: id("cli"),
          orgId: a.orgId,
          accountId: a.id,
          name: ctx.personName(),
          phoneLast4: String(1000 + Math.floor(rand() * 9000)),
          marketingOptIn: optIn,
          optInAt: optIn ? new Date(at).toISOString() : undefined,
          createdAt: new Date(at).toISOString(),
        };
        pool.push(consumer);
        s.consumers.push(consumer);
      }
    }
    const amount = Math.round((48 + rand() * 210 + (a.plan === "premium" ? 40 : 0)) * 100) / 100;
    const risky = p.trend === "queda" && at > ctx.now - 21 * DAY;
    const stars = risky ? pick([5, 4, 4, 3, 3, 2]) : pick([5, 5, 5, 5, 4, 4, 4, 3]);
    const v: Visit = {
      id: id("vis"),
      orgId: a.orgId,
      accountId: a.id,
      consumerId: consumer?.id,
      at: new Date(at).toISOString(),
      table: String(1 + Math.floor(rand() * a.tables)),
      waiter: pick(waiters),
      amount,
      serviceFee: Math.round(amount * 0.1 * 100) / 100,
      tip: rand() < 0.42 ? Math.round(amount * pick([0.03, 0.05, 0.05, 0.08]) * 100) / 100 : 0,
      method: method(),
      rating: rand() < 0.68 ? stars : undefined,
      items: Array.from({ length: 1 + Math.floor(rand() * 3) }, () => pick(menu)),
      source: "demo",
    };
    s.visits.push(v);
  };

  // Primeira conta paga no dia da ativação (rastro da implantação), mesmo fora da janela.
  addVisit(activated - 3 * 36e5);
  for (let t = start; t < end; t += DAY) {
    const day = new Date(t);
    const dow = (day.getUTCDay() + 7) % 7;
    const factor = [1.25, 0.55, 0.75, 0.85, 1, 1.55, 1.7][dow]!;
    let trend = 1;
    if (p.trend === "queda") {
      const left = (ctx.now - t) / DAY;
      if (left < 21) trend = Math.max(0.2, left / 24);
      if (left < 10 && Math.floor(left) % 2 === 1) trend = 0;
    }
    const n = Math.round(base * factor * trend * (0.75 + rand() * 0.5));
    for (let k = 0; k < n; k++) {
      // 40% no almoço (11h–14h), 60% no jantar (18h–23h), horário de Fortaleza.
      const lunch = rand() < 0.4;
      const hour = lunch ? 11 + rand() * 3 : 18 + rand() * 5;
      const at =
        Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 3) + hour * 36e5;
      if (at < end) addVisit(at);
    }
  }
}

/** Liga chamados e cria campanhas de exemplo depois que as contas existem. */
export function seedAccountLinks(ctx: Ctx, accounts: RestaurantAccount[]) {
  const { s, id } = ctx;
  const active = accounts.filter((a) => a.status === "ativa");
  const risky = active.find((a) => {
    const d = s.deals.find((x) => x.id === a.dealId);
    const age = d?.closedAt ? (ctx.now - new Date(d.closedAt).getTime()) / DAY : 0;
    return age >= 40 && age <= 50;
  });
  const onboarding = accounts.filter((a) => a.status === "implantacao");
  const qr = s.tickets.find((t) => t.title.startsWith("QR da mesa 7"));
  const qrAccount = active.find((a) => a !== risky);
  if (qr && qrAccount) {
    qr.accountId = qrAccount.id;
    qr.category = "Restaurante";
  }
  const saipos = s.tickets.find((t) => t.title.startsWith("Integração com Saipos"));
  const homolog = onboarding.find((a) => a.pdv.status === "em_homologacao") ?? onboarding[0];
  if (saipos && homolog) {
    saipos.accountId = homolog.id;
    saipos.category = "Integração";
    homolog.pdv = { provider: "Saipos", status: "em_homologacao" };
  }
  if (risky)
    s.tickets.push({
      id: id("tkt"),
      orgId: risky.orgId,
      title: "Garçons sem acesso depois da troca de turno",
      description:
        "Gerente relatou que parte da equipe perde o acesso ao app ao trocar de turno e volta a fechar conta na maquininha.",
      category: "Restaurante",
      requesterId: risky.csmId,
      assigneeId: risky.csmId,
      accountId: risky.id,
      priority: "alta",
      status: "aberto",
      comments: [],
      createdAt: new Date(ctx.now - 4 * DAY).toISOString(),
    });
  const withOptIn = active.slice(-4, -1);
  const msgs = [
    [
      "Volta do fim de semana",
      "fieis",
      "Sábado tem música ao vivo e a sobremesa é por nossa conta. Te esperamos!",
    ],
    [
      "Saudade de você",
      "em_risco",
      "Faz tempo que você não aparece. Que tal um almoço esta semana?",
    ],
    [
      "Novo cardápio",
      "todos",
      "Chegaram pratos novos no cardápio. Vem provar e conta pra gente o que achou.",
    ],
  ] as const;
  withOptIn.forEach((a, i) => {
    const [name, segment, message] = msgs[i % msgs.length]!;
    s.campaigns.push({
      id: id("cpg"),
      orgId: a.orgId,
      accountId: a.id,
      name,
      segment,
      message,
      channel: "whatsapp",
      status: "simulada",
      audience: campaignAudience(consumerProfiles(s, a.orgId, ctx.nowIso, a.id), segment).length,
      createdBy: a.csmId,
      createdAt: new Date(ctx.now - (6 + i * 5) * DAY).toISOString(),
    });
  });
}

/** Versão fictícia dos termos, só para a demonstração (texto ainda sem revisão jurídica). */
export const DEMO_TERMS_VERSION = "demo-0.1";

/**
 * Programa Restaurante Fundador na demonstração: poucas adesões, uma em cada estado
 * principal, sempre com a trilha de auditoria coerente. Nenhum benefício concedido e
 * regras comerciais vazias (vagas, período e vantagens pendentes de aprovação).
 */
export function seedFoundingPartners(ctx: Ctx, accounts: RestaurantAccount[]) {
  const { s, id } = ctx;
  const orgId = accounts[0]?.orgId;
  if (!orgId) return;
  s.foundingPartnerRules.push({
    ...defaultFoundingPartnerRules(orgId),
    slots: FOUNDING_PARTNER_APPROVED_RULES.slots,
    enrollmentOpensAt: FOUNDING_PARTNER_APPROVED_RULES.enrollmentOpensAt,
    enrollmentClosesAt: FOUNDING_PARTNER_APPROVED_RULES.enrollmentClosesAt,
    advantages: [...FOUNDING_PARTNER_APPROVED_RULES.advantages],
    approvedAt: FOUNDING_PARTNER_APPROVED_RULES.approvedAt,
    approvalRef: FOUNDING_PARTNER_APPROVED_RULES.approvalRef,
    updatedAt: FOUNDING_PARTNER_APPROVED_RULES.approvedAt,
    // A demonstração continua no texto fictício até a revisão jurídica de fundador-v1.
    termsVersion: DEMO_TERMS_VERSION,
  });
  const active = accounts.filter((a) => a.status === "ativa");
  const onboarding = accounts.filter((a) => a.status === "implantacao");
  const plan: [RestaurantAccount | undefined, FoundingPartnerStatus[], boolean][] = [
    [
      active[0],
      ["convidado", "interessado", "elegivel", "participante", "selecionado_piloto"],
      true,
    ],
    [active[1], ["convidado", "interessado", "elegivel", "participante"], true],
    [active[2], ["convidado", "interessado", "elegivel", "participante"], false],
    [active[3], ["convidado", "interessado", "elegivel"], false],
    [onboarding[0], ["convidado", "interessado"], false],
    [active[4], ["convidado"], false],
  ];
  const names = ["Ana Ribeiro", "Paulo Feitosa", "Joana Sales", "Marcos Leite"];
  plan.forEach(([a, path, pilot], i) => {
    if (!a) return;
    const start = ctx.now - (40 - i * 5) * DAY;
    const step = (k: number) => new Date(start + k * 3 * DAY + i * 36e5).toISOString();
    const actor = a.csmId;
    const e: FoundingPartnerEnrollment = {
      id: id("fp"),
      orgId,
      accountId: a.id,
      status: path[path.length - 1]!,
      createdAt: step(0),
      statusChangedAt: step(path.length - 1),
      pilotEligible: pilot,
      pilotNote: pilot ? "Conta ativa, equipe treinada e uso estável." : undefined,
      invites: [
        {
          id: id("fpi"),
          at: step(0),
          channel: i % 2 ? "whatsapp" : "email",
          sentBy: actor,
          note: "Convite feito na visita de acompanhamento.",
          simulated: true,
        },
      ],
      benefits: [],
      communications: [],
      feedback: [],
      history: [],
    };
    path.forEach((to, k) => {
      if (k === 0) {
        e.history.unshift({
          id: id("fpe"),
          at: step(0),
          actorId: actor,
          kind: "convite",
          to,
          detail: `convite por ${i % 2 ? "WhatsApp" : "E-mail"}`,
        });
        return;
      }
      const from = path[k - 1]!;
      if (to === "participante") {
        const by = names[i % names.length]!;
        e.terms = {
          version: DEMO_TERMS_VERSION,
          acceptedAt: step(k),
          acceptedByName: by,
          recordedBy: actor,
        };
        e.history.unshift({
          id: id("fpe"),
          at: step(k),
          actorId: actor,
          kind: "termos",
          detail: `termos versão ${DEMO_TERMS_VERSION} aceitos por ${by}`,
        });
        e.joinedAt = step(k);
      }
      if (to === "selecionado_piloto")
        e.history.unshift({
          id: id("fpe"),
          at: step(k),
          actorId: actor,
          kind: "piloto",
          detail: `elegível para o piloto: ${e.pilotNote}`,
        });
      e.history.unshift({
        id: id("fpe"),
        at: step(k),
        actorId: actor,
        kind: "estado",
        from,
        to,
        detail: `${FP_STATUS[from].label} → ${FP_STATUS[to].label}`,
      });
    });
    if (path.length >= 2)
      e.communications.push({
        id: id("fpc"),
        at: step(1),
        channel: "whatsapp",
        direction: "recebida",
        summary:
          "Sócio respondeu que quer entender como o programa funciona e o que muda na operação.",
        by: actor,
      });
    if (path.includes("participante"))
      e.feedback.push({
        id: id("fpf"),
        at: step(path.length),
        topic: "produto",
        text: "Gostaria de ver no painel quais garçons recebem mais gorjeta por turno.",
        by: actor,
      });
    s.foundingPartners.push(e);
  });
}
