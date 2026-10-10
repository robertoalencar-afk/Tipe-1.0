import * as React from "react";
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props { audience?: "owner" | "waiter"; waiter?: string; restaurant?: string; keyMasked?: string; until?: string }

function PixChangeNotice({ audience = "owner", waiter = "", restaurant = "", keyMasked = "", until = "" }: Props) {
  const owner = audience === "owner";
  return (
    <Html lang="pt-BR"><Head /><Preview>Nova chave Pix cadastrada</Preview>
      <Body style={{ backgroundColor: "#ffffff", fontFamily: "Arial, sans-serif", margin: 0 }}>
        <Container style={{ maxWidth: 560, margin: "0 auto", padding: "32px 24px" }}>
          <Text style={{ color: "#14c8b4", fontSize: 12, fontWeight: 700, letterSpacing: 2, margin: 0 }}>TIPE</Text>
          <Heading style={{ color: "#0b1b2b", fontSize: 22, margin: "8px 0 20px" }}>Nova chave Pix cadastrada</Heading>
          <Section style={{ border: "1px solid #e6ecef", borderRadius: 12, padding: "8px 20px" }}>
            <Text style={{ fontSize: 14, color: "#0b1b2b" }}>
              {owner ? `${waiter} cadastrou uma nova chave Pix para receber os repasses no ${restaurant}.` : `Sua nova chave Pix foi cadastrada no ${restaurant}.`}
            </Text>
            <Text style={{ fontSize: 14, color: "#0b1b2b" }}><strong>Chave:</strong> {keyMasked}</Text>
            <Text style={{ fontSize: 14, color: "#0b1b2b" }}>
              {owner
                ? `Por segurança, ela só passa a valer em ${until}. Você pode aprovar antes ou recusar no painel do restaurante, em Equipe.`
                : `Por segurança, ela só passa a valer em ${until}, a menos que o restaurante aprove antes. Até lá, os saques ficam pausados.`}
            </Text>
          </Section>
          <Text style={{ fontSize: 12, color: "#5b6b7a", marginTop: 16 }}>Não reconhece essa alteração? Fale com o restaurante ou com a TIPE pelo WhatsApp +55 85 98559-1062.</Text>
        </Container>
      </Body>
    </Html>
  );
}

export const template = {
  component: PixChangeNotice,
  subject: "Nova chave Pix cadastrada na TIPE",
  displayName: "Aviso de troca de chave Pix",
  previewData: { audience: "owner", waiter: "Carlos", restaurant: "Maré Alta", keyMasked: "****@gmail.com", until: "12/10/2026 10:00" },
} satisfies TemplateEntry;
