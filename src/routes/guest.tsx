import { createFileRoute, redirect } from "@tanstack/react-router";

/** Endereço antigo do Tipe Reserva (ex-Guest): redireciona (301) para /reserva. */
export const Route = createFileRoute("/guest")({
  beforeLoad: ({ location }) => {
    throw redirect({
      href: `/reserva${location.searchStr ?? ""}${location.hash ? `#${location.hash}` : ""}`,
      statusCode: 301,
    });
  },
});
