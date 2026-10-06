import * as React from "react";
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props { restaurantName?: string; contactName?: string; email?: string; phone?: string; tables?: number; pdv?: string }

function LeadNotification({ restaurantName = "Restaurante", contactName = "-", email = "-", phone, tables, pdv = "-" }: Props) {
  const rows: [string, string][] = [
    ["Restaurante", restaurantName], ["Contato", contactName], ["E-mail", email],
    ["WhatsApp", phone || "Não informado"], ["Mesas", tables ? String(tables) : "-"], ["PDV", pdv],
  ];
  return (
    <Html lang="pt-BR"><Head /><Preview>Novo cadastro na lista de espera: {restaurantName}</Preview>
      <Body style={{ backgroundColor: "#ffffff", fontFamily: "Arial, sans-serif", margin: 0 }}>
        <Container style={{ maxWidth: 560, margin: "0 auto", padding: "32px 24px" }}>
          <Text style={{ color: "#14c8b4", fontSize: 12, fontWeight: 700, letterSpacing: 2, margin: 0 }}>LISTA DE ESPERA</Text>
          <Heading style={{ color: "#0b1b2b", fontSize: 22, margin: "8px 0 20px" }}>Novo restaurante interessado</Heading>
          <Section style={{ border: "1px solid #e6ecef", borderRadius: 12, padding: "8px 20px" }}>
            {rows.map(([k, v]) => (
              <Text key={k} style={{ fontSize: 14, color: "#0b1b2b", margin: "10px 0" }}><strong>{k}:</strong> {v}</Text>
            ))}
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export const template = {
  component: LeadNotification,
  subject: (d: Record<string, any>) => `Lista de espera: ${d["restaurantName"] ?? "novo restaurante"}`,
  displayName: "Aviso interno de lista de espera",
  to: "roberto@tipe.digital",
  previewData: { restaurantName: "Maré Alta", contactName: "Ana Souza", email: "ana@marealta.com", phone: "(85) 99999-0000", tables: 20, pdv: "Saipos" },
} satisfies TemplateEntry;
