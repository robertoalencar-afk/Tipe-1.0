import { createFileRoute, redirect } from "@tanstack/react-router";

// Endereço antigo: redireciona permanentemente para a Central Jurídica.
export const Route = createFileRoute("/termos-parceiros")({
  beforeLoad: () => { throw redirect({ to: "/legal/$livro", params: { livro: "parceiros" }, statusCode: 301 }); },
});
