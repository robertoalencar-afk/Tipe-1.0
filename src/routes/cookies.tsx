import { createFileRoute, redirect } from "@tanstack/react-router";

// Endereço antigo: redireciona permanentemente para a Central Jurídica.
export const Route = createFileRoute("/cookies")({
  beforeLoad: () => { throw redirect({ to: "/legal/$livro", params: { livro: "cookies" }, statusCode: 301 }); },
});
