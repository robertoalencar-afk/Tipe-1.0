import { useEffect } from "react";
import { notFound, useLoaderData } from "@tanstack/react-router";
import { SitePage } from "@/components/tipe/site/Site";
import { ProdutoPagina } from "@/components/tipe/site/ProdutoPagina";
import { CAMINHO_PRODUTO, produtoPorSlug } from "@/components/tipe/site/produtos";
import { fotoSrc } from "@/components/tipe/site/Foto";
import { semearLancamento } from "@/components/tipe/site/useLancamento";
import { getLaunchState } from "@/lib/tipe/launch-state.functions";
import { LANCAMENTO_PADRAO, temLancamento, type EstadoLancamento } from "@/lib/tipe/launch-state";

const SITE = "https://tipe.digital";


/** Título e descrição próprios quando o texto do catálogo não basta para a busca. */
const SEO: Record<string, { title: string; description: string }> = {
  order: {
    title: "Tipe Order · Cardápio, pedidos e autoatendimento | Tipe",
    description:
      "Conheça os formatos do Tipe Order: mesas, balcão, retirada, delivery, pulseira NFC e totem. Veja telas reais, disponibilidade e experimente o simulador sem cadastro.",
  },
};

export function opcoesRotaProduto(slug: string) {
  return {
  loader: async () => {
    const params = { produto: slug };
    if (!produtoPorSlug(params.produto)) throw notFound();
    let estado: EstadoLancamento | null = null;
    if (temLancamento(params.produto)) {
      try {
        estado = (await getLaunchState({ data: { slug: params.produto } })).estado;
      } catch {
        estado = LANCAMENTO_PADRAO[params.produto] ?? null;
      }
    }
    return { slug: params.produto, estado };
  },
  head: () => {
    const p = produtoPorSlug(slug);
    if (!p) return { meta: [{ title: "Produto não encontrado · Tipe" }, { name: "robots", content: "noindex" }] };
    const seo = SEO[p.slug];
    const title = seo?.title ?? `${p.nome} · ${p.titulo} | Tipe`;
    const description = seo?.description ?? p.texto;
    const url = `${SITE}${CAMINHO_PRODUTO[p.slug]}`;
    // Maior versão da foto do produto, em URL absoluta, para a prévia de links.
    const maior = fotoSrc(p.foto).srcSet.split(", ").pop()?.split(" ")[0];
    const imagem = maior ? (maior.startsWith("http") ? maior : `${SITE}${maior}`) : undefined;
    const jsonLd =
      p.slug === "order"
        ? {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "Tipe Order",
            applicationCategory: "BusinessApplication",
            applicationSubCategory: "Cardápio digital e pedido pela mesa",
            operatingSystem: "Web (navegador do celular)",
            description,
            url,
            ...(imagem ? { image: imagem } : {}),
            isPartOf: { "@type": "SoftwareApplication", name: "Tipe Pay", url: `${SITE}/pay` },
            publisher: { "@type": "Organization", name: "Tipe", url: SITE },
          }
        : null;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { property: "og:locale", content: "pt_BR" },
        { property: "og:site_name", content: "Tipe" },
        ...(imagem
          ? [
              { property: "og:image", content: imagem },
              { name: "twitter:card", content: "summary_large_image" },
              { name: "twitter:image", content: imagem },
            ]
          : []),
      ],
      links: [{ rel: "canonical", href: url }],
      ...(jsonLd
        ? { scripts: [{ type: "application/ld+json", children: JSON.stringify(jsonLd) }] }
        : {}),
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
  };
}

function ProdutoRota() {
  const { slug, estado } = useLoaderData({ strict: false }) as { slug: string; estado: EstadoLancamento | null };
  const p = produtoPorSlug(slug)!;
  // O menu e os cards passam a mostrar o mesmo estado que a página já trouxe.
  useEffect(() => {
    if (estado) semearLancamento(slug, estado);
  }, [slug, estado]);
  return (
    <SitePage>
      <ProdutoPagina key={p.slug} p={p} estado={estado} />
    </SitePage>
  );
}
