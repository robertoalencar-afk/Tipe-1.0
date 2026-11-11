import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { VitrineCliente } from "@/components/tipe/guest-demo/VitrineCliente";
import { GuestManagerDemo } from "@/components/tipe/guest-demo/GuestManagerDemo";

// Demonstração do Tipe Reserva (Projeto 4). Fora do índice, sem login, sem reserva real: tudo roda no
// navegador com restaurantes fictícios. O Guest segue "Em breve" para clientes e restaurantes.
export const Route = createFileRoute("/guest-demo")({
  validateSearch: z.object({ lado: z.enum(["cliente", "restaurante"]).optional() }),
  head: () => ({
    meta: [
      { title: "Demonstração · Tipe Reserva" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: GuestDemoPage,
});

function GuestDemoPage() {
  const { lado: inicial } = Route.useSearch();
  const [lado, setLado] = useState<"cliente" | "restaurante">(inicial ?? "cliente");
  return (
    <div>
      <div className="flex items-center justify-center gap-1 bg-[#021E34] p-2 text-sm text-white">
        <span className="mr-2 hidden text-white/70 sm:inline">
          Demonstração, nada é reservado de verdade:
        </span>
        {(["cliente", "restaurante"] as const).map((l) => (
          <button
            key={l}
            type="button"
            aria-pressed={lado === l}
            onClick={() => setLado(l)}
            className={cn(
              "rounded-full px-3 py-1",
              lado === l ? "bg-[#0FC9BD] text-[#021E34]" : "hover:bg-white/10",
            )}
          >
            {l === "cliente" ? "Cliente" : "Restaurante"}
          </button>
        ))}
      </div>
      {lado === "cliente" ? <VitrineCliente /> : <GuestManagerDemo />}
    </div>
  );
}
