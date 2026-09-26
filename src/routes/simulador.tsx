import { createFileRoute, redirect } from "@tanstack/react-router";

// Simulador público: mesa 12 do Maré Alta (demo).
// A mesa encerra quando tudo é pago e reabre zerada após 2 minutos.
export const Route = createFileRoute("/simulador")({
  head: () => ({
    meta: [
      { title: "Simulador TIPE — Pague a conta pelo celular" },
      { name: "description", content: "Experimente a TIPE: escaneie, escolha seus itens e pague a conta da mesa pelo celular, sem esperar o garçom." },
      { property: "og:title", content: "Simulador TIPE — Pague a conta pelo celular" },
      { property: "og:description", content: "Experimente a TIPE: escaneie, escolha seus itens e pague a conta da mesa pelo celular, sem esperar o garçom." },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/$restaurante/$mesa", params: { restaurante: "marealta", mesa: "mesa12" } });
  },
});
