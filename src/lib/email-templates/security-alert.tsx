import * as React from "react";
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props { title?: string; detail?: string; count?: number; at?: string }

function SecurityAlert({ title = "Alerta de segurança", detail = "", count = 1, at = "" }: Props) {
  return (
    <Html lang="pt-BR"><Head /><Preview>{title}</Preview>
      <Body style={{ backgroundColor: "#ffffff", fontFamily: "Arial, sans-serif", margin: 0 }}>
        <Container style={{ maxWidth: 560, margin: "0 auto", padding: "32px 24px" }}>
          <Text style={{ color: "#14c8b4", fontSize: 12, fontWeight: 700, letterSpacing: 2, margin: 0 }}>SEGURANÇA TIPE</Text>
          <Heading style={{ color: "#0b1b2b", fontSize: 22, margin: "8px 0 20px" }}>{title}</Heading>
          <Section style={{ border: "1px solid #e6ecef", borderRadius: 12, padding: "8px 20px" }}>
            <Text style={{ fontSize: 14, color: "#0b1b2b", whiteSpace: "pre-wrap" }}>{detail}</Text>
            {count > 1 && <Text style={{ fontSize: 14, color: "#0b1b2b" }}><strong>Ocorrências agrupadas:</strong> {count}</Text>}
            {at && <Text style={{ fontSize: 12, color: "#5b6b7a" }}>{at}</Text>}
          </Section>
          <Text style={{ fontSize: 12, color: "#5b6b7a", marginTop: 16 }}>Detalhes no histórico de segurança do backoffice.</Text>
        </Container>
      </Body>
    </Html>
  );
}

export const template = {
  component: SecurityAlert,
  subject: (d: Record<string, any>) => `[TIPE] ${d["title"] ?? "Alerta de segurança"}`,
  displayName: "Alerta de segurança para o founder",
  to: "roberto@tipe.digital",
  previewData: { title: "Troca de chave Pix", detail: "Um garçom do Restaurante X cadastrou nova chave.", count: 3, at: "10/10/2026 10:00" },
} satisfies TemplateEntry;
