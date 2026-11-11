import * as React from "react";
import { Section, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { Moldura, cores, txt } from "./moldura";

interface Props { restaurantName?: string; contactName?: string; tables?: number; pdv?: string }

function LeadConfirmation({ restaurantName = "seu restaurante", contactName, tables, pdv }: Props) {
  const first = contactName?.split(" ")[0];
  const steps = [
    ["1", "A gente estuda a sua casa", "Olhamos o salão, as mesas e o sistema que você já usa."],
    ["2", "Demonstração do seu jeito", "Mostramos a Tipe rodando com o cardápio e o ritmo do seu restaurante."],
    ["3", "Implantação acompanhada", "Cadastramos as mesas, entregamos os QR Codes e treinamos a equipe."],
  ];
  return (
    <Moldura
      previa={`Pedido recebido! A Tipe vai mostrar tudo funcionando em ${restaurantName}.`}
      titulo={first ? `${first}, pedido recebido!` : "Pedido recebido!"}
      rodape="Você recebeu este e-mail porque pediu uma demonstração da Tipe."
      aviso={<><strong style={{ color: cores.tinta }}>Enquanto isso:</strong> responda este e-mail com o melhor dia e horário para conversar. A lebre agenda rapidinho.</>}
    >
      <Text style={txt}>
        A demonstração de <strong style={{ color: cores.tinta }}>{restaurantName}</strong> já está na nossa mesa. Logo, logo alguém do time chama você para combinar o melhor horário. Sem robô, sem enrolação.
      </Text>
      {(tables || pdv) && (
        <Section style={{ border: `1px solid ${cores.borda}`, borderRadius: 16, padding: "4px 18px", margin: "4px 0 8px" }}>
          {tables ? <Text style={{ fontSize: 14, color: cores.tinta, margin: "10px 0" }}>Mesas: <strong>{tables}</strong></Text> : null}
          {pdv ? <Text style={{ fontSize: 14, color: cores.tinta, margin: "10px 0" }}>Sistema (PDV): <strong>{pdv}</strong></Text> : null}
        </Section>
      )}
      <Text style={{ ...txt, color: cores.tinta, fontWeight: 600, margin: "20px 0 4px" }}>Como vai ser</Text>
      {steps.map(([n, t, d]) => (
        <Section key={n} style={{ borderLeft: `3px solid ${cores.turquesa}`, paddingLeft: 14, margin: "12px 0" }}>
          <Text style={{ color: cores.tinta, fontSize: 15, fontWeight: 600, margin: 0 }}>{n}. {t}</Text>
          <Text style={{ color: cores.cinza, fontSize: 14, lineHeight: "21px", margin: "2px 0 0" }}>{d}</Text>
        </Section>
      ))}
    </Moldura>
  );
}

export const template = {
  component: LeadConfirmation,
  subject: (d: Record<string, any>) => `Demonstração da Tipe para ${d["restaurantName"] ?? "seu restaurante"}: pedido recebido!`,
  displayName: "Confirmação de pedido de demonstração",
  previewData: { restaurantName: "Maré Alta", contactName: "Ana Souza", tables: 20, pdv: "Sistema próprio" },
} satisfies TemplateEntry;
