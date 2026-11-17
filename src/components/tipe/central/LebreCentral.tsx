import { lazy, Suspense, useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import lebreOla from "@/assets/lebre/avatar-ola.webp";
import { OPEN_LEBRE } from "@/lib/tipe/mascot-preference";
import type { Fala } from "@/components/tipe/LebreMascote";
import { Assistente } from "./Inteligencia";

const LebreMascote = lazy(() =>
  import("@/components/tipe/LebreMascote").then((m) => ({ default: m.LebreMascote })),
);

/** Falas da Lebre na Central: o que ela consulta para o fundador. */
const FALAS_CENTRAL: Fala[] = [
  {
    t: "Quem precisa de atenção hoje?",
    d: "Eu olho restaurantes, pagamentos e integrações.",
    pergunta: "Quais restaurantes precisam de atenção hoje?",
  },
  {
    t: "Tem lead esperando?",
    d: "Eu listo quem está sem resposta.",
    pergunta: "Quais leads estão sem resposta?",
  },
  {
    t: "Quer o resumo da semana?",
    d: "Números com fonte e período.",
    pergunta: "Resumo executivo da semana",
  },
  {
    t: "Como está a receita?",
    d: "Últimos 30 dias, direto do banco.",
    pergunta: "Qual a receita da Tipe nos últimos 30 dias?",
  },
  {
    t: "Quem está em implantação?",
    d: "Eu mostro em que etapa cada um está.",
    pergunta: "Quais clientes estão em implantação?",
  },
  {
    t: "Precisa de um e-mail?",
    d: "Eu escrevo o rascunho, você aprova.",
    pergunta: "Escreva um e-mail de boas-vindas para um restaurante novo",
  },
];

/** Lebre flutuante da Central, igual à da Gestão: abre de qualquer tela, com sugestões prontas. */
export function LebreCentral() {
  const [aberta, setAberta] = useState(false);
  const [pergunta, setPergunta] = useState<string | undefined>();
  useEffect(() => {
    const abrir = () => setAberta(true);
    window.addEventListener(OPEN_LEBRE, abrir);
    return () => window.removeEventListener(OPEN_LEBRE, abrir);
  }, []);
  return (
    <>
      {!aberta && (
        <Suspense fallback={null}>
          <LebreMascote
            slug="central"
            falas={FALAS_CENTRAL}
            onOpen={() => setAberta(true)}
            onPergunta={(t) => {
              setPergunta(t);
              setAberta(true);
            }}
          />
        </Suspense>
      )}
      <Sheet open={aberta} onOpenChange={setAberta}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-md [&>button]:text-white [&>button]:opacity-90"
        >
          <SheetHeader className="border-b border-border bg-ink px-4 py-3 text-left text-white">
            <SheetTitle className="flex items-center gap-2 text-white">
              <img src={lebreOla} alt="" className="size-8 rounded-full bg-white object-cover" />
              Lebre, a inteligência da Tipe
            </SheetTitle>
            <SheetDescription className="text-white/70">
              Consulta dados autorizados e entrega rascunhos. Nada sai sem a sua aprovação.
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1">
            <Assistente embutido inicial={pergunta} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
