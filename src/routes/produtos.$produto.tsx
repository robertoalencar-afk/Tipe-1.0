import { createFileRoute, notFound } from "@tanstack/react-router";
import { SitePage } from "@/components/tipe/site/Site";
import { ProdutoPagina } from "@/components/tipe/site/ProdutoPagina";
import { produtoPorSlug } from "@/components/tipe/site/produtos";

/** Título e descrição próprios quando o texto do catálogo não basta para a busca. */
const SEO: Record<string, { title: string; description: string }> = {
  guest: {
    title: "Tipe Guest · Sua próxima experiência começa aqui (em breve) | Tipe",
    description:
      "Tipe Guest, em breve: descobrir restaurantes, reservar e voltar. Hoje a Tipe já pede a avaliação logo depois do pagamento e lembra o nome de quem volta. Cadastre-se para ser avisado.",
  },
};

export const Route = createFileRoute("/produtos/$produto")({
  loader: ({ params }) => {
    if (!produtoPorSlug(params.produto)) throw notFound();
    return { slug: params.produto };
  },
  head: ({ params }) => {
    const p = produtoPorSlug(params.produto);
    if (!p) return { meta: [{ title: "Produto não encontrado · Tipe" }, { name: "robots", content: "noindex" }] };
    const seo = SEO[p.slug];
    const title = seo?.title ?? `${p.nome} · ${p.titulo} | Tipe`;
    const description = seo?.description ?? p.texto;
    const url = `https://tipe.digital/produtos/${p.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  notFoundComponent: () => (
    <SitePage>
      <p className="container-page py-32 text-center text-lg text-muted-foreground">
        Este produto não existe. <a href="/" className="underline">Voltar para o início</a>
      </p>
    </SitePage>
  ),
  component: ProdutoRota,
});

function ProdutoRota() {
  const { slug } = Route.useLoaderData();
  const p = produtoPorSlug(slug)!;
  return (
    <SitePage>
      <ProdutoPagina key={p.slug} p={p} />
    </SitePage>
  );
}
