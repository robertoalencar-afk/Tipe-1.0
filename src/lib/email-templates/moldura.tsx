import * as React from "react";
import { Body, Container, Head, Heading, Html, Img, Preview, Section, Text } from "@react-email/components";

// Moldura única dos e-mails da Tipe enviados pelo site (mesmo visual dos e-mails de conta do Supabase).
export const cores = { tinta: "#071727", cinza: "#575b5f", turquesa: "#10d1b4", menta: "#d3f8ee", borda: "#e5e7eb", creme: "#fff4e8" };
const IMG = "https://tipe.digital/email";
const fonte = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export const txt = { fontSize: 16, lineHeight: "26px", color: cores.cinza, margin: "0 0 16px" } as const;

interface Props {
  previa: string;
  titulo: string;
  lebre?: "feliz" | "pensando";
  escuro?: boolean;
  rodape: string;
  aviso?: React.ReactNode;
  children: React.ReactNode;
}

export function Moldura({ previa, titulo, lebre = "feliz", escuro, rodape, aviso, children }: Props) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>{previa}</Preview>
      <Body style={{ backgroundColor: "#ffffff", fontFamily: fonte, margin: 0 }}>
        <Container style={{ maxWidth: 560, margin: "0 auto", padding: "32px 16px" }}>
          <Img src={`${IMG}/tipe-logo-email.png`} alt="Tipe" width="108" style={{ margin: "0 auto 20px", width: 108, height: "auto" }} />
          <Section style={{ border: `1px solid ${cores.borda}`, borderRadius: 24, overflow: "hidden" }}>
            <Section style={{ backgroundColor: escuro ? cores.tinta : cores.menta, padding: "28px 24px 0", textAlign: "center" }}>
              <Img src={`${IMG}/lebre-${lebre}.png`} alt="A lebre da Tipe" width="150" style={{ margin: "0 auto", width: 150, height: "auto" }} />
            </Section>
            <Section style={{ padding: "32px 32px 8px" }}>
              <Heading style={{ color: cores.tinta, fontSize: 26, lineHeight: "31px", fontWeight: 600, margin: "0 0 12px" }}>{titulo}</Heading>
              {children}
            </Section>
            {aviso ? (
              <Section style={{ padding: "8px 32px 32px" }}>
                <Section style={{ backgroundColor: "#f3f4f6", borderRadius: 16, padding: "4px 18px" }}>
                  <Text style={{ fontSize: 14, lineHeight: "22px", color: cores.cinza }}>{aviso}</Text>
                </Section>
              </Section>
            ) : <Section style={{ height: 24 }} />}
          </Section>
          <Text style={{ textAlign: "center", fontSize: 12, lineHeight: "19px", color: "#8a8f96", margin: "24px 0 0" }}>
            Tipe · pagamentos e atendimento para restaurantes<br />
            {rodape}<br />
            Dúvidas? contato@tipe.digital · Instagram @tipe.digital
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
