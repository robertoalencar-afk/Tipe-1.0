import * as React from "react";
import { Section, Text } from "@react-email/components";
import { Moldura, cores, txt } from "./moldura";
import type { TemplateEntry } from "./registry";

interface Props { audience?: "owner" | "waiter"; waiter?: string; restaurant?: string; keyMasked?: string; until?: string }

function PixChangeNotice({ audience = "owner", waiter = "", restaurant = "", keyMasked = "", until = "" }: Props) {
  const owner = audience === "owner";
  return (
    <Moldura
      previa={owner ? `${waiter} cadastrou uma chave Pix nova no ${restaurant}.` : `Sua chave Pix nova no ${restaurant} está em análise.`}
      titulo={owner ? "Chave Pix nova na equipe" : "Chave Pix nova a caminho"}
      lebre="pensando"
      escuro
      rodape="Aviso automático de segurança da Tipe."
      aviso={<><strong style={{ color: cores.tinta }}>Não reconhece essa alteração?</strong> Fale com o restaurante ou com a Tipe pelo WhatsApp +55 85 98559-1062.</>}
    >
      <Text style={txt}>
        {owner ? `${waiter} cadastrou uma chave Pix nova para receber os repasses no ${restaurant}.` : `Sua chave Pix nova foi cadastrada no ${restaurant}. Suas gorjetas vão chegar direitinho.`}
      </Text>
      <Section style={{ border: `1px solid ${cores.borda}`, borderRadius: 16, padding: "4px 18px" }}>
        <Text style={{ fontSize: 15, color: cores.tinta }}>Chave: <strong>{keyMasked}</strong></Text>
      </Section>
      <Text style={{ ...txt, marginTop: 16 }}>
        {owner
          ? `Por segurança, ela só passa a valer em ${until}. Quer agilizar? Aprove ou recuse no painel do restaurante, em Equipe.`
          : `Por segurança, ela só passa a valer em ${until}, a menos que o restaurante aprove antes. Até lá, os saques ficam pausados.`}
      </Text>
    </Moldura>
  );
}

export const template = {
  component: PixChangeNotice,
  subject: "Chave Pix nova cadastrada na Tipe",
  displayName: "Aviso de troca de chave Pix",
  previewData: { audience: "owner", waiter: "Carlos", restaurant: "Maré Alta", keyMasked: "****@gmail.com", until: "12/10/2026 10:00" },
} satisfies TemplateEntry;
