import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { CartaoConta } from "@/components/tipe/conta/CartaoConta";
import { PainelEsqueci } from "@/components/tipe/conta/PainelEsqueci";

export const Route = createFileRoute("/esqueci-a-senha")({
  validateSearch: z.object({
    email: z.string().max(254).optional().catch(undefined),
    garcom: z.coerce.boolean().optional().catch(undefined),
  }),
  head: () => ({
    meta: [
      { title: "Esqueci a senha — TIPE" },
      {
        name: "description",
        content: "Receba por e-mail um link seguro para criar uma nova senha na Tipe.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EsqueciSenha,
});

function EsqueciSenha() {
  const busca = Route.useSearch();
  const [enviado, setEnviado] = useState(false);
  return (
    <CartaoConta
      humor={enviado ? "enviado" : "pensando"}
      frente={
        <PainelEsqueci
          emailInicial={busca.email ?? ""}
          garcom={!!busca.garcom}
          onEnviado={setEnviado}
        />
      }
    />
  );
}
