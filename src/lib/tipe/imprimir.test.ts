import { describe, expect, it } from "vitest";
import { htmlPreConta, htmlTicket, linkMesa, totaisPreConta } from "./imprimir";

describe("impressão", () => {
  it("soma subtotal, serviço e total em centavos", () => {
    const t = totaisPreConta([{ qty: 2, nome: "A", unit: 10.1 }, { qty: 1, nome: "B", unit: 0.35 }], 0.1);
    expect(t).toEqual({ subtotal: 20.55, servico: 2.06, total: 22.61 });
  });
  it("sem taxa não mostra linha de serviço", () => {
    const h = htmlPreConta({ restaurante: "X", mesa: "4", hora: new Date(), linhas: [{ qty: 1, nome: "Suco", unit: 12 }], taxa: 0 });
    expect(h).not.toContain("Serviço");
    expect(h).toContain("Sem valor fiscal");
  });
  it("escapa texto do pedido no ticket", () => {
    const h = htmlTicket({ restaurante: "R", titulo: "Mesa 1", setor: "Cozinha", hora: new Date(), itens: [{ qty: 1, nome: "<b>x</b>", obs: "sem \"cebola\"" }] });
    expect(h).not.toContain("<b>x</b>");
    expect(h).toContain("&lt;b&gt;");
    expect(h).toContain("Obs.: sem &quot;cebola&quot;");
  });
  it("pré-conta leva o QR da conta da mesa para pagar pelo Tipe Pay", () => {
    const h = htmlPreConta({ restaurante: "X", mesa: "4", hora: new Date(), linhas: [{ qty: 1, nome: "Suco", unit: 12 }], taxa: 0.1, qrSvg: "<svg></svg>" });
    expect(h).toContain("<svg></svg>");
    expect(h).toContain("Tipe Pay");
  });
  it("link da mesa usa o domínio público fora de preview", () => {
    expect(linkMesa("bistro", "m4", "tok", "http://localhost:5173")).toBe("https://tipe.digital/bistro/m4?t=tok");
    expect(linkMesa("bistro", "m4", "tok", "https://tipe.digital")).toBe("https://tipe.digital/bistro/m4?t=tok");
  });
});
