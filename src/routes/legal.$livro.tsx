import { createFileRoute, notFound } from "@tanstack/react-router";
import { z } from "zod";
import { BookReader } from "@/components/tipe/legal/BookReader";
import { LegalShell } from "@/components/tipe/legal/LegalShell";
import { getBook } from "@/lib/tipe/legal-content";

export const Route = createFileRoute("/legal/$livro")({
  validateSearch: z.object({ destaque: z.string().max(80).optional() }),
  loader: ({ params }) => { const book = getBook(params.livro); if (!book) throw notFound(); return { slug: book.slug }; },
  head: ({ params }) => {
    const b = getBook(params.livro);
    if (!b) return { meta: [{ title: "Livro não encontrado · Central Jurídica TIPE" }, { name: "robots", content: "noindex" }] };
    const title = `${b.title} · Central Jurídica TIPE`;
    const desc = `${b.description} Versão ${b.version}, vigente desde ${b.effective}, na plataforma TIPE.`;
    const url = `https://tipe.digital/legal/${b.slug}`;
    return {
      meta: [
        { title }, { name: "description", content: desc },
        { property: "og:title", content: title }, { property: "og:description", content: desc },
        { property: "og:type", content: "article" }, { property: "og:url", content: url },
        { name: "twitter:card", content: "summary" },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  notFoundComponent: () => <LegalShell><p className="mx-auto max-w-xl px-4 py-20 text-center text-muted-foreground">Este livro não existe. Volte ao sumário da Central Jurídica.</p></LegalShell>,
  component: LivroPage,
});

function LivroPage() {
  const { slug } = Route.useLoaderData();
  const { destaque } = Route.useSearch();
  const book = getBook(slug)!;
  return <LegalShell><BookReader key={book.slug} book={book} destaque={destaque} /></LegalShell>;
}
