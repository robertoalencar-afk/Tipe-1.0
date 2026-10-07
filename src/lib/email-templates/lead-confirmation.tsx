import * as React from "react";
import { Body, Container, Head, Heading, Html, Img, Preview, Section, Text, Hr } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import logo from "@/assets/logo.png.asset.json";

interface Props { restaurantName?: string; contactName?: string; tables?: number; pdv?: string }

const ink = "#0b1b2b";
const turquoise = "#14c8b4";

function LeadConfirmation({ restaurantName = "seu restaurante", contactName, tables, pdv }: Props) {
  const first = contactName?.split(" ")[0];
  const steps = [
    ["01", "Análise do perfil", "Avaliamos o salão e a integração com o seu PDV."],
    ["02", "Demonstração", "Mostramos a TIPE funcionando com a realidade do seu restaurante."],
    ["03", "Implantação acompanhada", "Cadastramos as mesas, preparamos os totens e treinamos a equipe."],
  ];
  return (
    <Html lang="pt-BR"><Head /><Preview>{restaurantName} está na lista de espera da TIPE</Preview>
      <Body style={{ backgroundColor: "#ffffff", fontFamily: "Arial, Helvetica, sans-serif", margin: 0 }}>
        <Container style={{ maxWidth: 560, margin: "0 auto", padding: "32px 24px" }}>
          <Img src={logo.url} alt="TIPE" height="36" style={{ height: 36, width: "auto" }} />
          <Section style={{ backgroundColor: ink, borderRadius: 20, padding: "32px 28px", marginTop: 24 }}>
            <Text style={{ color: turquoise, fontSize: 12, fontWeight: 700, letterSpacing: 2, margin: 0 }}>LISTA DE ESPERA CONFIRMADA</Text>
            <Heading style={{ color: "#ffffff", fontSize: 26, lineHeight: "32px", margin: "10px 0 8px" }}>{first ? `${first}, seu lugar está garantido.` : "Seu lugar está garantido."}</Heading>
            <Text style={{ color: "#c9d6df", fontSize: 15, lineHeight: "23px", margin: 0 }}>
              Recebemos o cadastro de <strong style={{ color: "#ffffff" }}>{restaurantName}</strong>. Quem está na lista recebe a demonstração primeiro e começa antes de todo mundo.
            </Text>
          </Section>

          {(tables || pdv) && (
            <Section style={{ border: "1px solid #e6ecef", borderRadius: 14, padding: "6px 20px", marginTop: 20 }}>
              {tables ? <Text style={{ fontSize: 14, color: ink, margin: "10px 0" }}>Mesas informadas: <strong>{tables}</strong></Text> : null}
              {pdv ? <Text style={{ fontSize: 14, color: ink, margin: "10px 0" }}>Sistema (PDV): <strong>{pdv}</strong></Text> : null}
            </Section>
          )}

          <Heading as="h2" style={{ color: ink, fontSize: 17, margin: "28px 0 8px" }}>Próximos passos</Heading>
          {steps.map(([n, t, d]) => (
            <Section key={n} style={{ borderLeft: `3px solid ${turquoise}`, paddingLeft: 14, margin: "14px 0" }}>
              <Text style={{ color: turquoise, fontSize: 12, fontWeight: 700, margin: 0 }}>{n}</Text>
              <Text style={{ color: ink, fontSize: 15, fontWeight: 700, margin: "2px 0" }}>{t}</Text>
              <Text style={{ color: "#5b6b78", fontSize: 14, lineHeight: "21px", margin: 0 }}>{d}</Text>
            </Section>
          ))}

          <Hr style={{ borderColor: "#e6ecef", margin: "28px 0 16px" }} />
          <Text style={{ color: ink, fontSize: 15, fontWeight: 700, margin: 0 }}>Pague. Sem esperar.</Text>
          <Text style={{ color: "#8796a3", fontSize: 12, lineHeight: "18px", margin: "6px 0 0" }}>
            Tipe - Tecnologia de Integração para Pagamento Eletrônico LTDA · CNPJ 69.486.521/0001-05<br />
            Dúvidas? Escreva para contato@tipe.digital · Instagram @tipe.digital
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export const template = {
  component: LeadConfirmation,
  subject: (d: Record<string, any>) => `${d["restaurantName"] ?? "Seu restaurante"} está na lista de espera da TIPE`,
  displayName: "Confirmação de lista de espera",
  previewData: { restaurantName: "Maré Alta", contactName: "Ana Souza", tables: 20, pdv: "Sistema próprio" },
} satisfies TemplateEntry;
