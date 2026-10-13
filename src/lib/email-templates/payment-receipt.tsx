import * as React from "react";
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import type { ReceiptData } from "../tipe/receipt";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const row = { fontSize: 14, color: "#0b1b2b", margin: "6px 0" } as const;

function PaymentReceipt(r: Partial<ReceiptData>) {
  const lines = r.lines ?? [];
  return (
    <Html lang="pt-BR"><Head /><Preview>{`Comprovante: ${brl(r.total ?? 0)} em ${r.restaurant ?? ""}`}</Preview>
      <Body style={{ backgroundColor: "#ffffff", fontFamily: "Arial, sans-serif", margin: 0 }}>
        <Container style={{ maxWidth: 560, margin: "0 auto", padding: "32px 24px" }}>
          <Text style={{ color: "#14c8b4", fontSize: 12, fontWeight: 700, letterSpacing: 2, margin: 0 }}>TIPE</Text>
          <Heading style={{ color: "#0b1b2b", fontSize: 22, margin: "8px 0 4px" }}>Comprovante de pagamento</Heading>
          <Text style={{ fontSize: 14, color: "#5b6b7a", margin: "0 0 20px" }}>{r.restaurant} · Mesa {r.table} · {r.paidAt}</Text>
          <Section style={{ border: "1px solid #e6ecef", borderRadius: 12, padding: "12px 20px" }}>
            <Text style={{ ...row, fontWeight: 700 }}>{r.customer}</Text>
            {lines.map((l, i) => <Text key={i} style={row}>{l.portion} × {l.name}</Text>)}
            {(r.serviceFee ?? 0) > 0 && <Text style={row}>Taxa de serviço: {brl(r.serviceFee ?? 0)}</Text>}
            <Text style={{ ...row, fontSize: 18, fontWeight: 700, marginTop: 12 }}>Total pago: {brl(r.total ?? 0)}</Text>
            <Text style={{ ...row, color: "#5b6b7a" }}>Forma de pagamento: {r.method} · Referência {r.reference}</Text>
          </Section>
          <Text style={{ fontSize: 12, color: "#5b6b7a", marginTop: 16 }}>Este comprovante registra o pagamento feito pela TIPE. Ele não substitui o documento fiscal do restaurante; se precisar de nota, peça no caixa.</Text>
          <Text style={{ fontSize: 12, color: "#5b6b7a" }}>Você recebeu este e-mail porque pediu o comprovante na mesa. Seu e-mail não fica guardado na TIPE.</Text>
        </Container>
      </Body>
    </Html>
  );
}

export const template = {
  component: PaymentReceipt,
  subject: (d: Record<string, any>) => `Comprovante TIPE: ${brl(Number(d["total"] ?? 0))} em ${String(d["restaurant"] ?? "")}`,
  displayName: "Comprovante de pagamento ao cliente",
  previewData: { restaurant: "Maré Alta", table: "12", customer: "Ana Lima", paidAt: "13/10/2026 20:41", method: "Pix", lines: [{ name: "Moqueca", portion: "½", amount: null }, { name: "Suco", portion: "1", amount: null }], serviceFee: 6.1, total: 67.1, reference: "8F2A91C0" },
} satisfies TemplateEntry;
