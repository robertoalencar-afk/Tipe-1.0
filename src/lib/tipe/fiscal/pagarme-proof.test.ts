import { describe, expect, it, vi } from "vitest";
import { consultarComprovacaoPagarme, extrairComprovacaoPagarme } from "./pagarme-proof.server";
const expected = {
  paymentId: "10000000-0000-0000-0000-000000000001",
  orderId: "or_fixture",
  amountCents: 2000,
  acquirerCnpj: "12345678000195",
};
function fixture() {
  return {
    id: "or_fixture",
    status: "paid",
    amount: 2000,
    customer: { document: "dado-nao-retornado" },
    charges: [
      {
        status: "paid",
        amount: 2000,
        paid_amount: 2000,
        refunded_amount: 0,
        last_transaction: {
          transaction_type: "credit_card",
          amount: 2000,
          status: "captured",
          success: true,
          acquirer_auth_code: "AUTH-fixture",
          card: { brand: "Visa", last_four_digits: "9999", holder_name: "nao-retornar" },
        },
      },
    ],
  };
}
describe("comprovação fiscal no adquirente", () => {
  it("extrai somente identificação e autorização necessárias", () => {
    const proof = extrairComprovacaoPagarme(fixture(), expected);
    expect(proof).toEqual({
      ...expected,
      captured: true,
      type: "credit",
      authorization: "AUTH-fixture",
      brand: "01",
    });
    expect(JSON.stringify(proof)).not.toContain("9999");
    expect(JSON.stringify(proof)).not.toContain("nao-retornar");
  });
  it("recusa valor divergente, estorno, pedido diferente e mera autorização sem captura", () => {
    const wrongAmount = fixture();
    wrongAmount.charges[0]!.paid_amount = 1999;
    expect(() => extrairComprovacaoPagarme(wrongAmount, expected)).toThrow("valores");
    const refunded = fixture();
    refunded.charges[0]!.refunded_amount = 1;
    expect(() => extrairComprovacaoPagarme(refunded, expected)).toThrow("valores");
    const authorized = fixture();
    authorized.charges[0]!.last_transaction.status = "authorized_pending_capture";
    expect(() => extrairComprovacaoPagarme(authorized, expected)).toThrow("liquidada");
    expect(() => extrairComprovacaoPagarme(fixture(), { ...expected, orderId: "outro" })).toThrow(
      "valores",
    );
  });
  it("não substitui autorização ausente pelo ID do pedido ou NSU", () => {
    const f = fixture();
    f.charges[0]!.last_transaction.acquirer_auth_code = "";
    expect(() => extrairComprovacaoPagarme(f, expected)).toThrow("identificadores");
  });
  it("usa o endToEndId do Pix efetivamente pago", () => {
    const f = fixture();
    Object.assign(f.charges[0]!.last_transaction, {
      transaction_type: "pix",
      status: "paid",
      end_to_end_id: "E-fixture-real-do-provedor",
    });
    const p = extrairComprovacaoPagarme(f, expected);
    expect(p.type).toBe("pix");
    expect(p.authorization).toBe("E-fixture-real-do-provedor");
    expect(p.brand).toBeUndefined();
  });
  it("usa o código fiscal de Discover documentado pelo emissor", () => {
    const f = fixture();
    f.charges[0]!.last_transaction.card.brand = "Discover";
    expect(extrairComprovacaoPagarme(f, expected).brand).toBe("14");
  });
  it("consulta origem fixa sem redirecionar ou registrar corpo de erros", async () => {
    const request = vi.fn().mockResolvedValue(Response.json(fixture()));
    await consultarComprovacaoPagarme(expected, "chave-ficticia", request);
    expect(request).toHaveBeenCalledWith(
      "https://api.pagar.me/core/v5/orders/or_fixture",
      expect.objectContaining({ method: "GET", redirect: "error" }),
    );
    await expect(
      consultarComprovacaoPagarme(
        expected,
        "chave-ficticia",
        vi.fn().mockRejectedValue(new Error("segredo")),
      ),
    ).rejects.toThrow("A nota não foi enviada");
  });
  it("recusa caminho injetado antes de usar a credencial", async () => {
    const request = vi.fn();
    await expect(
      consultarComprovacaoPagarme(
        { ...expected, orderId: "../customers" },
        "chave-ficticia",
        request,
      ),
    ).rejects.toThrow("inválidos");
    expect(request).not.toHaveBeenCalled();
  });
});
