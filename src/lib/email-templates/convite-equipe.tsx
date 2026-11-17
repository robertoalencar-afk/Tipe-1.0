import * as React from "react";
import { Button, Section, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { Moldura, cores, txt } from "./moldura";

interface Props { nome?: string; restaurante?: string; papel?: string; quemConvidou?: string; link?: string; dias?: number }

const FRASE: Record<string, string> = {
  Gerente: "Você vai ajudar a comandar o salão: mesas, equipe, cardápio e relatórios na palma da mão.",
  Caixa: "Você vai fechar contas num piscar de olhos: pagamentos, baixas e conferência do turno sem papelada.",
  Garçom: "Você vai receber os chamados das mesas, acompanhar os pedidos e ver suas gorjetas caindo.",
};

function ConviteEquipe({ nome, restaurante = "o restaurante", papel = "Garçom", quemConvidou, link = "https://tipe.digital", dias = 7 }: Props) {
  const primeiro = nome?.split(" ")[0];
  return (
    <Moldura
      previa={`${restaurante} quer você na equipe como ${papel}. Aceite em um toque.`}
      titulo={primeiro ? `${primeiro}, boas-vindas à equipe do ${restaurante}!` : `Boas-vindas à equipe do ${restaurante}!`}
      rodape="Você recebeu este e-mail porque um restaurante convidou este endereço para a equipe na Tipe."
      aviso={<><strong style={{ color: cores.tinta }}>Não esperava este convite?</strong> Pode ignorar: sem aceitar, nada acontece. A Tipe nunca pede sua senha por e-mail ou WhatsApp.</>}
    >
      <Text style={txt}>
        {quemConvidou ? <><strong style={{ color: cores.tinta }}>{quemConvidou}</strong> convidou você</> : "Você foi convidado"} para entrar na equipe do <strong style={{ color: cores.tinta }}>{restaurante}</strong> na Tipe como <strong style={{ color: cores.tinta }}>{papel}</strong>. {FRASE[papel] ?? ""}
      </Text>
      <Section style={{ textAlign: "center", margin: "8px 0 16px" }}>
        <Button href={link} style={{ backgroundColor: cores.turquesa, color: cores.tinta, fontSize: 16, fontWeight: 600, padding: "16px 28px", borderRadius: 999, textDecoration: "none", display: "block" }}>
          Aceitar convite
        </Button>
      </Section>
      <Text style={{ ...txt, fontSize: 14, lineHeight: "22px" }}>
        ⏱️ O convite vale por <strong style={{ color: cores.tinta }}>{dias} dias</strong> e funciona uma vez só. Entre ou crie sua conta com <strong style={{ color: cores.tinta }}>este mesmo e-mail</strong> para aceitar.
      </Text>
    </Moldura>
  );
}

export const template = {
  component: ConviteEquipe,
  subject: (d: Record<string, any>) => `${d["restaurante"] ?? "Um restaurante"} convidou você para a equipe na Tipe`,
  displayName: "Convite para a equipe do restaurante",
  previewData: { nome: "Carla Mendes", restaurante: "Bistrô Teste", papel: "Gerente", quemConvidou: "Roberto", link: "https://tipe.digital/convite/abc", dias: 7 },
} satisfies TemplateEntry;
