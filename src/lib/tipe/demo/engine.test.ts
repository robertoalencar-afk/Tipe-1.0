import { describe, expect, it } from "vitest";
import {
  apply,
  can,
  dashboard,
  kitchenQueue,
  previewCents,
  reconcile,
  remainingCents,
  seedState,
  tableView,
  totalCents,
  type Action,
  type DemoState,
} from "./engine";

const T0 = new Date("2026-10-20T20:00:00-03:00").getTime();

function run(s: DemoState, a: Action) {
  const r = apply(s, a);
  if (!r.ok) throw new Error(r.error);
  return r;
}

/** Mesa 1 com 1 moqueca (138), 2 chopps (2×14) e 1 suco (12), lugares 1 e 2. */
function withTable1() {
  const s = seedState(T0);
  return run(s, {
    type: "placeOrder",
    actor: "cliente",
    table: 1,
    source: "qr",
    idempotencyKey: "k1",
    guests: 2,
    at: T0,
    items: [
      { menuId: "moqueca", qty: 1, seat: 1 },
      { menuId: "chopp", qty: 2, seat: 2 },
      { menuId: "suco", qty: 1, seat: 1 },
    ],
  }).state;
}

const pay = (s: DemoState, id: string) => {
  const p = s.payments.find((x) => x.id === id)!;
  return run(s, {
    type: "providerEvent",
    eventId: `evt-${id}`,
    providerRef: p.providerRef!,
    status: "paid",
    amountCents: totalCents(p),
    at: T0 + 1,
  }).state;
};

describe("estado inicial da demonstração", () => {
  it("tem mesa paga, mesa em andamento e nenhum aviso pendente", () => {
    const s = seedState(T0);
    expect(tableView(s, 5).state).toBe("ocupada");
    expect(tableView(s, 3).state).toBe("livre");
    expect(dashboard(s).payments).toBe(1);
    expect(s.alerts).toHaveLength(0);
  });
});

describe("pedido", () => {
  it("o mesmo envio repetido não duplica o pedido", () => {
    const s = withTable1();
    const again = run(s, {
      type: "placeOrder",
      actor: "cliente",
      table: 1,
      source: "qr",
      idempotencyKey: "k1",
      at: T0,
      items: [{ menuId: "moqueca", qty: 1 }],
    });
    expect(again.state.lines.filter((l) => l.table === 1)).toHaveLength(3);
  });

  it("pedido do QR e do garçom caem na mesma conta", () => {
    let s = withTable1();
    s = run(s, {
      type: "placeOrder",
      actor: "garcom",
      actorId: "g-ana",
      table: 1,
      source: "garcom",
      idempotencyKey: "k2",
      at: T0,
      items: [{ menuId: "cafe", qty: 2 }],
    }).state;
    expect(tableView(s, 1).bill).toBe(13800 + 2 * 1400 + 1200 + 2 * 800);
  });

  it("item indisponível é recusado", () => {
    let s = withTable1();
    s = run(s, {
      type: "setAvailability",
      actor: "cozinha",
      menuId: "pudim",
      available: false,
    }).state;
    const r = apply(s, {
      type: "placeOrder",
      actor: "cliente",
      table: 1,
      source: "qr",
      idempotencyKey: "k3",
      at: T0,
      items: [{ menuId: "pudim", qty: 1 }],
    });
    expect(r.ok).toBe(false);
  });

  it("adicionais entram no preço da linha", () => {
    const s = run(withTable1(), {
      type: "placeOrder",
      actor: "cliente",
      table: 1,
      source: "qr",
      idempotencyKey: "k4",
      at: T0,
      items: [{ menuId: "parmegiana", qty: 1, addons: ["fritas", "inexistente"] }],
    }).state;
    expect(s.lines.at(-1)!.unitCents).toBe(7900 + 1500);
  });
});

describe("cozinha", () => {
  it("avança novo → preparo → pronto e avisa o garçom da mesa", () => {
    let s = withTable1();
    const line = s.lines.find((l) => l.table === 1 && l.menuId === "moqueca")!;
    s = run(s, { type: "advanceLine", actor: "cozinha", lineId: line.id, at: T0 }).state;
    s = run(s, { type: "advanceLine", actor: "cozinha", lineId: line.id, at: T0 }).state;
    expect(s.lines.find((l) => l.id === line.id)!.status).toBe("pronto");
    expect(s.alerts[0]!.staffId).toBe("g-ana");
    expect(apply(s, { type: "advanceLine", actor: "garcom", lineId: line.id, at: T0 }).ok).toBe(
      false,
    );
  });

  it("marca atraso depois do limite e põe o atrasado na frente", () => {
    const s = withTable1();
    const q = kitchenQueue(s, T0 + 16 * 60_000);
    expect(q[0]!.late).toBe(true);
    expect(kitchenQueue(s, T0 + 60_000, "bar").every((l) => l.station === "bar")).toBe(true);
  });
});

describe("divisão e pagamento", () => {
  it("divide por lugar: o lugar 1 paga moqueca e suco", () => {
    const s = withTable1();
    expect(previewCents(s, 1, { kind: "seat", seat: 1 })!.subtotal).toBe(13800 + 1200);
  });

  it("três partes iguais quitam a conta sem sobrar centavo", () => {
    let s = withTable1();
    const bill = tableView(s, 1).bill;
    let paid = 0;
    for (let i = 0; i < 3; i++) {
      const mode =
        i === 2 ? { kind: "rest" as const } : { kind: "equal" as const, parts: 1, people: 3 };
      const r = run(s, {
        type: "startPayment",
        actor: "cliente",
        table: 1,
        payer: `P${i}`,
        method: "pix",
        mode,
        idempotencyKey: `eq${i}`,
        at: T0,
      });
      s = pay(r.state, r.id!);
      paid += s.payments.find((p) => p.id === r.id)!.subtotalCents;
    }
    expect(paid).toBe(bill);
    expect(remainingCents(s, 1)).toBe(0);
    expect(tableView(s, 1).state).toBe("quitada");
    expect(s.alerts[0]!.kind).toBe("mesa_quitada");
  });

  it("dois clientes não pagam o mesmo item ao mesmo tempo", () => {
    let s = withTable1();
    const moqueca = s.lines.find((l) => l.table === 1 && l.menuId === "moqueca")!;
    s = run(s, {
      type: "startPayment",
      actor: "cliente",
      table: 1,
      payer: "A",
      method: "apple_pay",
      mode: { kind: "items", portions: { [moqueca.id]: 1 } },
      idempotencyKey: "a",
      at: T0,
    }).state;
    const b = apply(s, {
      type: "startPayment",
      actor: "cliente",
      table: 1,
      payer: "B",
      method: "pix",
      mode: { kind: "items", portions: { [moqueca.id]: 0.5 } },
      idempotencyKey: "b",
      at: T0,
    });
    expect(b.ok).toBe(false);
  });

  it("pagamento que falha libera os itens de novo", () => {
    let s = withTable1();
    const r = run(s, {
      type: "startPayment",
      actor: "cliente",
      table: 1,
      payer: "A",
      method: "pix",
      mode: { kind: "rest" },
      idempotencyKey: "a",
      at: T0,
    });
    expect(remainingCents(r.state, 1)).toBe(0);
    s = run(r.state, {
      type: "providerEvent",
      eventId: "e1",
      providerRef: r.state.payments.at(-1)!.providerRef!,
      status: "failed",
      amountCents: 0,
      at: T0,
    }).state;
    expect(remainingCents(s, 1)).toBe(tableView(s, 1).bill);
  });

  it("webhook repetido não aprova duas vezes nem duplica o extrato", () => {
    let s = withTable1();
    const r = run(s, {
      type: "startPayment",
      actor: "cliente",
      table: 1,
      payer: "A",
      method: "pix",
      mode: { kind: "rest" },
      tipPercent: 5,
      idempotencyKey: "a",
      at: T0,
    });
    const p = r.state.payments.at(-1)!;
    const evt: Action = {
      type: "providerEvent",
      eventId: "dup",
      providerRef: p.providerRef!,
      status: "paid",
      amountCents: totalCents(p),
      at: T0,
    };
    s = run(run(r.state, evt).state, evt).state;
    expect(s.provider.filter((x) => x.ref === p.providerRef)).toHaveLength(1);
    expect(s.alerts.filter((a) => a.table === 1 && a.kind === "mesa_quitada")).toHaveLength(1);
  });

  it("o mesmo clique em pagar duas vezes gera um só pagamento", () => {
    const s = withTable1();
    const a: Action = {
      type: "startPayment",
      actor: "cliente",
      table: 1,
      payer: "A",
      method: "pix",
      mode: { kind: "equal", parts: 1, people: 2 },
      idempotencyKey: "same",
      at: T0,
    };
    const r1 = run(s, a);
    const r2 = run(r1.state, a);
    expect(r2.id).toBe(r1.id);
    expect(r2.state.payments).toHaveLength(r1.state.payments.length);
  });

  it("taxa de serviço e gorjeta são separadas do subtotal", () => {
    const s = withTable1();
    const r = run(s, {
      type: "startPayment",
      actor: "cliente",
      table: 1,
      payer: "A",
      method: "google_pay",
      mode: { kind: "rest" },
      tipPercent: 8,
      idempotencyKey: "a",
      at: T0,
    });
    const p = r.state.payments.at(-1)!;
    expect(p.subtotalCents).toBe(17800);
    expect(p.serviceCents).toBe(1780);
    expect(p.tipCents).toBe(1424);
  });

  it("gorjeta: só 3, 5 ou 8%, e outro valor entre R$ 2,00 e o valor pago", () => {
    const s = withTable1();
    const base = {
      type: "startPayment",
      actor: "cliente",
      table: 1,
      payer: "A",
      method: "pix",
      mode: { kind: "rest" },
      at: T0,
    } as const;
    expect(apply(s, { ...base, tipPercent: 15, idempotencyKey: "p15" }).ok).toBe(false);
    expect(apply(s, { ...base, tipCents: 199, idempotencyKey: "c199" }).ok).toBe(false);
    expect(apply(s, { ...base, tipCents: 17800 + 1780 + 1, idempotencyKey: "cmax" }).ok).toBe(
      false,
    );
    expect(apply(s, { ...base, tipCents: 200, idempotencyKey: "c200" }).ok).toBe(true);
    expect(apply(s, { ...base, tipCents: 17800 + 1780, idempotencyKey: "cok" }).ok).toBe(true);
  });

  it("pagar no estabelecimento espera a confirmação do garçom", () => {
    let s = withTable1();
    const r = run(s, {
      type: "startPayment",
      actor: "cliente",
      table: 1,
      payer: "A",
      method: "estabelecimento",
      mode: { kind: "rest" },
      idempotencyKey: "a",
      at: T0,
    });
    expect(r.state.alerts[0]!.kind).toBe("pagamento_no_local");
    expect(
      apply(r.state, { type: "confirmManual", actor: "cliente", paymentId: r.id!, at: T0 }).ok,
    ).toBe(false);
    s = run(r.state, { type: "confirmManual", actor: "garcom", paymentId: r.id!, at: T0 }).state;
    expect(tableView(s, 1).state).toBe("quitada");
  });
});

describe("avaliação, estorno e fechamento", () => {
  function paidTable() {
    const s = withTable1();
    const r = run(s, {
      type: "startPayment",
      actor: "cliente",
      table: 1,
      payer: "A",
      method: "pix",
      mode: { kind: "rest" },
      idempotencyKey: "a",
      at: T0,
    });
    return { s: pay(r.state, r.id!), id: r.id! };
  }

  it("nota baixa avisa garçom e gerente", () => {
    const { s, id } = paidTable();
    const after = run(s, {
      type: "rate",
      table: 1,
      paymentId: id,
      stars: 2,
      comment: "Demorou",
      at: T0,
    }).state;
    const kinds = after.alerts
      .filter((a) => a.kind === "nota_baixa")
      .map((a) => a.to)
      .sort();
    expect(kinds).toEqual(["garcom", "gerente"]);
    expect(
      apply(after, { type: "rate", table: 1, paymentId: id, stars: 5, comment: "", at: T0 }).ok,
    ).toBe(false);
  });

  it("garçom pede estorno, só o gerente aprova, e a conta não reabre", () => {
    const paid = paidTable();
    const id = paid.id;
    let s = paid.s;
    expect(apply(s, { type: "approveRefund", actor: "gerente", paymentId: id, at: T0 }).ok).toBe(
      false,
    );
    s = run(s, {
      type: "requestRefund",
      actor: "garcom",
      actorId: "g-ana",
      paymentId: id,
      reason: "Cobrança em duplicidade",
      at: T0,
    }).state;
    expect(apply(s, { type: "approveRefund", actor: "garcom", paymentId: id, at: T0 }).ok).toBe(
      false,
    );
    s = run(s, { type: "approveRefund", actor: "gerente", paymentId: id, at: T0 }).state;
    expect(s.payments.find((p) => p.id === id)!.status).toBe("estornado");
    expect(remainingCents(s, 1)).toBe(0);
    expect(dashboard(s).refunds).toBeGreaterThan(0);
  });

  it("só fecha a mesa quitada, e depois ela volta livre", () => {
    const open = withTable1();
    expect(apply(open, { type: "closeTable", actor: "garcom", table: 1, at: T0 }).ok).toBe(false);
    const { s } = paidTable();
    const closed = run(s, { type: "closeTable", actor: "garcom", table: 1, at: T0 }).state;
    expect(tableView(closed, 1).state).toBe("livre");
    expect(tableView(closed, 1).lines).toHaveLength(0);
  });
});

describe("conciliação", () => {
  it("casa pagamentos com o extrato e aponta divergências", () => {
    let s = withTable1();
    const r = run(s, {
      type: "startPayment",
      actor: "cliente",
      table: 1,
      payer: "A",
      method: "pix",
      mode: { kind: "equal", parts: 1, people: 2 },
      idempotencyKey: "a",
      at: T0,
    });
    const p = r.state.payments.at(-1)!;
    // Provedor informa valor diferente: não dá baixa sozinho.
    s = run(r.state, {
      type: "providerEvent",
      eventId: "x",
      providerRef: p.providerRef!,
      status: "paid",
      amountCents: totalCents(p) - 100,
      at: T0,
    }).state;
    expect(s.payments.find((x) => x.id === p.id)!.status).toBe("pendente");
    s = run(s, { type: "injectProviderDivergence", at: T0 }).state;
    const { summary } = reconcile(s);
    expect(summary.conciliado).toBe(1); // a mesa 3 do estado inicial
    expect(summary.valor_divergente).toBe(1);
    expect(summary.sem_registro_tipe).toBe(1);
  });
});

describe("permissões", () => {
  it("cada perfil só faz o que lhe cabe", () => {
    expect(can("cliente", "refund.approve")).toBe(false);
    expect(can("cozinha", "payment.start")).toBe(false);
    expect(can("tipe", "order.place")).toBe(false);
    expect(can("gerente", "refund.approve")).toBe(true);
    expect(can("garcom", "payment.confirm_manual")).toBe(true);
  });
});
