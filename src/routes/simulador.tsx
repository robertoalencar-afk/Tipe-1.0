import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { SimulatorExperience } from "@/components/tipe/SimulatorExperience";

export const Route = createFileRoute("/simulador")({
  validateSearch: z.object({ mesa: z.literal("12").optional() }),
  head: () => ({
    meta: [
      { title: "Simulador Mesa 12 — TIPE" },
      { name: "description", content: "Simule a leitura do QR Code, confira os itens da Mesa 12 e experimente o pagamento pelo celular com a TIPE." },
      { property: "og:title", content: "Simulador Mesa 12 — TIPE" },
      { property: "og:description", content: "Conheça a experiência TIPE completa, do QR Code ao pagamento da conta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SimulatorPage,
});

function SimulatorPage() {
  const { mesa } = Route.useSearch();
  return <SimulatorExperience enterDirectly={mesa === "12"} />;
}
