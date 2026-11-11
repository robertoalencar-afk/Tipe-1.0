import { createFileRoute, redirect } from "@tanstack/react-router";

/** URL antiga: redireciona (301) para /solicitar-demonstracao mantendo a busca (?plano=, ?integracao=). */
export const Route = createFileRoute("/teste-gratis")({
  beforeLoad: ({ location }) => {
    throw redirect({
      href: `/solicitar-demonstracao${location.searchStr ?? ""}`,
      statusCode: 301,
    });
  },
});
