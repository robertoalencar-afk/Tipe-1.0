import { createFileRoute, redirect } from "@tanstack/react-router";

// Endereço antigo: redireciona permanentemente para a Central Jurídica.
export const Route = createFileRoute("/privacidade/solicitacao")({
  beforeLoad: () => { throw redirect({ to: "/legal/$livro", params: { livro: "seus-direitos" }, hash: "solicitacao", statusCode: 301 }); },
});
