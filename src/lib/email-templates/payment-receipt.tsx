import * as React from "react";
import { Section, Text } from "@react-email/components";
import { Moldura, cores, txt } from "./moldura";
import type { TemplateEntry } from "./registry";
import type { ReceiptData } from "../tipe/receipt";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const row = { fontSize: 14, color: "#071727", margin: "6px 0" } as const;

function PaymentReceipt(r: Partial<ReceiptData>) {
  const lines = r.lines ?? [];
  const first = r.customer?.split(" ")[0];
  return (
    <Moldura
      previa={`Conta paga: ${brl(r.total ?? 0)} em ${r.restaurant ?? ""}. Obrigado pela visita!`}
      titulo={first ? `Conta paga, ${first}! Bom demais.` : "Conta paga! Bom demais."}
      rodape="Você recebeu este e-mail porque pediu o comprovante na mesa. Seu e-mail não fica guardado na Tipe."
      aviso="Este comprovante registra o pagamento feito pela Tipe. Ele não substitui o documento fiscal do restaurante; se precisar de nota, peça no caixa."
    >
      <Text style={txt}>{r.restaurant} · Mesa {r.table} · {r.paidAt}</Text>
      <Section style={{ border: `1px solid ${cores.borda}`, borderRadius: 16, padding: "8px 18px" }}>
        {lines.map((l, i) => <Text key={i} style={row}>{l.portion} × {l.name}</Text>)}
        {(r.serviceFee ?? 0) > 0 && <Text style={row}>Taxa de serviço: {brl(r.serviceFee ?? 0)}</Text>}
        <Text style={{ ...row, fontSize: 18, fontWeight: 700, marginTop: 12 }}>Total pago: {brl(r.total ?? 0)}</Text>
        <Text style={{ ...row, color: cores.cinza }}>{r.method} · Referência {r.reference}</Text>
      </Section>
      <Text style={{ ...txt, marginTop: 16 }}>Obrigado por pagar sem esperar. Até a próxima!</Text>
    </Moldura>
  );
}

export const template = {
  component: PaymentReceipt,
  subject: (d: Record<string, any>) => `Comprovante Tipe: ${brl(Number(d["total"] ?? 0))} em ${String(d["restaurant"] ?? "")}`,
  displayName: "Comprovante de pagamento ao cliente",
  previewData: { restaurant: "Maré Alta", table: "12", customer: "Ana Lima", paidAt: "13/10/2026 20:41", method: "Pix", lines: [{ name: "Moqueca", portion: "½", amount: null }, { name: "Suco", portion: "1", amount: null }], serviceFee: 6.1, total: 67.1, reference: "8F2A91C0" },
} satisfies TemplateEntry;
