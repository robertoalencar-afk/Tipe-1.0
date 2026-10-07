import * as React from "react";
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props { protocol?: string; requestType?: string; holder?: string; name?: string; email?: string; details?: string }

function PrivacyRequestNotification({ protocol = "-", requestType = "-", holder = "-", name = "-", email = "-", details }: Props) {
  const rows: [string, string][] = [["Protocolo", protocol], ["Pedido", requestType], ["Perfil", holder], ["Nome", name], ["E-mail", email]];
  return (
    <Html lang="pt-BR"><Head /><Preview>Nova solicitação LGPD {protocol}</Preview>
      <Body style={{ backgroundColor: "#ffffff", fontFamily: "Arial, sans-serif", margin: 0 }}>
        <Container style={{ maxWidth: 560, margin: "0 auto", padding: "32px 24px" }}>
          <Text style={{ color: "#14c8b4", fontSize: 12, fontWeight: 700, letterSpacing: 2, margin: 0 }}>CENTRAL JURÍDICA</Text>
          <Heading style={{ color: "#0b1b2b", fontSize: 22, margin: "8px 0 20px" }}>Nova solicitação de titular</Heading>
          <Section style={{ border: "1px solid #e6ecef", borderRadius: 12, padding: "8px 20px" }}>
            {rows.map(([k, v]) => <Text key={k} style={{ fontSize: 14, color: "#0b1b2b", margin: "10px 0" }}><strong>{k}:</strong> {v}</Text>)}
            {details && <Text style={{ fontSize: 14, color: "#0b1b2b", margin: "10px 0", whiteSpace: "pre-wrap" }}><strong>Detalhes:</strong> {details}</Text>}
          </Section>
          <Text style={{ fontSize: 12, color: "#5b6b7a", marginTop: 16 }}>Prazo de resposta: 15 dias. Detalhes completos no backoffice.</Text>
        </Container>
      </Body>
    </Html>
  );
}

export const template = {
  component: PrivacyRequestNotification,
  subject: (d: Record<string, any>) => `Solicitação LGPD ${d["protocol"] ?? ""}`.trim(),
  displayName: "Aviso interno de solicitação LGPD",
  to: "contato@tipe.digital",
  previewData: { protocol: "TIPE-1A2B3C4D", requestType: "Acessar meus dados", holder: "Cliente de restaurante", name: "Ana Souza", email: "ana@exemplo.com", details: "Quero saber quais dados vocês têm." },
} satisfies TemplateEntry;
