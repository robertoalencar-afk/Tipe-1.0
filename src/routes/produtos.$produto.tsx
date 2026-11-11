import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { CAMINHO_PRODUTO } from "@/components/tipe/site/produtos";

/** URLs antigas /produtos/<slug>: redirecionam (301) para o caminho oficial. */
export const Route = createFileRoute("/produtos/$produto")({
  beforeLoad: ({ params, location }) => {
    const destino = CAMINHO_PRODUTO[params.produto];
    if (!destino) throw notFound();
    throw redirect({ href: `${destino}${location.searchStr ?? ""}${location.hash ? `#${location.hash}` : ""}`, statusCode: 301 });
  },
});
