/**
 * Simulador do Tipe Reserva na landing (/produtos/guest#simulador). Usa as MESMAS telas da
 * demonstração /guest-demo (vitrine do cliente e gestão de reservas), para o simulador nunca
 * ficar diferente do produto. Restaurantes fictícios; nada é reservado nem cobrado.
 */
import { useState } from "react";
import { cn } from "@/lib/utils";
import { VitrineCliente } from "@/components/tipe/guest-demo/VitrineCliente";
import { GuestManagerDemo } from "@/components/tipe/guest-demo/GuestManagerDemo";
import { BotaoSecundario, Secao, Titulo } from "../Site";

export function SimuladorReserva() {
  const [lado, setLado] = useState<"cliente" | "restaurante">("cliente");
  return (
    <Secao id="simulador" ariaLabel="Simulador do Tipe Reserva">
      <div className="mx-auto max-w-6xl px-5">
        <Titulo
          rotulo="Simulador"
          titulo="Teste o Tipe Reserva agora."
          texto="As mesmas telas do produto, com restaurantes fictícios de Fortaleza. Reserve como cliente e veja a reserva chegar no salão. Nada é reservado nem cobrado."
        />
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <div
            role="tablist"
            aria-label="Lado do simulador"
            className="flex rounded-full border border-foreground/15 p-1"
          >
            {(["cliente", "restaurante"] as const).map((l) => (
              <button
                key={l}
                type="button"
                role="tab"
                aria-selected={lado === l}
                onClick={() => setLado(l)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  lado === l ? "bg-[#0FC9BD] text-[#021E34]" : "hover:bg-foreground/5",
                )}
              >
                {l === "cliente" ? "Sou cliente" : "Sou restaurante"}
              </button>
            ))}
          </div>
          <a href="/guest-demo" className="ml-auto text-sm underline underline-offset-4">
            Abrir em tela cheia
          </a>
        </div>
        {/* transform: o que é "fixed" lá dentro fica preso à moldura, não à página. */}
        <div className="mt-4 h-[min(82vh,820px)] overflow-y-auto overscroll-contain rounded-[1.6rem] border border-foreground/15 [transform:translateZ(0)]">
          {lado === "cliente" ? <VitrineCliente /> : <GuestManagerDemo />}
        </div>
        <div className="mt-5">
          <BotaoSecundario href="/guest-demo">Mostrar para um cliente</BotaoSecundario>
        </div>
      </div>
    </Secao>
  );
}
