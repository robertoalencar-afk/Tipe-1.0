import { createFileRoute, redirect } from "@tanstack/react-router";

// Endereço antigo: redireciona permanentemente para a Central Jurídica.
export const Route = createFileRoute("/termos")({
  beforeLoad: () => { throw redirect({ to: "/legal/$livro", params: { livro: "termos-de-uso" }, statusCode: 301 }); },
});
