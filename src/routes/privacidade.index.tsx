import { createFileRoute, redirect } from "@tanstack/react-router";

// Endereço antigo: redireciona permanentemente para a Central Jurídica.
export const Route = createFileRoute("/privacidade/")({
  beforeLoad: () => { throw redirect({ to: "/legal/$livro", params: { livro: "privacidade" }, statusCode: 301 }); },
});
