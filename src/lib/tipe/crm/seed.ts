import { award, defaultSettings, settleGoals } from "./engine";
import { SITE_SOURCE } from "./ecosystem";
import { goalProgress } from "./metrics";
import { seedAccountLinks, seedEcosystem, seedFoundingPartners } from "./seed-ecosystem";
import type {
  Company,
  Contact,
  CrmState,
  Deal,
  Goal,
  ID,
  Lead,
  Pipeline,
  Task,
  TaskType,
  Priority,
  XpKind,
} from "./types";

// Dados fictícios de demonstração. Nenhuma pessoa, telefone ou e-mail real:
// telefones usam o prefixo 90000, e-mails o domínio reservado .demo.

export const SEED_VERSION = 3;
export const DEMO_PASSWORD = "demo1234";

export const DEMO_ACCOUNTS = [
  { email: "helena@tipe.demo", name: "Helena Prado", role: "Proprietária e equipe da plataforma" },
  { email: "marina@tipe.demo", name: "Marina Lopes", role: "Gestora de vendas" },
  { email: "caio@tipe.demo", name: "Caio Menezes", role: "Sucesso do cliente e implantação" },
  { email: "thiago@tipe.demo", name: "Thiago Ribeiro", role: "Vendedor" },
  { email: "davi@tipe.demo", name: "Davi Nogueira", role: "Atendente" },
  { email: "lia@tipe.demo", name: "Lia Santos", role: "Somente leitura" },
  {
    email: "otavio@parceiro.demo",
    name: "Otávio Brandão",
    role: "Proprietário de outra organização",
  },
];

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Índice garantido: os dados de demonstração são fixos, então um índice fora da lista é erro de programação. */
function nth<T>(list: readonly T[], i: number): T {
  const v = list[i];
  if (v === undefined) throw new Error(`Seed: índice ${i} fora da lista`);
  return v;
}

export function createSeed(nowIso = new Date().toISOString()): CrmState {
  const rand = rng(20261022);
  const pick = <T>(a: readonly T[]) => nth(a, Math.floor(rand() * a.length));
  const now = new Date(nowIso).getTime();
  const at = (days: number, hour = 10, min = 0) => {
    const d = new Date(now - days * 864e5);
    d.setUTCHours(hour + 3, min, 0, 0); // horário de Fortaleza (UTC-3)
    return new Date(Math.min(d.getTime(), now - 60000)).toISOString();
  };
  const future = (days: number, hour = 10) => {
    const d = new Date(now + days * 864e5);
    d.setUTCHours(hour + 3, 0, 0, 0);
    return d.toISOString();
  };
  let n = 0;
  const id = (p: string) => `${p}_seed${(++n).toString(36)}`;

  const s: CrmState = {
    version: SEED_VERSION,
    seededAt: nowIso,
    users: [],
    orgs: [],
    memberships: [],
    invites: [],
    teams: [],
    departments: [],
    companies: [],
    contacts: [],
    leads: [],
    pipelines: [],
    deals: [],
    tasks: [],
    notes: [],
    activities: [],
    conversations: [],
    messages: [],
    quickReplies: [],
    tickets: [],
    goals: [],
    xp: [],
    challenges: [],
    subscriptions: [],
    invoices: [],
    waInstances: [],
    waTemplates: [],
    waLogs: [],
    notifications: [],
    audit: [],
    accounts: [],
    consumers: [],
    visits: [],
    campaigns: [],
    foundingPartners: [],
    foundingPartnerRules: [],
    session: null,
  };

  const user = (key: string, name: string, title: string, email: string, platformAdmin = false) => {
    const u = {
      id: `usr_${key}`,
      name,
      email,
      password: DEMO_PASSWORD,
      title,
      platformAdmin,
      createdAt: at(240),
    };
    s.users.push(u);
    return u.id;
  };
  const helena = user("helena", "Helena Prado", "Diretora comercial", "helena@tipe.demo", true);
  const caio = user("caio", "Caio Menezes", "Operações comerciais", "caio@tipe.demo");
  const marina = user("marina", "Marina Lopes", "Gestora de vendas", "marina@tipe.demo");
  const thiago = user("thiago", "Thiago Ribeiro", "Executivo de contas", "thiago@tipe.demo");
  const bruna = user("bruna", "Bruna Castro", "Executiva de contas", "bruna@tipe.demo");
  const davi = user("davi", "Davi Nogueira", "Atendimento comercial", "davi@tipe.demo");
  const lia = user("lia", "Lia Santos", "Financeiro", "lia@tipe.demo");
  const otavio = user("otavio", "Otávio Brandão", "Sócio", "otavio@parceiro.demo");
  const silvia = user("silvia", "Sílvia Moura", "Vendas", "silvia@parceiro.demo");

  const A = "org_tipe";
  const B = "org_recife";
  s.orgs.push(
    {
      id: A,
      name: "Tipe Comercial",
      slug: "tipe-comercial",
      segment: "Venda da Tipe para restaurantes",
      createdAt: at(240),
      status: "ativa",
      settings: defaultSettings(),
      tipePlatform: true,
    },
    {
      id: B,
      name: "Lebre Parceiros Recife",
      slug: "lebre-parceiros-recife",
      segment: "Revenda parceira",
      createdAt: at(8),
      status: "ativa",
      settings: defaultSettings(),
    },
  );
  s.teams.push(
    { id: "tm_fortaleza", orgId: A, name: "Vendas Fortaleza" },
    { id: "tm_atendimento", orgId: A, name: "Atendimento" },
    { id: "tm_recife", orgId: B, name: "Vendas Recife" },
  );
  s.departments.push(
    { id: "dep_comercial", orgId: A, name: "Comercial" },
    { id: "dep_sucesso", orgId: A, name: "Sucesso do cliente" },
    { id: "dep_recife", orgId: B, name: "Comercial" },
  );
  const mem = (
    orgId: ID,
    userId: ID,
    role: CrmState["memberships"][number]["role"],
    teamId?: ID | undefined,
    departmentId?: ID | undefined,
    days = 230,
  ) =>
    s.memberships.push({
      id: `mem_${orgId}_${userId}`,
      orgId,
      userId,
      role,
      teamId,
      departmentId,
      status: "ativo",
      joinedAt: at(days),
    });
  mem(A, helena, "owner", undefined, "dep_comercial");
  mem(A, caio, "admin", undefined, "dep_sucesso");
  mem(A, marina, "manager", "tm_fortaleza", "dep_comercial");
  mem(A, thiago, "seller", "tm_fortaleza", "dep_comercial");
  mem(A, bruna, "seller", "tm_fortaleza", "dep_comercial");
  mem(A, davi, "agent", "tm_atendimento", "dep_sucesso");
  mem(A, lia, "viewer", undefined, "dep_sucesso");
  mem(B, otavio, "owner", "tm_recife", "dep_recife", 8);
  mem(B, silvia, "seller", "tm_recife", "dep_recife", 7);
  mem(B, helena, "admin", undefined, undefined, 7);
  s.invites.push({
    id: "inv_seed1",
    orgId: A,
    email: "renan@tipe.demo",
    name: "Renan Freitas",
    role: "seller",
    teamId: "tm_fortaleza",
    status: "pendente",
    invitedBy: marina,
    createdAt: at(2),
  });

  const stages = (p: string) => [
    { id: `${p}_novo`, name: "Novo lead", probability: 10, kind: "aberta" as const },
    { id: `${p}_contato`, name: "Primeiro contato", probability: 20, kind: "aberta" as const },
    { id: `${p}_qualif`, name: "Qualificação", probability: 35, kind: "aberta" as const },
    { id: `${p}_proposta`, name: "Proposta", probability: 55, kind: "aberta" as const },
    { id: `${p}_negoc`, name: "Negociação", probability: 75, kind: "aberta" as const },
    { id: `${p}_ganho`, name: "Ganho", probability: 100, kind: "ganho" as const },
    { id: `${p}_perdido`, name: "Perdido", probability: 0, kind: "perdido" as const },
  ];
  const pA: Pipeline = {
    id: "pip_tipe",
    orgId: A,
    name: "Assinatura Tipe",
    stages: stages("stA"),
    createdAt: at(240),
  };
  const pB: Pipeline = {
    id: "pip_recife",
    orgId: B,
    name: "Funil Recife",
    stages: stages("stB"),
    createdAt: at(8),
  };
  s.pipelines.push(pA, pB);

  const FIRST = [
    "Ana",
    "Bruno",
    "Carla",
    "Diego",
    "Elisa",
    "Fábio",
    "Gabriela",
    "Heitor",
    "Isabela",
    "João",
    "Karina",
    "Leonardo",
    "Manuela",
    "Nicolas",
    "Olívia",
    "Paulo",
    "Rebeca",
    "Samuel",
    "Tatiana",
    "Vitor",
    "Yasmin",
    "Wesley",
    "Luana",
    "Márcio",
    "Priscila",
    "Rodrigo",
    "Sabrina",
    "Túlio",
    "Vanessa",
    "Alícia",
    "Henrique",
    "Joana",
  ];
  const LAST = [
    "Albuquerque",
    "Barreto",
    "Cavalcante",
    "Diniz",
    "Esteves",
    "Façanha",
    "Girão",
    "Holanda",
    "Jereissati",
    "Leitão",
    "Maia",
    "Nobre",
    "Pinheiro",
    "Queiroz",
    "Rocha",
    "Sampaio",
    "Teixeira",
    "Uchoa",
    "Vasconcelos",
    "Xavier",
  ];
  const BAIRROS = [
    "Meireles",
    "Aldeota",
    "Varjota",
    "Praia de Iracema",
    "Cocó",
    "Benfica",
    "Dionísio Torres",
    "Papicu",
    "Mucuripe",
    "Centro",
    "Fátima",
    "Messejana",
  ];
  const PDVS = [
    "Colibri",
    "Saipos",
    "Consumer",
    "Goomer",
    "Planilha e maquininha",
    "Sistema próprio",
  ];
  const SEG = ["Restaurante", "Bar", "Cafeteria", "Barraca de praia", "Hamburgueria", "Pizzaria"];
  const SIZE = ["Até 10 mesas", "11 a 20 mesas", "21 a 40 mesas", "Mais de 40 mesas"];
  const SOURCES = [
    SITE_SOURCE,
    "Indicação",
    "Instagram",
    "Visita da equipe",
    "Evento",
    "WhatsApp",
    "Google",
  ];
  const NAMES_A = [
    "Bistrô Maré Alta",
    "Cantina do Farol",
    "Varanda Nordestina",
    "Casa Jangada",
    "Sabor de Iracema",
    "Bar do Píer",
    "Café Aurora",
    "Pizzaria Brisa",
    "Barraca Sol Nascente",
    "Empório Cajueiro",
    "Grelha da Aldeota",
    "Peixaria Mucuripe",
    "Burger Lagoa",
    "Recanto do Sertão",
    "Bar Ventania",
    "Tapiocaria Dona Flor",
    "Cozinha do Cocó",
    "Botequim Benfica",
    "Raízes Bistrô",
    "Sushi Beira-Mar",
    "Armazém Varjota",
    "Pastelaria Central",
    "Forno de Barro",
    "Quintal Messejana",
  ];
  const NAMES_B = [
    "Boteco Capibaribe",
    "Cais do Recife Bistrô",
    "Tapioca Boa Viagem",
    "Bar Marco Zero",
    "Cozinha Olinda",
    "Café Madalena",
  ];

  let phoneSeq = 100;
  const phone = () => `(85) 90000-${String(phoneSeq++).padStart(4, "0")}`;
  const slugMail = (name: string) =>
    name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z]+/g, ".")
      .replace(/^\.|\.$/g, "");

  const sellersA = [thiago, bruna, marina];
  const companiesA: Company[] = NAMES_A.map((name, i) => ({
    id: id("cmp"),
    orgId: A,
    name,
    segment:
      name.startsWith("Bar") || name.startsWith("Botequim")
        ? "Bar"
        : name.startsWith("Café")
          ? "Cafeteria"
          : name.startsWith("Barraca")
            ? "Barraca de praia"
            : name.startsWith("Pizzaria")
              ? "Pizzaria"
              : name.startsWith("Burger")
                ? "Hamburgueria"
                : nth(SEG, 0),
    city: "Fortaleza",
    neighborhood: nth(BAIRROS, i % BAIRROS.length),
    size: pick(SIZE),
    pdv: pick(PDVS),
    ownerId: nth(sellersA, i % 3),
    tags: i % 5 === 0 ? ["Grupo com 2 casas"] : [],
    createdAt: at(200 - i * 7),
  }));
  const companiesB: Company[] = NAMES_B.map((name, i) => ({
    id: id("cmp"),
    orgId: B,
    name,
    segment: nth(SEG, i % SEG.length),
    city: "Recife",
    neighborhood: nth(["Boa Viagem", "Recife Antigo", "Casa Forte", "Graças"], i % 4),
    size: pick(SIZE),
    pdv: pick(PDVS),
    ownerId: i % 2 ? silvia : otavio,
    tags: [],
    createdAt: at(7 - i),
  }));
  s.companies.push(...companiesA, ...companiesB);

  const contact = (
    orgId: ID,
    company: Company | undefined,
    ownerId: ID,
    created: number,
    jobTitle: string,
    status: Contact["status"] = "ativo",
  ): Contact => {
    const name = `${pick(FIRST)} ${pick(LAST)}`;
    const ph = orgId === B ? phone().replace("(85)", "(81)") : phone();
    const c: Contact = {
      id: id("ctt"),
      orgId,
      name,
      companyId: company?.id,
      phone: ph,
      whatsapp: ph,
      email: `${slugMail(name)}@exemplo.demo`,
      jobTitle,
      source: pick(SOURCES),
      ownerId,
      status,
      tags: rand() > 0.7 ? ["Decisor"] : [],
      notes: "",
      createdAt: at(created),
      updatedAt: at(Math.max(0, created - 3)),
    };
    s.contacts.push(c);
    return c;
  };
  const contactsA = companiesA.map((co, i) =>
    contact(A, co, co.ownerId, 190 - i * 7, i % 3 === 0 ? "Gerente" : "Proprietário"),
  );
  for (let i = 0; i < 8; i++)
    contactsA.push(
      contact(
        A,
        companiesA[(i * 5) % companiesA.length],
        nth(sellersA, i % 3),
        20 - i * 2,
        i % 2 ? "Sócio" : "Gerente de salão",
      ),
    );
  const contactsB = companiesB.map((co, i) => contact(B, co, co.ownerId, 7 - i, "Proprietário"));

  // Oportunidades: valor anual da assinatura (mesas × meses), sem preço público.
  type DealSpec = {
    c: Contact;
    stage: string;
    value: number;
    owner: ID;
    created: number;
    closed?: number | undefined;
    lost?: string | undefined;
    prio?: Priority | undefined;
  };
  const dealsSpec: DealSpec[] = [];
  const valueFor = (co?: Company) =>
    co?.size === "Mais de 40 mesas"
      ? 18000 + Math.round(rand() * 12) * 1000
      : co?.size === "21 a 40 mesas"
        ? 9600 + Math.round(rand() * 6) * 600
        : co?.size === "11 a 20 mesas"
          ? 5400 + Math.round(rand() * 5) * 600
          : 2400 + Math.round(rand() * 4) * 600;
  const comp = (c: Contact) => s.companies.find((x) => x.id === c.companyId);
  // Ganhas nos últimos 6 meses (algumas neste mês).
  const wonClose = [168, 150, 141, 120, 104, 97, 75, 66, 52, 44, 31, 20, 9, 5, 2];
  const ageDays = (c: Contact) => Math.floor((now - new Date(c.createdAt).getTime()) / 864e5);
  wonClose.forEach((closed, i) =>
    dealsSpec.push({
      c: nth(contactsA, i),
      stage: "ganho",
      value: valueFor(comp(nth(contactsA, i))),
      owner: nth(sellersA, i % 3) === marina && i % 2 ? thiago : nth(sellersA, i % 3),
      created: Math.min(closed + 25, ageDays(nth(contactsA, i)) - 1),
      closed,
    }),
  );
  [
    ["preco", 130],
    ["pdv_nao_integra", 80],
    ["concorrente", 40],
    ["sem_resposta", 15],
    ["preco", 4],
  ].forEach(([reason, days], i) => {
    const c = nth(contactsA, 15 + i);
    const closed = Math.min(Number(days), ageDays(c) - 10);
    dealsSpec.push({
      c,
      stage: "perdido",
      value: valueFor(comp(c)),
      owner: nth(sellersA, i % 2),
      created: Math.min(closed + 20, ageDays(c) - 1),
      closed,
      lost: String(reason),
    });
  });
  const openStages = [
    "novo",
    "contato",
    "contato",
    "qualif",
    "qualif",
    "qualif",
    "proposta",
    "proposta",
    "proposta",
    "negoc",
    "negoc",
    "novo",
  ];
  openStages.forEach((st, i) => {
    const c = nth(contactsA, (20 + i) % contactsA.length);
    dealsSpec.push({
      c,
      stage: st,
      value: valueFor(comp(c)),
      owner: nth([thiago, bruna, thiago, bruna, marina], i % 5),
      created: Math.min(30 - i * 2, ageDays(c) - 1),
      prio: i % 4 === 0 ? "alta" : i % 3 === 0 ? "baixa" : "media",
    });
  });
  const LOST: Record<string, string> = {
    preco: "Preço",
    pdv_nao_integra: "PDV não integra",
    concorrente: "Já usa concorrente",
    sem_resposta: "Sem resposta",
  };
  const dealsA: Deal[] = dealsSpec.map((d, i) => {
    const st = pA.stages.find((x) => x.id === `stA_${d.stage}`)!;
    const co = comp(d.c);
    return {
      id: id("dea"),
      orgId: A,
      pipelineId: pA.id,
      stageId: st.id,
      title: `${co?.name ?? d.c.name}: assinatura Tipe`,
      contactId: d.c.id,
      companyId: co?.id,
      value: d.value,
      ownerId: d.owner,
      probability: st.probability,
      priority: d.prio ?? "media",
      status: st.kind === "ganho" ? "ganha" : st.kind === "perdido" ? "perdida" : "aberta",
      lostReason: d.lost ? LOST[d.lost] : undefined,
      expectedClose: d.closed !== undefined ? at(d.closed) : future(5 + i),
      createdAt: at(d.created),
      updatedAt: at(d.closed ?? Math.max(0, d.created - 5)),
      closedAt: d.closed !== undefined ? at(d.closed, 15) : undefined,
    };
  });
  for (const d of dealsA)
    if (d.status === "ganha") {
      const c = s.contacts.find((x) => x.id === d.contactId)!;
      c.status = "cliente";
    }
  const dealsB: Deal[] = contactsB.map((c, i) => {
    const st = nth(pB.stages, nth([0, 1, 2, 3, 5, 4], i));
    return {
      id: id("dea"),
      orgId: B,
      pipelineId: pB.id,
      stageId: st.id,
      title: `${comp(c)?.name}: assinatura Tipe`,
      contactId: c.id,
      companyId: c.companyId,
      value: valueFor(comp(c)),
      ownerId: c.ownerId,
      probability: st.probability,
      priority: "media",
      status: st.kind === "ganho" ? "ganha" : "aberta",
      expectedClose: future(10 + i),
      createdAt: at(6 - i),
      updatedAt: at(Math.max(0, 5 - i)),
      closedAt: st.kind === "ganho" ? at(1, 16) : undefined,
    };
  });
  s.deals.push(...dealsA, ...dealsB);

  // Leads: os campos são os mesmos da lista de espera da landing.
  const TABLES = ["ate_10", "11_20", "21_40", "40_mais"];
  const leadSpec: { st: Lead["status"]; days: number; owner: ID }[] = [
    ...Array.from({ length: 6 }, (_, i) => ({
      st: "novo" as const,
      days: i,
      owner: nth([thiago, bruna, davi], i % 3),
    })),
    ...Array.from({ length: 5 }, (_, i) => ({
      st: "contatado" as const,
      days: 3 + i * 2,
      owner: nth([thiago, bruna], i % 2),
    })),
    ...Array.from({ length: 5 }, (_, i) => ({
      st: "qualificado" as const,
      days: 6 + i * 4,
      owner: nth([thiago, bruna, marina], i % 3),
    })),
    ...Array.from({ length: 3 }, (_, i) => ({
      st: "desqualificado" as const,
      days: 25 + i * 9,
      owner: nth([bruna, thiago], i % 2),
    })),
  ];
  leadSpec.forEach((l, i) => {
    const name = `${pick(FIRST)} ${pick(LAST)}`;
    const prof = {
      tables_range: l.st === "novo" && i % 2 ? undefined : pick(TABLES),
      peak_queue: l.st === "novo" ? undefined : pick(["sempre", "as_vezes", "raramente"]),
      close_time: l.st === "novo" ? undefined : pick(["5_10", "10_20", "20_mais"]),
      contact_role: pick(["dono", "gerente"]),
      city: "Fortaleza",
      pdv_system: l.st === "novo" ? undefined : pick(PDVS),
      has_pagarme: l.st === "qualificado" ? pick(["sim", "nao"]) : undefined,
      discovery_source: pick(["instagram", "indicacao", "google"]),
    };
    s.leads.push({
      id: id("lea"),
      orgId: A,
      name,
      companyName: `${pick(["Restaurante", "Bar", "Cantina", "Café", "Boteco"])} ${pick(["Cajá", "Mandacaru", "Beira-Rio", "Dunas", "Carnaúba", "Litoral", "Caatinga", "Seriguela"])}`,
      email: `${slugMail(name)}@exemplo.demo`,
      phone: phone(),
      source: pick(SOURCES),
      status: l.st,
      ownerId: l.owner,
      profile: prof,
      createdAt: at(l.days + 1),
      qualifiedAt: l.st === "qualificado" ? at(l.days, 14) : undefined,
      disqualifyReason:
        l.st === "desqualificado"
          ? pick(["Fora da região atendida", "Sem interesse no momento", "Ainda sem CNPJ"])
          : undefined,
    });
  });
  // Leads que viraram as oportunidades abertas e ganhas recentes: histórico consistente.
  dealsA
    .filter((d) => d.createdAt > at(70))
    .forEach((d) => {
      const c = s.contacts.find((x) => x.id === d.contactId)!;
      const lead: Lead = {
        id: id("lea"),
        orgId: A,
        name: c.name,
        companyName: comp(c)?.name ?? "",
        email: c.email,
        phone: c.phone,
        source: c.source,
        status: "convertido",
        ownerId: d.ownerId,
        profile: {
          tables_range: pick(TABLES),
          peak_queue: "sempre",
          close_time: "10_20",
          contact_role: "dono",
          city: "Fortaleza",
          pdv_system: comp(c)?.pdv,
        },
        contactId: c.id,
        dealId: d.id,
        createdAt: new Date(new Date(d.createdAt).getTime() - 3 * 864e5).toISOString(),
        qualifiedAt: new Date(new Date(d.createdAt).getTime() - 864e5).toISOString(),
        convertedAt: d.createdAt,
      };
      d.leadId = lead.id;
      s.leads.push(lead);
    });
  contactsB.slice(0, 3).forEach((c, i) =>
    s.leads.push({
      id: id("lea"),
      orgId: B,
      name: `${pick(FIRST)} ${pick(LAST)}`,
      companyName: `Bar ${["Frevo", "Maracatu", "Manguebeat"][i]}`,
      email: `contato${i}@exemplo.demo`,
      phone: `(81) 90000-${String(900 + i)}`,
      source: "Instagram",
      status: i === 0 ? "qualificado" : "novo",
      ownerId: i % 2 ? silvia : otavio,
      profile: {
        city: "Recife",
        tables_range: "11_20",
        peak_queue: "as_vezes",
        pdv_system: "Saipos",
      },
      createdAt: at(5 - i),
      qualifiedAt: i === 0 ? at(3) : undefined,
    }),
  );

  // Tarefas: concluídas (histórico), abertas, atrasadas e de hoje.
  const TASKS: [string, TaskType][] = [
    ["Ligar para apresentar a Tipe", "ligacao"],
    ["Demonstração no salão", "reuniao"],
    ["Enviar proposta", "email"],
    ["Confirmar PDV e número de mesas", "tarefa"],
    ["Reunião de negociação", "reuniao"],
    ["Treinar equipe de garçons", "reuniao"],
    ["Cobrar retorno da proposta", "ligacao"],
    ["Visitar no horário de pico", "reuniao"],
  ];
  const allTaskPeople = [thiago, bruna, marina, davi];
  const mkTask = (
    orgId: ID,
    i: number,
    assigneeId: ID,
    due: string,
    done: boolean,
    deal?: Deal | undefined,
    createdBy = marina,
  ): Task => {
    const [title, type] = nth(TASKS, i % TASKS.length);
    const c = deal ? s.contacts.find((x) => x.id === deal.contactId) : undefined;
    const created = new Date(new Date(due).getTime() - (3 + (i % 5)) * 864e5).toISOString();
    return {
      id: id("tsk"),
      orgId,
      title: c ? `${title}: ${comp(c)?.name ?? c.name}` : title,
      description: "",
      type,
      assigneeId,
      createdBy: orgId === A ? createdBy : otavio,
      priority: i % 4 === 0 ? "alta" : i % 3 === 0 ? "baixa" : "media",
      status: done ? "concluida" : i % 6 === 0 ? "em_andamento" : "pendente",
      dueAt: due,
      contactId: c?.id,
      dealId: deal?.id,
      comments: [],
      createdAt: created < due ? created : due,
      completedAt: done ? due : undefined,
    };
  };
  const won = dealsA.filter((d) => d.status === "ganha");
  won.forEach((d, i) => {
    const close = new Date(d.closedAt!).getTime();
    s.tasks.push(mkTask(A, 1, d.ownerId, new Date(close - 12 * 864e5).toISOString(), true, d));
    s.tasks.push(
      mkTask(A, 2 + (i % 2) * 2, d.ownerId, new Date(close - 5 * 864e5).toISOString(), true, d),
    );
  });
  for (let i = 0; i < 22; i++) {
    const day = 40 - i * 2;
    s.tasks.push(
      mkTask(
        A,
        i,
        nth(allTaskPeople, i % 4),
        at(day, 9 + (i % 8)),
        true,
        undefined,
        nth(allTaskPeople, (i + 1) % 4),
      ),
    );
  }
  const openA = dealsA.filter((d) => d.status === "aberta");
  openA.forEach((d, i) => {
    const offset = nth([-3, -1, 0, 0, 1, 2, 3, 5, 7, -2, 0, 4], i % 12);
    s.tasks.push(
      mkTask(
        A,
        i + 3,
        d.ownerId,
        offset < 0 ? at(-offset, 11) : future(offset, 9 + (i % 7)),
        false,
        d,
      ),
    );
  });
  s.tasks.push(mkTask(A, 6, davi, future(0, 16), false), mkTask(A, 3, davi, at(1, 15), false));
  dealsB.forEach((d, i) =>
    s.tasks.push(mkTask(B, i, d.ownerId, i < 2 ? future(i, 10) : at(i, 10), i >= 2, d)),
  );
  nth(s.tasks, s.tasks.length - 30).comments.push({
    id: id("cmt"),
    userId: marina,
    text: "Levar o totem de demonstração na visita.",
    at: at(3),
  });

  // Anotações e atividades históricas para a timeline.
  for (const d of [...won.slice(-6), ...openA.slice(0, 6)]) {
    s.notes.push({
      id: id("not"),
      orgId: A,
      contactId: d.contactId,
      dealId: d.id,
      userId: d.ownerId,
      text: pick([
        "Dono quer reduzir a fila do caixa no almoço.",
        "Usa maquininha própria; perguntou sobre Pix e carteiras digitais.",
        "Pediu para testar 30 dias antes de decidir.",
        "Gerente gostou da divisão de conta por item.",
      ]),
      at: d.updatedAt,
    });
  }
  for (const d of s.deals) {
    const c = s.contacts.find((x) => x.id === d.contactId)!;
    s.activities.push({
      id: id("act"),
      orgId: d.orgId,
      at: d.createdAt,
      actorId: d.ownerId,
      kind: "deal.created",
      summary: `Oportunidade ${d.title} criada`,
      entity: { type: "deal", id: d.id },
      contactId: c.id,
      dealId: d.id,
    });
    if (d.closedAt)
      s.activities.push({
        id: id("act"),
        orgId: d.orgId,
        at: d.closedAt,
        actorId: d.ownerId,
        kind: d.status === "ganha" ? "deal.won" : "deal.lost",
        summary: `${d.title}: ${d.status === "ganha" ? "Negociação → Ganho" : `Perdido (${d.lostReason})`}`,
        entity: { type: "deal", id: d.id },
        contactId: c.id,
        dealId: d.id,
      });
  }
  for (const c of s.contacts)
    s.activities.push({
      id: id("act"),
      orgId: c.orgId,
      at: c.createdAt,
      actorId: c.ownerId,
      kind: "contact.created",
      summary: `Contato ${c.name} criado`,
      entity: { type: "contact", id: c.id },
      contactId: c.id,
    });
  for (const t of s.tasks.filter((x) => x.completedAt))
    s.activities.push({
      id: id("act"),
      orgId: t.orgId,
      at: t.completedAt!,
      actorId: t.assigneeId,
      kind: t.type === "reuniao" ? "meeting.done" : "task.done",
      summary: `${t.type === "reuniao" ? "Reunião realizada" : "Tarefa concluída"}: ${t.title}`,
      entity: { type: "task", id: t.id },
      contactId: t.contactId,
      dealId: t.dealId,
    });
  for (const l of s.leads.filter((x) => x.qualifiedAt))
    s.activities.push({
      id: id("act"),
      orgId: l.orgId,
      at: l.qualifiedAt!,
      actorId: l.ownerId,
      kind: "lead.qualified",
      summary: `Lead ${l.name} qualificado`,
      entity: { type: "lead", id: l.id },
      contactId: l.contactId,
    });

  // Atendimento: conversas com histórico de mensagens simuladas.
  const CONV: {
    c: Contact;
    who?: ID | undefined;
    status: "aberta" | "pendente" | "encerrada";
    unread: number;
    lines: ["entrada" | "saida" | "nota", string, number][];
    tags: string[];
  }[] = [
    {
      c: nth(contactsA, 26),
      who: davi,
      status: "aberta",
      unread: 2,
      tags: ["Novo cliente"],
      lines: [
        ["entrada", "Oi! Vi a Tipe no Instagram. Funciona com o Colibri?", 50],
        [
          "saida",
          "Olá! Funciona sim, a Tipe se conecta ao PDV que você já usa. Quantas mesas vocês têm?",
          44,
        ],
        ["entrada", "Umas 30 mesas. Dá pra fazer uma demonstração essa semana?", 12],
        ["entrada", "De preferência à tarde.", 11],
      ],
    },
    {
      c: nth(contactsA, 27),
      who: thiago,
      status: "aberta",
      unread: 1,
      tags: ["Proposta"],
      lines: [
        ["entrada", "Recebi a proposta. O cliente consegue pagar com Apple Pay e Google Pay?", 180],
        ["saida", "Consegue! Pix, Apple Pay e Google Pay direto no celular, sem baixar app.", 172],
        ["nota", "Cliente sensível a prazo de implantação. Oferecer piloto de 30 dias.", 170],
        ["entrada", "Ótimo. E a gorjeta vai toda para o garçom?", 30],
      ],
    },
    {
      c: nth(contactsA, 22),
      status: "aberta",
      unread: 1,
      tags: [],
      lines: [["entrada", "Boa tarde, queria entender os planos para um bar pequeno.", 7]],
    },
    {
      c: nth(contactsA, 3),
      who: davi,
      status: "pendente",
      unread: 0,
      tags: ["Suporte"],
      lines: [
        ["entrada", "O QR da mesa 7 está abrindo a conta da mesa 8.", 1500],
        [
          "saida",
          "Obrigado pelo aviso! Vou conferir com a equipe técnica e te retorno ainda hoje.",
          1490,
        ],
        ["nota", "Chamado interno aberto em Suporte.", 1488],
      ],
    },
    {
      c: nth(contactsA, 8),
      who: bruna,
      status: "encerrada",
      unread: 0,
      tags: ["Cliente"],
      lines: [
        ["entrada", "Assinatura renovada, obrigado!", 4000],
        ["saida", "Nós que agradecemos. Qualquer coisa é só chamar por aqui.", 3990],
      ],
    },
    {
      c: nth(contactsA, 28),
      who: bruna,
      status: "aberta",
      unread: 0,
      tags: ["Negociação"],
      lines: [
        ["entrada", "Conseguimos fechar com desconto no primeiro trimestre?", 300],
        ["saida", "Vou levar para a gestão e te retorno até amanhã.", 290],
      ],
    },
    {
      c: nth(contactsA, 30),
      who: davi,
      status: "aberta",
      unread: 3,
      tags: ["Novo cliente"],
      lines: [
        ["entrada", "Olá, somos uma barraca de praia na Beira-Mar.", 25],
        ["entrada", "Temos 25 mesas e muito movimento no fim de semana.", 24],
        ["entrada", "A Tipe atende barraca de praia?", 23],
      ],
    },
  ];
  CONV.forEach((cv, i) => {
    const conv = {
      id: id("cnv"),
      orgId: A,
      contactId: cv.c.id,
      channel: "whatsapp" as const,
      instanceId: "wai_tipe",
      status: cv.status,
      assigneeId: cv.who,
      tags: cv.tags,
      unread: cv.unread,
      createdAt: new Date(now - nth(cv.lines, 0)[2] * 60000).toISOString(),
      lastMessageAt: new Date(now - nth(cv.lines, cv.lines.length - 1)[2] * 60000).toISOString(),
      closedAt: cv.status === "encerrada" ? new Date(now - 3980 * 60000).toISOString() : undefined,
    };
    s.conversations.push(conv);
    for (const [direction, text, minAgo] of cv.lines)
      s.messages.push({
        id: id("msg"),
        orgId: A,
        conversationId: conv.id,
        direction,
        authorId: direction === "entrada" ? undefined : (cv.who ?? davi),
        text,
        at: new Date(now - minAgo * 60000).toISOString(),
        status: direction === "entrada" ? "simulada" : i % 2 ? "lida" : "entregue",
        simulated: true,
      });
  });
  const convB = {
    id: id("cnv"),
    orgId: B,
    contactId: nth(contactsB, 0).id,
    channel: "whatsapp" as const,
    status: "aberta" as const,
    assigneeId: silvia,
    tags: ["Recife"],
    unread: 1,
    createdAt: at(1),
    lastMessageAt: at(0, 9),
  };
  s.conversations.push(convB);
  s.messages.push({
    id: id("msg"),
    orgId: B,
    conversationId: convB.id,
    direction: "entrada",
    text: "Vocês já atendem no Recife Antigo?",
    at: at(0, 9),
    status: "simulada",
    simulated: true,
  });

  s.quickReplies.push(
    {
      id: id("qr"),
      orgId: A,
      shortcut: "/ola",
      text: "Olá! Aqui é da Tipe. Obrigado pelo contato, como posso ajudar?",
    },
    {
      id: id("qr"),
      orgId: A,
      shortcut: "/demo",
      text: "Podemos fazer uma demonstração de 20 minutos no seu salão. Qual o melhor dia e horário?",
    },
    {
      id: id("qr"),
      orgId: A,
      shortcut: "/pagamentos",
      text: "Na Tipe o cliente paga pelo QR da mesa com Pix, Apple Pay ou Google Pay, ou acerta no estabelecimento.",
    },
    {
      id: id("qr"),
      orgId: A,
      shortcut: "/piloto",
      text: "Oferecemos 30 dias de piloto para a equipe testar no dia a dia antes de decidir.",
    },
    {
      id: id("qr"),
      orgId: B,
      shortcut: "/ola",
      text: "Olá! Aqui é da Lebre Parceiros Recife. Como posso ajudar?",
    },
  );

  // Suporte interno.
  const ticket = (
    title: string,
    category: string,
    requesterId: ID,
    assigneeId: ID | undefined,
    status: "aberto" | "em_andamento" | "resolvido",
    days: number,
    priority: Priority,
    comment?: [ID, string],
  ) =>
    s.tickets.push({
      id: id("tkt"),
      orgId: A,
      title,
      description: `${title}. Detalhes registrados pela equipe comercial para acompanhamento interno.`,
      category,
      requesterId,
      assigneeId,
      priority,
      status,
      comments: comment
        ? [{ id: id("cmt"), userId: comment[0], text: comment[1], at: at(Math.max(0, days - 1)) }]
        : [],
      createdAt: at(days),
      resolvedAt: status === "resolvido" ? at(Math.max(0, days - 2)) : undefined,
    });
  ticket("QR da mesa 7 abre a conta da mesa 8", "Produto", davi, caio, "em_andamento", 1, "alta", [
    caio,
    "Reproduzido. Corrigindo o cadastro das mesas do cliente.",
  ]);
  ticket("Acesso ao relatório de comissões", "Acesso", thiago, caio, "aberto", 2, "media");
  ticket(
    "Material de apresentação atualizado",
    "Comercial",
    bruna,
    marina,
    "resolvido",
    9,
    "baixa",
    [marina, "Nova versão anexada na pasta do time."],
  );
  ticket("Integração com Saipos para piloto", "Integração", marina, caio, "aberto", 0, "alta");
  ticket("Cliente pediu segunda via da fatura", "Financeiro", davi, lia, "resolvido", 15, "media");

  // Camadas B e C: negócios ganhos viram contas de restaurante; contas ativas têm histórico
  // de contas pagas pela Tipe, com clientes identificados, gorjetas e avaliações.
  const eco = {
    s,
    now,
    nowIso,
    rand,
    id,
    personName: () => `${pick(FIRST)} ${pick(LAST)}`,
    csm: [caio, davi],
  };
  const tipeAccounts = seedEcosystem(eco, A);
  seedAccountLinks(eco, tipeAccounts);
  seedFoundingPartners(eco, tipeAccounts);

  // Metas do mês atual e dos anteriores (para a evolução).
  const month = (offset: number) => {
    const d = new Date(now);
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() - offset);
    return d.toISOString().slice(0, 7);
  };
  for (let m = 5; m >= 1; m--)
    s.goals.push({
      id: id("gol"),
      orgId: A,
      scope: "equipe",
      teamId: "tm_fortaleza",
      metric: "receita",
      target: 22000 + (5 - m) * 3000,
      period: month(m),
    });
  const cur = month(0);
  s.goals.push(
    {
      id: "gol_team",
      orgId: A,
      scope: "equipe",
      teamId: "tm_fortaleza",
      metric: "receita",
      target: 48000,
      period: cur,
    },
    {
      id: "gol_thiago",
      orgId: A,
      scope: "individual",
      userId: thiago,
      metric: "receita",
      target: 20000,
      period: cur,
    },
    {
      id: "gol_bruna",
      orgId: A,
      scope: "individual",
      userId: bruna,
      metric: "receita",
      target: 20000,
      period: cur,
    },
    {
      id: "gol_davi",
      orgId: A,
      scope: "individual",
      userId: davi,
      metric: "leads_qualificados",
      target: 6,
      period: cur,
    },
    {
      id: "gol_marina",
      orgId: A,
      scope: "individual",
      userId: marina,
      metric: "negocios_ganhos",
      target: 3,
      period: cur,
    },
    {
      id: "gol_b",
      orgId: B,
      scope: "equipe",
      teamId: "tm_recife",
      metric: "receita",
      target: 15000,
      period: cur,
    },
  );
  s.challenges.push({
    id: "chl_reunioes",
    orgId: A,
    title: "Semana das demonstrações",
    description: "Realizar 4 reuniões de demonstração em 7 dias.",
    metric: "reunioes",
    target: 4,
    startsAt: at(3, 0),
    endsAt: future(4, 23),
    reward: 200,
  });
  s.challenges.push({
    id: "chl_qualif",
    orgId: A,
    title: "Lista de espera em dia",
    description: "Qualificar 3 leads da lista de espera neste mês.",
    metric: "leads_qualificados",
    target: 3,
    startsAt: `${cur}-01T03:00:00.000Z`,
    endsAt: future(10, 23),
    reward: 150,
  });

  // Pontos: reconstruídos a partir dos fatos, em ordem, com as mesmas regras do motor.
  type Fact = { at: string; orgId: ID; userId: ID; kind: XpKind; ref: string; reason: string };
  const facts: Fact[] = [
    ...s.deals
      .filter((d) => d.status === "ganha")
      .map((d) => ({
        at: d.closedAt!,
        orgId: d.orgId,
        userId: d.ownerId,
        kind: "oportunidade_ganha" as const,
        ref: `deal:${d.id}`,
        reason: `Oportunidade ganha: ${d.title}`,
      })),
    ...s.leads
      .filter((l) => l.qualifiedAt)
      .map((l) => ({
        at: l.qualifiedAt!,
        orgId: l.orgId,
        userId: l.ownerId,
        kind: "lead_qualificado" as const,
        ref: `lead:${l.id}`,
        reason: `Lead qualificado: ${l.name}`,
      })),
    ...s.tasks
      .filter((t) => t.completedAt)
      .map((t) => ({
        at: t.completedAt!,
        orgId: t.orgId,
        userId: t.assigneeId,
        kind: (t.type === "reuniao" ? "reuniao_realizada" : "tarefa_concluida") as XpKind,
        ref: `task:${t.id}`,
        reason: `${t.type === "reuniao" ? "Reunião realizada" : "Tarefa concluída"}: ${t.title}`,
      })),
  ].sort((a, b) => a.at.localeCompare(b.at));
  for (const f of facts) award(s, f.orgId, f.userId, f.kind, f.ref, f.reason, f.at);
  for (const g of s.goals as Goal[]) {
    if (!goalProgress(s, g).hit) continue;
    const users =
      g.scope === "individual"
        ? [g.userId!]
        : s.memberships
            .filter((m) => m.orgId === g.orgId && m.teamId === g.teamId)
            .map((m) => m.userId);
    const end = new Date(
      Date.UTC(Number(g.period.slice(0, 4)), Number(g.period.slice(5)), 0, 20),
    ).toISOString();
    for (const u of users)
      award(
        s,
        g.orgId,
        u,
        "meta_atingida",
        `meta:${g.id}:${u}`,
        `Meta de ${g.period} atingida`,
        end < nowIso ? end : nowIso,
      );
  }

  for (const o of s.orgs)
    settleGoals(
      s,
      o.id,
      s.memberships.filter((m) => m.orgId === o.id).map((m) => m.userId),
      nowIso,
    );

  // Assinaturas e faturas fictícias.
  s.subscriptions.push(
    {
      orgId: A,
      planId: "professional",
      status: "ativa",
      cycle: "mensal",
      startedAt: at(235),
      renewsAt: future(9),
    },
    {
      orgId: B,
      planId: "starter",
      status: "teste",
      cycle: "mensal",
      startedAt: at(8),
      renewsAt: future(6),
      trialEndsAt: future(6),
    },
  );
  for (let m = 7; m >= 1; m--)
    s.invoices.push({
      id: id("fat"),
      orgId: A,
      number: `DEMO-TIPECO-${String(8 - m).padStart(4, "0")}`,
      description: "Plano Professional: mensalidade",
      amount: m > 5 ? 149 : 449,
      status: "paga",
      issuedAt: at(m * 30 - 9),
      dueAt: at(m * 30 - 14),
      paidAt: at(m * 30 - 13),
      simulated: true,
    });
  s.invoices.push({
    id: id("fat"),
    orgId: A,
    number: "DEMO-TIPECO-0008",
    description: "Plano Professional: mensalidade",
    amount: 449,
    status: "aberta",
    issuedAt: at(1),
    dueAt: future(9),
    simulated: true,
  });
  s.invoices.reverse();

  // WhatsApp: instância de demonstração, uma oficial aguardando credenciais, modelos e registros.
  s.waInstances.push(
    {
      id: "wai_tipe",
      orgId: A,
      name: "Comercial Tipe (demonstração)",
      phone: "+55 85 90000-0101",
      provider: "demo",
      status: "demonstracao",
      createdAt: at(200),
    },
    {
      id: "wai_oficial",
      orgId: A,
      name: "Número oficial",
      phone: "+55 85 90000-0102",
      provider: "cloud_api",
      status: "aguardando_credenciais",
      createdAt: at(12),
    },
    {
      id: "wai_recife",
      orgId: B,
      name: "Recife (demonstração)",
      phone: "+55 81 90000-0201",
      provider: "demo",
      status: "demonstracao",
      createdAt: at(8),
    },
  );
  s.waTemplates.push(
    {
      id: id("wat"),
      orgId: A,
      name: "boas_vindas",
      category: "UTILITY",
      language: "pt_BR",
      body: "Olá {{1}}, obrigado por falar com a Tipe! Em instantes alguém da equipe responde por aqui.",
      status: "aprovado",
    },
    {
      id: id("wat"),
      orgId: A,
      name: "lembrete_demonstracao",
      category: "UTILITY",
      language: "pt_BR",
      body: "Olá {{1}}, lembrando da demonstração da Tipe amanhã às {{2}}.",
      status: "aprovado",
    },
    {
      id: id("wat"),
      orgId: A,
      name: "convite_piloto",
      category: "MARKETING",
      language: "pt_BR",
      body: "{{1}}, que tal testar a Tipe por 30 dias no seu salão?",
      status: "pendente",
    },
  );
  for (const m of s.messages.filter((x) => x.orgId === A && x.direction !== "nota").slice(-8))
    s.waLogs.push({
      id: id("wal"),
      orgId: A,
      at: m.at,
      direction: m.direction === "entrada" ? "webhook" : "envio",
      event: m.direction === "entrada" ? "messages" : "messages.send",
      status: "simulado",
      detail:
        m.direction === "entrada"
          ? "Mensagem simulada recebida"
          : "Envio simulado: nenhuma mensagem saiu para o WhatsApp",
    });
  s.waLogs.push({
    id: id("wal"),
    orgId: A,
    at: at(12),
    direction: "webhook",
    event: "verify",
    status: "erro",
    detail:
      "Número oficial sem credenciais: configure WHATSAPP_TOKEN e WHATSAPP_APP_SECRET no servidor.",
  });
  s.waLogs.sort((a, b) => b.at.localeCompare(a.at));

  s.notifications.push(
    {
      id: id("ntf"),
      orgId: A,
      userId: helena,
      text: "3 mensagens novas da barraca na Beira-Mar",
      href: "/crm/atendimento",
      at: at(0, 9),
      read: false,
    },
    {
      id: id("ntf"),
      orgId: A,
      userId: helena,
      text: "Marina convidou Renan Freitas para o time",
      href: "/crm/equipe",
      at: at(2),
      read: false,
    },
    {
      id: id("ntf"),
      orgId: A,
      userId: marina,
      text: "Chamado de integração com Saipos aberto",
      href: "/crm/suporte",
      at: at(0, 8),
      read: false,
    },
    {
      id: id("ntf"),
      orgId: A,
      userId: thiago,
      text: "Você tem tarefas atrasadas",
      href: "/crm/tarefas?visao=meu-dia",
      at: at(0, 8),
      read: false,
    },
  );
  s.audit.push(
    {
      id: id("aud"),
      orgId: A,
      actorId: marina,
      action: "member.invite",
      target: "renan@tipe.demo",
      result: "ok",
      at: at(2),
    },
    {
      id: id("aud"),
      orgId: A,
      actorId: lia,
      action: "moveDeal",
      target: "Seu papel nesta organização não permite esta ação.",
      result: "negado",
      at: at(4),
    },
    {
      id: id("aud"),
      orgId: B,
      actorId: otavio,
      action: "org.create",
      target: "Lebre Parceiros Recife",
      result: "ok",
      at: at(8),
    },
    {
      id: id("aud"),
      orgId: A,
      actorId: helena,
      action: "subscription.change",
      target: "starter → professional",
      result: "ok",
      at: at(150),
    },
  );

  s.activities.sort((a, b) => b.at.localeCompare(a.at));
  return s;
}
