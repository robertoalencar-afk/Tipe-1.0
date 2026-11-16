import * as React from "react";
import { Text } from "@react-email/components";
import { Moldura, txt } from "./moldura";
import type { TemplateEntry } from "./registry";

// Tipe Reserva: confirmação, cancelamento e mesa livre da lista de espera. O texto vem pronto de
// src/lib/tipe/guest/mensagens.ts, o mesmo do WhatsApp.
interface Props { assunto?: string; corpo?: string; restaurante?: string }

function ReservaAviso({ assunto = "", corpo = "", restaurante = "" }: Props) {
  return (
    <Moldura previa={corpo} titulo={assunto} lebre="feliz" rodape={`Aviso automático do Tipe Reserva${restaurante ? ` · ${restaurante}` : ""}.`}>
      <Text style={txt}>{corpo}</Text>
    </Moldura>
  );
}

export const template = {
  component: ReservaAviso,
  subject: (d: Record<string, any>) => String(d["assunto"] || "Sua reserva no Tipe"),
  displayName: "Tipe Reserva · aviso ao cliente",
  previewData: { assunto: "Reserva confirmada no Maré Alta", corpo: "Oi, Ana! Sua mesa no Maré Alta está confirmada: sexta, 14/11, 20:00, 4 pessoas. Código K7Q2.", restaurante: "Maré Alta" },
} satisfies TemplateEntry;
