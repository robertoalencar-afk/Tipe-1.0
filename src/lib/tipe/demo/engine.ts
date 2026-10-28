// Motor da demonstração Tipe 2.0 (/demo).
//
// Tudo aqui é FICTÍCIO e roda só no navegador: nenhum pagamento real, nenhum
// acesso ao banco do restaurante. A matemática da conta é a mesma do produto
// (bill-math.ts), então divisão, centavos e proteção contra pagar duas vezes o
// mesmo item se comportam como na conta real.
//
// O estado é um objeto serializável; toda mudança passa por `apply(state, action)`,
// que é pura e devolve { state, result }. A camada de navegador (store.ts)
// serializa as ações entre abas com Web Locks.

import {
  itemChargeCents,
  planShare,
  roundPortion,
  type ShareItem,
  type ShareMode,
} from "../bill-math";

// ---------------------------------------------------------------- tipos

export type Role = "cliente" | "garcom" | "cozinha" | "gerente" | "tipe";
export type Station = "cozinha" | "bar";
export type LineStatus = "novo" | "preparo" | "pronto" | "entregue" | "cancelado";
export type Method = "pix" | "apple_pay" | "google_pay" | "estabelecimento";
export type PaymentStatus = "pendente" | "aprovado" | "falhou" | "estornado";
export type OrderSource = "qr" | "garcom";

export type MenuItem = {
  id: string;
  category: string;
  name: string;
  description: string;
  priceCents: number;
  station: Station;
  allergens: string[];
  addons: { id: string; name: string; priceCents: number }[];
  available: boolean;
  /** Sugestão de acompanhamento (regra fixa do cardápio, não IA). */
  pairsWith?: string;
};

export type Staff = { id: string; name: string; role: Exclude<Role, "cliente"> };

export type Table = {
  number: number;
  seats: number;
  waiterId: string;
  openedAt: number | null;
  guests: number;
};

export type OrderLine = {
  id: string;
  orderId: string;
  table: number;
  menuId: string;
  name: string;
  unitCents: number;
  qty: number;
  seat: number | null;
  addons: string[];
  notes: string;
  station: Station;
  status: LineStatus;
  createdAt: number;
  updatedAt: number;
  /** Preenchido quando a mesa fecha: a linha vai para o histórico. */
  closedAt: number | null;
};

export type Order = {
  id: string;
  table: number;
  source: OrderSource;
  by: string;
  createdAt: number;
  idempotencyKey: string;
};

export type Payment = {
  id: string;
  table: number;
  payer: string;
  method: Method;
  /** Frações pagas por linha do pedido. */
  portions: Record<string, number>;
  subtotalCents: number;
  serviceCents: number;
  tipCents: number;
  waiterId: string;
  status: PaymentStatus;
  createdAt: number;
  approvedAt: number | null;
  idempotencyKey: string;
  /** Referência no provedor simulado (só meios digitais). */
  providerRef: string | null;
  refundRequestedBy: string | null;
  refundReason: string | null;
  closedAt: number | null;
};

export type Rating = {
  id: string;
  table: number;
  paymentId: string;
  stars: number;
  comment: string;
  waiterId: string;
  createdAt: number;
};

export type Alert = {
  id: string;
  to: "garcom" | "gerente" | "cozinha";
  staffId: string | null;
  table: number | null;
  kind:
    | "prato_pronto"
    | "mesa_quitada"
    | "pagamento"
    | "nota_baixa"
    | "atraso"
    | "pagamento_no_local"
    | "estorno";
  text: string;
  createdAt: number;
  read: boolean;
};

/** Lançamento do extrato do provedor simulado, usado na conciliação. */
export type ProviderRecord = {
  ref: string;
  amountCents: number;
  method: Exclude<Method, "estabelecimento">;
  at: number;
};

export type DemoState = {
  version: 3;
  seededAt: number;
  restaurant: {
    name: string;
    slug: string;
    serviceRate: number;
    tipShareWaiter: number;
    lateAfterMin: number;
  };
  staff: Staff[];
  menu: MenuItem[];
  tables: Table[];
  orders: Order[];
  lines: OrderLine[];
  payments: Payment[];
  ratings: Rating[];
  alerts: Alert[];
  provider: ProviderRecord[];
  processedEvents: string[];
  seq: number;
};

// ---------------------------------------------------------------- permissões

export type Permission =
  | "order.place"
  | "kitchen.advance"
  | "line.deliver"
  | "line.cancel"
  | "payment.start"
  | "payment.confirm_manual"
  | "refund.request"
  | "refund.approve"
  | "menu.availability"
  | "table.close"
  | "reconcile.view"
  | "backoffice.view";

const PERMISSIONS: Record<Role, readonly Permission[]> = {
  cliente: ["order.place", "payment.start"],
  garcom: [
    "order.place",
    "line.deliver",
    "payment.start",
    "payment.confirm_manual",
    "refund.request",
    "table.close",
  ],
  cozinha: ["kitchen.advance", "menu.availability"],
  gerente: [
    "order.place",
    "kitchen.advance",
    "line.deliver",
    "line.cancel",
    "payment.confirm_manual",
    "refund.request",
    "refund.approve",
    "menu.availability",
    "table.close",
    "reconcile.view",
  ],
  tipe: ["backoffice.view"],
};

export function can(role: Role, permission: Permission) {
  return PERMISSIONS[role].includes(permission);
}

// ---------------------------------------------------------------- dados de exemplo

const MIN = 60_000;

const MENU: MenuItem[] = [
  {
    id: "pao-queijo",
    category: "Para começar",
    name: "Pão de queijo da casa",
    description: "Seis unidades, queijo canastra.",
    priceCents: 2400,
    station: "cozinha",
    allergens: ["leite", "ovo"],
    addons: [],
    available: true,
    pairsWith: "caipirinha",
  },
  {
    id: "bolinho",
    category: "Para começar",
    name: "Bolinho de feijoada",
    description: "Quatro unidades com vinagrete.",
    priceCents: 3200,
    station: "cozinha",
    allergens: ["glúten"],
    addons: [{ id: "pimenta", name: "Geleia de pimenta", priceCents: 400 }],
    available: true,
    pairsWith: "chopp",
  },
  {
    id: "moqueca",
    category: "Principais",
    name: "Moqueca de peixe",
    description: "Para duas pessoas, com arroz e pirão.",
    priceCents: 13800,
    station: "cozinha",
    allergens: ["peixe"],
    addons: [{ id: "camarao", name: "Camarão extra", priceCents: 2600 }],
    available: true,
    pairsWith: "vinho-branco",
  },
  {
    id: "parmegiana",
    category: "Principais",
    name: "Filé à parmegiana",
    description: "Com arroz e fritas.",
    priceCents: 7900,
    station: "cozinha",
    allergens: ["glúten", "leite", "ovo"],
    addons: [{ id: "fritas", name: "Porção extra de fritas", priceCents: 1500 }],
    available: true,
    pairsWith: "chopp",
  },
  {
    id: "risoto",
    category: "Principais",
    name: "Risoto de cogumelos",
    description: "Vegetariano.",
    priceCents: 6800,
    station: "cozinha",
    allergens: ["leite"],
    addons: [],
    available: true,
    pairsWith: "vinho-branco",
  },
  {
    id: "pudim",
    category: "Sobremesas",
    name: "Pudim de leite",
    description: "Calda de caramelo.",
    priceCents: 1900,
    station: "cozinha",
    allergens: ["leite", "ovo"],
    addons: [],
    available: true,
    pairsWith: "cafe",
  },
  {
    id: "chopp",
    category: "Bebidas",
    name: "Chopp 300 ml",
    description: "Pilsen.",
    priceCents: 1400,
    station: "bar",
    allergens: ["glúten"],
    addons: [],
    available: true,
  },
  {
    id: "caipirinha",
    category: "Bebidas",
    name: "Caipirinha de limão",
    description: "Cachaça artesanal.",
    priceCents: 2600,
    station: "bar",
    allergens: [],
    addons: [],
    available: true,
  },
  {
    id: "vinho-branco",
    category: "Bebidas",
    name: "Vinho branco (taça)",
    description: "Sauvignon blanc.",
    priceCents: 3400,
    station: "bar",
    allergens: ["sulfitos"],
    addons: [],
    available: true,
  },
  {
    id: "suco",
    category: "Bebidas",
    name: "Suco de caju",
    description: "Natural, 400 ml.",
    priceCents: 1200,
    station: "bar",
    allergens: [],
    addons: [],
    available: true,
  },
  {
    id: "cafe",
    category: "Bebidas",
    name: "Café espresso",
    description: "",
    priceCents: 800,
    station: "bar",
    allergens: [],
    addons: [],
    available: true,
  },
];

const STAFF: Staff[] = [
  { id: "g-ana", name: "Ana Souza", role: "garcom" },
  { id: "g-joao", name: "João Pereira", role: "garcom" },
  { id: "c-rita", name: "Rita Lima", role: "cozinha" },
  { id: "m-carla", name: "Carla Mendes", role: "gerente" },
  { id: "t-suporte", name: "Equipe Tipe", role: "tipe" },
];

/** Estado inicial com algumas mesas em andamento e vendas anteriores do dia. */
export function seedState(now: number): DemoState {
  let s: DemoState = {
    version: 3,
    seededAt: now,
    restaurant: {
      name: "Bistrô da Lebre",
      slug: "bistro-da-lebre-demo",
      serviceRate: 0.1,
      tipShareWaiter: 0.7,
      lateAfterMin: 15,
    },
    staff: STAFF,
    menu: MENU.map((m) => ({
      ...m,
      addons: m.addons.map((a) => ({ ...a })),
      allergens: [...m.allergens],
    })),
    tables: Array.from({ length: 8 }, (_, i) => ({
      number: i + 1,
      seats: i < 4 ? 2 : 4,
      waiterId: i % 2 === 0 ? "g-ana" : "g-joao",
      openedAt: null,
      guests: 0,
    })),
    orders: [],
    lines: [],
    payments: [],
    ratings: [],
    alerts: [],
    provider: [],
    processedEvents: [],
    seq: 0,
  };
  // Almoço já encerrado: mesas servidas, pagas e liberadas (dá forma aos gráficos do painel).
  for (const h of HISTORY) s = serveAndClose(s, h, now);
  // Mesa 3: já paga mais cedo (alimenta o painel).
  s = must(
    apply(s, {
      type: "placeOrder",
      actor: "garcom",
      actorId: "g-ana",
      table: 3,
      source: "garcom",
      idempotencyKey: "seed-3",
      guests: 2,
      at: now - 150 * MIN,
      items: [
        { menuId: "parmegiana", qty: 2 },
        { menuId: "chopp", qty: 3 },
      ],
    }),
  );
  for (const l of s.lines.filter((l) => l.table === 3))
    s = {
      ...s,
      lines: s.lines.map((x) => (x.id === l.id ? { ...x, status: "entregue" as const } : x)),
    };
  s = must(
    apply(s, {
      type: "startPayment",
      actor: "cliente",
      table: 3,
      payer: "Marina",
      method: "pix",
      mode: { kind: "rest" },
      tipPercent: 5,
      idempotencyKey: "seed-pay-3",
      at: now - 95 * MIN,
    }),
  );
  s = must(
    apply(s, {
      type: "providerEvent",
      eventId: "seed-evt-3",
      providerRef: s.payments.at(-1)!.providerRef!,
      status: "paid",
      amountCents: totalCents(s.payments.at(-1)!),
      at: now - 95 * MIN,
    }),
  );
  s = must(
    apply(s, {
      type: "rate",
      table: 3,
      paymentId: s.payments.at(-1)!.id,
      stars: 5,
      comment: "Atendimento rápido!",
      at: now - 94 * MIN,
    }),
  );
  s = must(apply(s, { type: "closeTable", actor: "garcom", table: 3, at: now - 90 * MIN }));
  // Mesa 5: comendo agora, pedido do garçom, um prato atrasado.
  s = must(
    apply(s, {
      type: "placeOrder",
      actor: "garcom",
      actorId: "g-ana",
      table: 5,
      source: "garcom",
      idempotencyKey: "seed-5",
      guests: 4,
      at: now - 22 * MIN,
      items: [
        { menuId: "moqueca", qty: 1, seat: 1 },
        { menuId: "risoto", qty: 1, seat: 3 },
        { menuId: "caipirinha", qty: 2, seat: 2 },
        { menuId: "suco", qty: 2, seat: 4 },
      ],
    }),
  );
  s = {
    ...s,
    lines: s.lines.map((l) =>
      l.table === 5 && l.station === "bar"
        ? { ...l, status: "entregue" as const }
        : l.table === 5 && l.menuId === "risoto"
          ? { ...l, status: "pronto" as const }
          : l.table === 5
            ? { ...l, status: "preparo" as const }
            : l,
    ),
  };
  return { ...s, alerts: [] };
}

type HistoryPayment = {
  payer: string;
  method: Method;
  mode: PayMode;
  tipPercent?: number;
  stars?: number;
  comment?: string;
};
type HistoryTable = {
  table: number;
  minAgo: number;
  guests: number;
  items: CartItem[];
  pay: HistoryPayment[];
};

const HISTORY: HistoryTable[] = [
  {
    table: 1,
    minAgo: 330,
    guests: 2,
    items: [
      { menuId: "bolinho", qty: 1 },
      { menuId: "parmegiana", qty: 2 },
      { menuId: "caipirinha", qty: 2 },
    ],
    pay: [
      {
        payer: "Lucas",
        method: "pix",
        mode: { kind: "equal", parts: 1, people: 2 },
        tipPercent: 5,
        stars: 5,
      },
      { payer: "Bia", method: "apple_pay", mode: { kind: "rest" } },
    ],
  },
  {
    table: 2,
    minAgo: 300,
    guests: 3,
    items: [
      { menuId: "moqueca", qty: 1 },
      { menuId: "suco", qty: 2 },
      { menuId: "pudim", qty: 2 },
    ],
    pay: [
      { payer: "Renata", method: "google_pay", mode: { kind: "rest" }, tipPercent: 8, stars: 4 },
    ],
  },
  {
    table: 4,
    minAgo: 270,
    guests: 2,
    items: [
      { menuId: "risoto", qty: 2 },
      { menuId: "vinho-branco", qty: 2 },
    ],
    pay: [{ payer: "Paulo", method: "estabelecimento", mode: { kind: "rest" }, stars: 5 }],
  },
  {
    table: 6,
    minAgo: 240,
    guests: 4,
    items: [
      { menuId: "pao-queijo", qty: 1 },
      { menuId: "parmegiana", qty: 3 },
      { menuId: "chopp", qty: 4 },
    ],
    pay: [
      {
        payer: "Diego",
        method: "pix",
        mode: { kind: "equal", parts: 1, people: 3 },
        tipPercent: 3,
      },
      { payer: "Clara", method: "pix", mode: { kind: "equal", parts: 1, people: 3 } },
      {
        payer: "Igor",
        method: "pix",
        mode: { kind: "rest" },
        tipPercent: 5,
        stars: 3,
        comment: "Chopp chegou quente",
      },
    ],
  },
  {
    table: 7,
    minAgo: 210,
    guests: 2,
    items: [
      { menuId: "moqueca", qty: 2 },
      { menuId: "caipirinha", qty: 3 },
      { menuId: "cafe", qty: 2 },
    ],
    pay: [{ payer: "Helena", method: "pix", mode: { kind: "rest" }, tipPercent: 5, stars: 5 }],
  },
  {
    table: 8,
    minAgo: 180,
    guests: 3,
    items: [
      { menuId: "bolinho", qty: 1 },
      { menuId: "risoto", qty: 1 },
      { menuId: "chopp", qty: 2 },
    ],
    pay: [{ payer: "Tiago", method: "apple_pay", mode: { kind: "rest" }, stars: 4 }],
  },
  {
    table: 1,
    minAgo: 130,
    guests: 2,
    items: [
      { menuId: "parmegiana", qty: 1 },
      { menuId: "suco", qty: 1 },
      { menuId: "cafe", qty: 1 },
    ],
    pay: [{ payer: "Sônia", method: "pix", mode: { kind: "rest" }, tipPercent: 3, stars: 4 }],
  },
];

/** Uma mesa do começo do dia: pede, recebe tudo, paga, avalia e é liberada. */
function serveAndClose(state: DemoState, h: HistoryTable, now: number): DemoState {
  const at = now - h.minAgo * MIN;
  const waiter = state.tables.find((t) => t.number === h.table)!.waiterId;
  let s = must(
    apply(state, {
      type: "placeOrder",
      actor: "garcom",
      actorId: waiter,
      table: h.table,
      source: "garcom",
      idempotencyKey: `seed-h-${h.table}-${h.minAgo}`,
      guests: h.guests,
      at,
      items: h.items,
    }),
  );
  s = {
    ...s,
    lines: s.lines.map((l) =>
      l.table === h.table && l.closedAt === null ? { ...l, status: "entregue" as const } : l,
    ),
  };
  h.pay.forEach((p, i) => {
    const payAt = at + (55 + i * 2) * MIN;
    const r = apply(s, {
      type: "startPayment",
      actor: "cliente",
      table: h.table,
      payer: p.payer,
      method: p.method,
      mode: p.mode,
      ...(p.tipPercent ? { tipPercent: p.tipPercent } : {}),
      idempotencyKey: `seed-h-pay-${h.table}-${h.minAgo}-${i}`,
      at: payAt,
    });
    s = must(r);
    const pay = s.payments.at(-1)!;
    s =
      p.method === "estabelecimento"
        ? must(
            apply(s, {
              type: "confirmManual",
              actor: "garcom",
              paymentId: pay.id,
              at: payAt + MIN,
            }),
          )
        : must(
            apply(s, {
              type: "providerEvent",
              eventId: `seed-h-evt-${pay.id}`,
              providerRef: pay.providerRef!,
              status: "paid",
              amountCents: totalCents(pay),
              at: payAt,
            }),
          );
    if (p.stars)
      s = must(
        apply(s, {
          type: "rate",
          table: h.table,
          paymentId: pay.id,
          stars: p.stars,
          comment: p.comment ?? "",
          at: payAt + MIN,
        }),
      );
  });
  return must(apply(s, { type: "closeTable", actor: "garcom", table: h.table, at: at + 62 * MIN }));
}

function must(r: ApplyResult): DemoState {
  if (!r.ok) throw new Error(`seed: ${r.error}`);
  return r.state;
}

// ---------------------------------------------------------------- ações

/**
 * Gorjeta extra, com a mesma regra da conta real (PR #21): a conta brasileira já inclui a
 * taxa de serviço, então os percentuais são pequenos e arredondados a R$ 0,50; conta pequena
 * usa R$ 2, R$ 3 e R$ 5. 5% fica em destaque ("Sugerida"), mas nada vem marcado.
 */
export const TIP_PERCENTS = [3, 5, 8];
export const TIP_SUGGESTED = 5;
export const TIP_MIN_CENTS = 200;

export type TipOption = { label: string; cents: number; suggested: boolean; percent?: number };

/** `baseCents` é o valor que a pessoa está pagando (itens + serviço), que também é o teto. */
export function tipOptions(baseCents: number): TipOption[] {
  const base = Number.isFinite(baseCents) ? Math.max(0, Math.round(baseCents)) : 0;
  if (base < TIP_MIN_CENTS) return [];
  if ((base * TIP_PERCENTS[0]!) / 100 < TIP_MIN_CENTS) {
    return [200, 300, 500]
      .filter((c) => c <= base)
      .map((c) => ({ label: brlCents(c), cents: c, suggested: c === 300 }));
  }
  const seen = new Set<number>();
  return TIP_PERCENTS.flatMap((percent) => {
    const raw = Math.round((base * percent) / 100 / 50) * 50;
    const cents = Math.min(base, Math.max(TIP_MIN_CENTS, raw));
    if (seen.has(cents)) return [];
    seen.add(cents);
    return [{ label: `${percent}%`, cents, suggested: percent === TIP_SUGGESTED, percent }];
  });
}

export type CartItem = {
  menuId: string;
  qty: number;
  seat?: number;
  addons?: string[];
  notes?: string;
};

/** Como a pessoa escolhe a parte que vai pagar. */
export type PayMode =
  ShareMode | { kind: "items"; portions: Record<string, number> } | { kind: "seat"; seat: number };

export type Action =
  | {
      type: "placeOrder";
      actor: Role;
      actorId?: string;
      table: number;
      source: OrderSource;
      items: CartItem[];
      idempotencyKey: string;
      guests?: number;
      at: number;
    }
  | { type: "advanceLine"; actor: Role; lineId: string; at: number }
  | { type: "deliverLine"; actor: Role; lineId: string; at: number }
  | { type: "cancelLine"; actor: Role; lineId: string; at: number }
  | { type: "setAvailability"; actor: Role; menuId: string; available: boolean }
  | {
      type: "startPayment";
      actor: Role;
      table: number;
      payer: string;
      method: Method;
      mode: PayMode;
      tipPercent?: number;
      tipCents?: number;
      idempotencyKey: string;
      at: number;
    }
  | {
      type: "providerEvent";
      eventId: string;
      providerRef: string;
      status: "paid" | "failed";
      amountCents: number;
      at: number;
    }
  | { type: "confirmManual"; actor: Role; paymentId: string; at: number }
  | { type: "abandonPayment"; paymentId: string }
  | {
      type: "requestRefund";
      actor: Role;
      actorId: string;
      paymentId: string;
      reason: string;
      at: number;
    }
  | { type: "approveRefund"; actor: Role; paymentId: string; at: number }
  | { type: "rate"; table: number; paymentId: string; stars: number; comment: string; at: number }
  | { type: "closeTable"; actor: Role; table: number; at: number }
  | { type: "readAlerts"; ids: string[] }
  | { type: "injectProviderDivergence"; at: number };

export type ApplyResult =
  { ok: true; state: DemoState; id?: string } | { ok: false; state: DemoState; error: string };

const fail = (state: DemoState, error: string): ApplyResult => ({ ok: false, state, error });

function nextId(s: DemoState, prefix: string): [DemoState, string] {
  const seq = s.seq + 1;
  return [{ ...s, seq }, `${prefix}-${seq}`];
}

function pushAlert(s: DemoState, a: Omit<Alert, "id" | "read">): DemoState {
  const [s2, id] = nextId(s, "al");
  return { ...s2, alerts: [{ ...a, id, read: false }, ...s2.alerts].slice(0, 80) };
}

export function apply(state: DemoState, action: Action): ApplyResult {
  switch (action.type) {
    case "placeOrder": {
      if (!can(action.actor, "order.place"))
        return fail(state, "Seu perfil não pode lançar pedidos.");
      const existing = state.orders.find((o) => o.idempotencyKey === action.idempotencyKey);
      if (existing) return { ok: true, state, id: existing.id }; // repetição do mesmo envio
      const table = state.tables.find((t) => t.number === action.table);
      if (!table) return fail(state, "Mesa não encontrada.");
      const items = action.items.filter((i) => i.qty > 0);
      if (items.length === 0) return fail(state, "O pedido está vazio.");
      for (const it of items) {
        const m = state.menu.find((x) => x.id === it.menuId);
        if (!m) return fail(state, "Item fora do cardápio.");
        if (!m.available) return fail(state, `${m.name} acabou de ficar indisponível.`);
        if (!Number.isInteger(it.qty) || it.qty > 20) return fail(state, "Quantidade inválida.");
        if (
          it.seat !== undefined &&
          (!Number.isInteger(it.seat) ||
            it.seat < 1 ||
            it.seat > Math.max(table.seats, action.guests ?? table.guests, 1))
        )
          return fail(state, "Lugar inválido para esta mesa.");
      }
      const [seeded, orderId] = nextId(state, "ped");
      let s = seeded;
      const by = action.actorId ?? (action.source === "qr" ? "cliente" : table.waiterId);
      s = {
        ...s,
        orders: [
          ...s.orders,
          {
            id: orderId,
            table: action.table,
            source: action.source,
            by,
            createdAt: action.at,
            idempotencyKey: action.idempotencyKey,
          },
        ],
      };
      for (const it of items) {
        const m = state.menu.find((x) => x.id === it.menuId)!;
        const addons = (it.addons ?? []).filter((a) => m.addons.some((x) => x.id === a));
        const unitCents =
          m.priceCents +
          addons.reduce((sum, a) => sum + (m.addons.find((x) => x.id === a)?.priceCents ?? 0), 0);
        let lineId: string;
        [s, lineId] = nextId(s, "it");
        s = {
          ...s,
          lines: [
            ...s.lines,
            {
              id: lineId,
              orderId,
              table: action.table,
              menuId: m.id,
              name: m.name,
              unitCents,
              qty: it.qty,
              seat: it.seat ?? null,
              addons,
              notes: (it.notes ?? "").slice(0, 140),
              station: m.station,
              status: "novo",
              createdAt: action.at,
              updatedAt: action.at,
              closedAt: null,
            },
          ],
        };
      }
      s = {
        ...s,
        tables: s.tables.map((t) =>
          t.number === action.table
            ? {
                ...t,
                openedAt: t.openedAt ?? action.at,
                guests: Math.max(t.guests, action.guests ?? 0, 1),
              }
            : t,
        ),
      };
      return { ok: true, state: s, id: orderId };
    }

    case "advanceLine": {
      if (!can(action.actor, "kitchen.advance"))
        return fail(state, "Só a cozinha avança o preparo.");
      const line = state.lines.find((l) => l.id === action.lineId);
      if (!line) return fail(state, "Item não encontrado.");
      const next: Partial<Record<LineStatus, LineStatus>> = { novo: "preparo", preparo: "pronto" };
      const to = next[line.status];
      if (!to) return fail(state, "Este item já saiu da cozinha.");
      let s = {
        ...state,
        lines: state.lines.map((l) =>
          l.id === line.id ? { ...l, status: to, updatedAt: action.at } : l,
        ),
      };
      if (to === "pronto") {
        const table = s.tables.find((t) => t.number === line.table)!;
        s = pushAlert(s, {
          to: "garcom",
          staffId: table.waiterId,
          table: line.table,
          kind: "prato_pronto",
          text: `Mesa ${line.table}: ${line.name} pronto para servir`,
          createdAt: action.at,
        });
      }
      return { ok: true, state: s };
    }

    case "deliverLine": {
      if (!can(action.actor, "line.deliver")) return fail(state, "Seu perfil não marca entregas.");
      const line = state.lines.find((l) => l.id === action.lineId);
      if (!line || line.status !== "pronto")
        return fail(state, "Só itens prontos podem ser entregues.");
      return {
        ok: true,
        state: {
          ...state,
          lines: state.lines.map((l) =>
            l.id === line.id ? { ...l, status: "entregue", updatedAt: action.at } : l,
          ),
        },
      };
    }

    case "cancelLine": {
      if (!can(action.actor, "line.cancel")) return fail(state, "Só o gerente cancela itens.");
      const line = state.lines.find((l) => l.id === action.lineId);
      if (!line) return fail(state, "Item não encontrado.");
      if (paidPortion(state, line.id) > 0 || reservedPortion(state, line.id) > 0)
        return fail(state, "Este item já foi pago (ou está sendo pago) e não pode ser cancelado.");
      return {
        ok: true,
        state: {
          ...state,
          lines: state.lines.map((l) =>
            l.id === line.id ? { ...l, status: "cancelado", updatedAt: action.at } : l,
          ),
        },
      };
    }

    case "setAvailability": {
      if (!can(action.actor, "menu.availability"))
        return fail(state, "Seu perfil não altera o cardápio.");
      return {
        ok: true,
        state: {
          ...state,
          menu: state.menu.map((m) =>
            m.id === action.menuId ? { ...m, available: action.available } : m,
          ),
        },
      };
    }

    case "startPayment": {
      if (!can(action.actor, "payment.start"))
        return fail(state, "Seu perfil não inicia pagamentos.");
      const dup = state.payments.find((p) => p.idempotencyKey === action.idempotencyKey);
      if (dup) return { ok: true, state, id: dup.id };
      const table = state.tables.find((t) => t.number === action.table);
      if (!table || table.openedAt === null) return fail(state, "Esta mesa não tem conta aberta.");
      const items = shareItems(state, action.table);
      const portions = portionsFor(state, action.table, items, action.mode);
      if (!portions) return fail(state, "Não há nada em aberto para essa escolha.");
      // Proteção contra pagamento simultâneo: cada fração precisa estar livre agora.
      for (const [code, q] of Object.entries(portions)) {
        const it = items.find((i) => i.code === code);
        if (!it || q > it.available + 1e-9)
          return fail(
            state,
            "Alguém da mesa acabou de pagar parte desses itens. Atualizamos sua conta.",
          );
      }
      const subtotalCents = chargeCents(state, items, portions);
      if (subtotalCents <= 0) return fail(state, "Valor inválido.");
      const serviceCents = Math.round(subtotalCents * state.restaurant.serviceRate);
      // Gorjeta extra (decisão de 20/10): percentuais pequenos, porque a conta já tem serviço;
      // "outro valor" entre R$ 2,00 e o valor que a pessoa está pagando.
      let tipCents = 0;
      if (action.tipCents !== undefined && action.tipCents > 0) {
        tipCents = Math.round(action.tipCents);
        if (tipCents < TIP_MIN_CENTS) return fail(state, "A gorjeta mínima é de R$ 2,00.");
        if (tipCents > subtotalCents + serviceCents)
          return fail(state, "A gorjeta não pode passar do valor que você está pagando.");
      } else if (action.tipPercent) {
        const option = tipOptions(subtotalCents + serviceCents).find(
          (o) => o.percent === action.tipPercent,
        );
        if (!option) return fail(state, "Percentual de gorjeta inválido.");
        tipCents = option.cents;
      }
      const [withId, id] = nextId(state, "pg");
      let s = withId;
      const digital = action.method !== "estabelecimento";
      const payment: Payment = {
        id,
        table: action.table,
        payer: action.payer.trim().slice(0, 40) || "Cliente",
        method: action.method,
        portions,
        subtotalCents,
        serviceCents,
        tipCents,
        waiterId: table.waiterId,
        status: "pendente",
        createdAt: action.at,
        approvedAt: null,
        idempotencyKey: action.idempotencyKey,
        providerRef: digital ? `sim_${id}` : null,
        refundRequestedBy: null,
        refundReason: null,
        closedAt: null,
      };
      s = { ...s, payments: [...s.payments, payment] };
      if (!digital) {
        s = pushAlert(s, {
          to: "garcom",
          staffId: table.waiterId,
          table: action.table,
          kind: "pagamento_no_local",
          text: `Mesa ${action.table}: ${payment.payer} vai pagar ${brlCents(totalCents(payment))} no local`,
          createdAt: action.at,
        });
      }
      return { ok: true, state: s, id };
    }

    case "providerEvent": {
      // Webhook simulado: o mesmo evento chegando duas vezes não muda nada.
      if (state.processedEvents.includes(action.eventId)) return { ok: true, state };
      const p = state.payments.find((x) => x.providerRef === action.providerRef);
      let s: DemoState = {
        ...state,
        processedEvents: [...state.processedEvents, action.eventId].slice(-500),
      };
      if (!p) return { ok: true, state: s };
      if (p.status !== "pendente") return { ok: true, state: s }; // evento atrasado ou fora de ordem
      if (action.status === "failed") {
        return {
          ok: true,
          state: {
            ...s,
            payments: s.payments.map((x) => (x.id === p.id ? { ...x, status: "falhou" } : x)),
          },
        };
      }
      s = {
        ...s,
        provider: [
          ...s.provider,
          {
            ref: action.providerRef,
            amountCents: action.amountCents,
            method: p.method as ProviderRecord["method"],
            at: action.at,
          },
        ],
      };
      if (action.amountCents !== totalCents(p)) {
        // Valor diferente do combinado: não dá baixa sozinho, vai para conferência.
        return {
          ok: true,
          state: pushAlert(s, {
            to: "gerente",
            staffId: null,
            table: p.table,
            kind: "pagamento",
            text: `Mesa ${p.table}: valor recebido diferente do cobrado (conferir na conciliação)`,
            createdAt: action.at,
          }),
        };
      }
      return { ok: true, state: approve(s, p.id, action.at) };
    }

    case "confirmManual": {
      if (!can(action.actor, "payment.confirm_manual"))
        return fail(state, "Só garçom ou gerente confirmam pagamento no local.");
      const p = state.payments.find((x) => x.id === action.paymentId);
      if (!p || p.method !== "estabelecimento" || p.status !== "pendente")
        return fail(state, "Pagamento não está aguardando confirmação.");
      return { ok: true, state: approve(state, p.id, action.at) };
    }

    case "abandonPayment": {
      const p = state.payments.find((x) => x.id === action.paymentId);
      if (!p || p.status !== "pendente") return { ok: true, state };
      return {
        ok: true,
        state: {
          ...state,
          payments: state.payments.map((x) => (x.id === p.id ? { ...x, status: "falhou" } : x)),
        },
      };
    }

    case "requestRefund": {
      if (!can(action.actor, "refund.request")) return fail(state, "Seu perfil não pede estorno.");
      const p = state.payments.find((x) => x.id === action.paymentId);
      if (!p || p.status !== "aprovado")
        return fail(state, "Só pagamentos aprovados podem ser estornados.");
      if (!action.reason.trim()) return fail(state, "Informe o motivo do estorno.");
      const s = {
        ...state,
        payments: state.payments.map((x) =>
          x.id === p.id
            ? {
                ...x,
                refundRequestedBy: action.actorId,
                refundReason: action.reason.trim().slice(0, 200),
              }
            : x,
        ),
      };
      return {
        ok: true,
        state: pushAlert(s, {
          to: "gerente",
          staffId: null,
          table: p.table,
          kind: "estorno",
          text: `Pedido de estorno na mesa ${p.table}: ${action.reason.trim()}`,
          createdAt: action.at,
        }),
      };
    }

    case "approveRefund": {
      if (!can(action.actor, "refund.approve")) return fail(state, "Só o gerente aprova estornos.");
      const p = state.payments.find((x) => x.id === action.paymentId);
      if (!p || p.status !== "aprovado" || !p.refundRequestedBy)
        return fail(state, "Não há pedido de estorno para este pagamento.");
      // Estorno não reabre os itens da conta (mesma regra do produto).
      return {
        ok: true,
        state: {
          ...state,
          payments: state.payments.map((x) => (x.id === p.id ? { ...x, status: "estornado" } : x)),
        },
      };
    }

    case "rate": {
      const p = state.payments.find((x) => x.id === action.paymentId && x.table === action.table);
      if (!p || p.status !== "aprovado") return fail(state, "Avalie depois do pagamento aprovado.");
      if (state.ratings.some((r) => r.paymentId === p.id))
        return fail(state, "Este pagamento já foi avaliado.");
      if (!Number.isInteger(action.stars) || action.stars < 1 || action.stars > 5)
        return fail(state, "Nota inválida.");
      const [withId, id] = nextId(state, "av");
      let s = withId;
      s = {
        ...s,
        ratings: [
          ...s.ratings,
          {
            id,
            table: p.table,
            paymentId: p.id,
            stars: action.stars,
            comment: action.comment.trim().slice(0, 280),
            waiterId: p.waiterId,
            createdAt: action.at,
          },
        ],
      };
      if (action.stars <= 2) {
        s = pushAlert(s, {
          to: "garcom",
          staffId: p.waiterId,
          table: p.table,
          kind: "nota_baixa",
          text: `Mesa ${p.table} deu nota ${action.stars}. Vale passar na mesa.`,
          createdAt: action.at,
        });
        s = pushAlert(s, {
          to: "gerente",
          staffId: null,
          table: p.table,
          kind: "nota_baixa",
          text: `Nota ${action.stars} na mesa ${p.table}${action.comment.trim() ? `: "${action.comment.trim().slice(0, 80)}"` : ""}`,
          createdAt: action.at,
        });
      }
      return { ok: true, state: s, id };
    }

    case "closeTable": {
      if (!can(action.actor, "table.close")) return fail(state, "Seu perfil não fecha mesas.");
      const t = state.tables.find((x) => x.number === action.table);
      if (!t || t.openedAt === null) return fail(state, "Mesa já está livre.");
      if (remainingCents(state, action.table) > 0)
        return fail(state, "Ainda há valor em aberto nesta mesa.");
      if (
        state.payments.some(
          (p) => p.table === action.table && p.status === "pendente" && p.closedAt === null,
        )
      )
        return fail(state, "Há pagamento aguardando confirmação.");
      // Fechar arquiva a conta: linhas e pagamentos ficam no histórico, a mesa volta a ficar livre.
      return {
        ok: true,
        state: {
          ...state,
          tables: state.tables.map((x) =>
            x.number === action.table ? { ...x, openedAt: null, guests: 0 } : x,
          ),
          lines: state.lines.map((l) =>
            l.table === action.table && l.closedAt === null ? { ...l, closedAt: action.at } : l,
          ),
          payments: state.payments.map((p) =>
            p.table === action.table && p.closedAt === null ? { ...p, closedAt: action.at } : p,
          ),
        },
      };
    }

    case "readAlerts":
      return {
        ok: true,
        state: {
          ...state,
          alerts: state.alerts.map((a) => (action.ids.includes(a.id) ? { ...a, read: true } : a)),
        },
      };

    case "injectProviderDivergence": {
      // Para demonstrar a conciliação: um lançamento no extrato que a Tipe não reconhece.
      const [s, id] = nextId(state, "ext");
      return {
        ok: true,
        state: {
          ...s,
          provider: [
            ...s.provider,
            { ref: `sim_${id}`, amountCents: 4590, method: "pix", at: action.at },
          ],
        },
        id,
      };
    }
  }
}

function approve(s: DemoState, paymentId: string, at: number): DemoState {
  const p = s.payments.find((x) => x.id === paymentId)!;
  let next: DemoState = {
    ...s,
    payments: s.payments.map((x) =>
      x.id === paymentId ? { ...x, status: "aprovado", approvedAt: at } : x,
    ),
  };
  const left = remainingCents(next, p.table);
  next = pushAlert(next, {
    to: "garcom",
    staffId: p.waiterId,
    table: p.table,
    kind: left > 0 ? "pagamento" : "mesa_quitada",
    text:
      left > 0
        ? `Mesa ${p.table}: ${p.payer} pagou ${brlCents(totalCents(p))}${p.tipCents ? ` (gorjeta ${brlCents(p.tipCents)})` : ""}. Faltam ${brlCents(left)}`
        : `Mesa ${p.table} quitada${p.tipCents ? `, com gorjeta de ${brlCents(p.tipCents)}` : ""}`,
    createdAt: at,
  });
  return next;
}

// ---------------------------------------------------------------- leitura da conta

const openLines = (s: DemoState, table: number) =>
  s.lines.filter((l) => l.table === table && l.status !== "cancelado" && l.closedAt === null);
const openPayments = (s: DemoState, table: number) =>
  s.payments.filter((p) => p.table === table && p.closedAt === null);

export function paidPortion(s: DemoState, lineId: string) {
  return roundPortion(
    s.payments
      .filter((p) => p.status === "aprovado" || p.status === "estornado")
      .reduce((sum, p) => sum + (p.portions[lineId] ?? 0), 0),
  );
}
export function reservedPortion(s: DemoState, lineId: string) {
  return roundPortion(
    s.payments
      .filter((p) => p.status === "pendente")
      .reduce((sum, p) => sum + (p.portions[lineId] ?? 0), 0),
  );
}

/** Itens da conta aberta no formato de bill-math (preço em reais). */
export function shareItems(s: DemoState, table: number): ShareItem[] {
  return openLines(s, table).map((l) => ({
    code: l.id,
    unitPrice: l.unitCents / 100,
    ordered: l.qty,
    available: roundPortion(Math.max(0, l.qty - paidPortion(s, l.id) - reservedPortion(s, l.id))),
  }));
}

function chargeCents(s: DemoState, items: ShareItem[], portions: Record<string, number>) {
  let cents = 0;
  for (const it of items) {
    const q = roundPortion(portions[it.code] ?? 0);
    if (q <= 0) continue;
    cents += itemChargeCents(it.unitPrice, roundPortion(it.ordered - it.available), q);
  }
  return cents;
}

function portionsFor(
  s: DemoState,
  table: number,
  items: ShareItem[],
  mode: PayMode,
): Record<string, number> | null {
  if (mode.kind === "items") {
    const out: Record<string, number> = {};
    for (const [code, q] of Object.entries(mode.portions))
      if (roundPortion(q) > 0) out[code] = roundPortion(q);
    return Object.keys(out).length ? out : null;
  }
  if (mode.kind === "seat") {
    const out: Record<string, number> = {};
    for (const l of openLines(s, table)) {
      if (l.seat !== mode.seat) continue;
      const it = items.find((i) => i.code === l.id);
      if (it && it.available > 0) out[l.id] = it.available;
    }
    return Object.keys(out).length ? out : null;
  }
  return planShare(items, mode, 0)?.quantities ?? null;
}

/** Quanto custaria agora uma escolha (sem gravar nada). */
export function previewCents(s: DemoState, table: number, mode: PayMode) {
  const items = shareItems(s, table);
  const portions = portionsFor(s, table, items, mode);
  if (!portions) return null;
  for (const [code, q] of Object.entries(portions)) {
    const it = items.find((i) => i.code === code);
    if (!it || q > it.available + 1e-9) return null;
  }
  const subtotal = chargeCents(s, items, portions);
  return { portions, subtotal, service: Math.round(subtotal * s.restaurant.serviceRate) };
}

export const totalCents = (p: Pick<Payment, "subtotalCents" | "serviceCents" | "tipCents">) =>
  p.subtotalCents + p.serviceCents + p.tipCents;

export function billCents(s: DemoState, table: number) {
  return openLines(s, table).reduce((sum, l) => sum + l.unitCents * l.qty, 0);
}

/** Subtotal ainda não pago nem reservado (sem taxa de serviço). */
export function remainingCents(s: DemoState, table: number) {
  const items = shareItems(s, table);
  return chargeCents(s, items, Object.fromEntries(items.map((i) => [i.code, i.available])));
}

export function tableView(s: DemoState, table: number) {
  const t = s.tables.find((x) => x.number === table)!;
  const lines = openLines(s, table);
  const payments = openPayments(s, table);
  const bill = billCents(s, table);
  const remaining = remainingCents(s, table);
  const pending = payments.filter((p) => p.status === "pendente");
  const state: "livre" | "ocupada" | "pagando" | "quitada" =
    t.openedAt === null
      ? "livre"
      : remaining === 0 && pending.length === 0 && bill > 0
        ? "quitada"
        : payments.some((p) => p.status === "aprovado") || pending.length
          ? "pagando"
          : "ocupada";
  return {
    table: t,
    lines,
    payments,
    bill,
    remaining,
    pending,
    state,
    waiter: s.staff.find((x) => x.id === t.waiterId)!,
  };
}

// ---------------------------------------------------------------- cozinha

export function kitchenQueue(s: DemoState, now: number, station?: Station) {
  return s.lines
    .filter(
      (l) =>
        (l.status === "novo" || l.status === "preparo" || l.status === "pronto") &&
        (!station || l.station === station),
    )
    .map((l) => ({
      ...l,
      waitMin: Math.floor((now - l.createdAt) / MIN),
      late: l.status !== "pronto" && now - l.createdAt > s.restaurant.lateAfterMin * MIN,
    }))
    .sort((a, b) => Number(b.late) - Number(a.late) || a.createdAt - b.createdAt);
}

// ---------------------------------------------------------------- indicadores

export function dashboard(s: DemoState) {
  const approved = s.payments.filter((p) => p.status === "aprovado");
  const refunded = s.payments.filter((p) => p.status === "estornado");
  const revenue = approved.reduce((sum, p) => sum + p.subtotalCents + p.serviceCents, 0);
  const tips = approved.reduce((sum, p) => sum + p.tipCents, 0);
  const tablesServed = new Set(approved.map((p) => `${p.table}-${p.closedAt ?? "aberta"}`)).size;
  const byMethod = new Map<Method, number>();
  for (const p of approved) byMethod.set(p.method, (byMethod.get(p.method) ?? 0) + totalCents(p));
  const byItem = new Map<string, { name: string; qty: number; cents: number }>();
  for (const l of s.lines) {
    if (l.status === "cancelado") continue;
    const cur = byItem.get(l.menuId) ?? { name: l.name, qty: 0, cents: 0 };
    byItem.set(l.menuId, {
      name: l.name,
      qty: cur.qty + l.qty,
      cents: cur.cents + l.qty * l.unitCents,
    });
  }
  const byHour = new Map<number, { orders: number; cents: number }>();
  const hourOf = (t: number) => new Date(t).getHours();
  for (const o of s.orders) {
    const cur = byHour.get(hourOf(o.createdAt)) ?? { orders: 0, cents: 0 };
    byHour.set(hourOf(o.createdAt), { ...cur, orders: cur.orders + 1 });
  }
  for (const p of approved) {
    const h = hourOf(p.approvedAt ?? p.createdAt);
    const cur = byHour.get(h) ?? { orders: 0, cents: 0 };
    byHour.set(h, { ...cur, cents: cur.cents + p.subtotalCents + p.serviceCents });
  }
  const ratings = s.ratings;
  const byWaiter = s.staff
    .filter((x) => x.role === "garcom")
    .map((w) => {
      const mine = approved.filter((p) => p.waiterId === w.id);
      const rs = ratings.filter((r) => r.waiterId === w.id);
      return {
        id: w.id,
        name: w.name,
        sales: mine.reduce((sum, p) => sum + p.subtotalCents + p.serviceCents, 0),
        tips: mine.reduce((sum, p) => sum + p.tipCents, 0),
        tipToWaiter: mine.reduce(
          (sum, p) => sum + Math.round(p.tipCents * s.restaurant.tipShareWaiter),
          0,
        ),
        rating: rs.length ? rs.reduce((a, r) => a + r.stars, 0) / rs.length : null,
        ratings: rs.length,
      };
    });
  return {
    revenue,
    tips,
    tablesServed,
    avgTicket: tablesServed ? Math.round(revenue / tablesServed) : 0,
    payments: approved.length,
    refunds: refunded.reduce((sum, p) => sum + totalCents(p), 0),
    openTables: s.tables.filter((t) => t.openedAt !== null).length,
    openBalance: s.tables.reduce(
      (sum, t) =>
        sum +
        (t.openedAt === null
          ? 0
          : Math.round(remainingCents(s, t.number) * (1 + s.restaurant.serviceRate))),
      0,
    ),
    byMethod: [...byMethod.entries()]
      .map(([method, cents]) => ({ method, cents }))
      .sort((a, b) => b.cents - a.cents),
    topItems: [...byItem.values()].sort((a, b) => b.cents - a.cents).slice(0, 5),
    byHour: [...byHour.entries()].sort((a, b) => a[0] - b[0]).map(([hour, v]) => ({ hour, ...v })),
    avgRating: ratings.length ? ratings.reduce((a, r) => a + r.stars, 0) / ratings.length : null,
    byWaiter,
  };
}

// ---------------------------------------------------------------- conciliação

export type ReconRow =
  | { kind: "conciliado"; paymentId: string; ref: string; cents: number }
  | {
      kind: "valor_divergente";
      paymentId: string;
      ref: string;
      tipeCents: number;
      providerCents: number;
    }
  | { kind: "sem_extrato"; paymentId: string; ref: string; cents: number }
  | { kind: "sem_registro_tipe"; ref: string; cents: number }
  | { kind: "conferir_caixa"; paymentId: string; cents: number; confirmed: boolean };

/**
 * Conciliação determinística: casa cada pagamento digital da Tipe com o
 * extrato do provedor pela referência e compara valores ao centavo.
 * Pagamentos no local não têm extrato; entram como conferência de caixa.
 */
export function reconcile(s: DemoState): {
  rows: ReconRow[];
  summary: Record<ReconRow["kind"], number>;
} {
  const rows: ReconRow[] = [];
  const byRef = new Map(s.provider.map((r) => [r.ref, r]));
  const seen = new Set<string>();
  for (const p of s.payments) {
    if (p.method === "estabelecimento") {
      if (p.status === "aprovado" || p.status === "pendente")
        rows.push({
          kind: "conferir_caixa",
          paymentId: p.id,
          cents: totalCents(p),
          confirmed: p.status === "aprovado",
        });
      continue;
    }
    if (!p.providerRef) continue;
    const rec = byRef.get(p.providerRef);
    if (rec) seen.add(rec.ref);
    if (p.status === "aprovado") {
      if (!rec)
        rows.push({
          kind: "sem_extrato",
          paymentId: p.id,
          ref: p.providerRef,
          cents: totalCents(p),
        });
      else rows.push({ kind: "conciliado", paymentId: p.id, ref: rec.ref, cents: rec.amountCents });
    } else if (rec) {
      rows.push({
        kind: "valor_divergente",
        paymentId: p.id,
        ref: rec.ref,
        tipeCents: totalCents(p),
        providerCents: rec.amountCents,
      });
    }
  }
  for (const r of s.provider)
    if (!seen.has(r.ref))
      rows.push({ kind: "sem_registro_tipe", ref: r.ref, cents: r.amountCents });
  const summary = {
    conciliado: 0,
    valor_divergente: 0,
    sem_extrato: 0,
    sem_registro_tipe: 0,
    conferir_caixa: 0,
  };
  for (const r of rows) summary[r.kind] += 1;
  return { rows, summary };
}

// ---------------------------------------------------------------- formatação

export const brlCents = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const METHOD_LABEL: Record<Method, string> = {
  pix: "Pix",
  apple_pay: "Apple Pay",
  google_pay: "Google Pay",
  estabelecimento: "Pagar no estabelecimento",
};
