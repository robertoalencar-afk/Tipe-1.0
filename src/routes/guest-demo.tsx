import { createFileRoute, redirect } from "@tanstack/react-router";

/** Endereço antigo da demonstração do Tipe Reserva: redireciona (301) para /reserva-demo. */
export const Route = createFileRoute("/guest-demo")({
  beforeLoad: ({ location }) => {
    throw redirect({
      href: `/reserva-demo${location.searchStr ?? ""}${location.hash ? `#${location.hash}` : ""}`,
      statusCode: 301,
    });
  },
});
