import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Archive } from "lucide-react";
import { Termos20 } from "@/components/tipe/legal/archive/Termos20";
import { Privacidade11 } from "@/components/tipe/legal/archive/Privacidade11";
import { Cookies10 } from "@/components/tipe/legal/archive/Cookies10";
import { Parceiros10 } from "@/components/tipe/legal/archive/Parceiros10";
import { ARCHIVED } from "@/lib/tipe/legal-content";

const PAGES = { "termos-2-0": Termos20, "privacidade-1-1": Privacidade11, "cookies-1-0": Cookies10, "parceiros-1-0": Parceiros10 } as const;

export const Route = createFileRoute("/legal/versoes_/$arquivo")({
  loader: ({ params }) => { const a = ARCHIVED.find((x) => x.id === params.arquivo); if (!a) throw notFound(); return { id: a.id }; },
  head: ({ params }) => {
    const a = ARCHIVED.find((x) => x.id === params.arquivo);
    const title = a ? `${a.doc} ${a.version} (arquivada) · TIPE` : "Versão não encontrada · TIPE";
    return { meta: [{ title }, { name: "description", content: "Versão arquivada, não vigente, de documento jurídico da TIPE." }, { property: "og:title", content: title }, { property: "og:description", content: "Versão arquivada, não vigente." }, { property: "og:type", content: "article" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] };
  },
  component: Arquivada,
});

function Arquivada() {
  const { id } = Route.useLoaderData();
  const a = ARCHIVED.find((x) => x.id === id)!;
  const Page = PAGES[a.id];
  return (
    <div>
      <div role="note" className="sticky top-0 z-40 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-secondary px-4 py-2.5 text-center text-sm font-semibold text-secondary-foreground">
        <Archive aria-hidden className="h-4 w-4 text-primary" />Versão arquivada, não vigente.
        <Link to="/legal/$livro" params={{ livro: a.book }} className="text-primary underline underline-offset-2">Ver versão vigente</Link>
      </div>
      <Page />
    </div>
  );
}
