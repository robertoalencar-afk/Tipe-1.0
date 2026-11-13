import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { dietLabels, type MenuConfig } from "@/lib/tipe/menu-intelligence";
import { getMenuStudio, saveMenuLinks, saveMenuPresentation, suggestMenuTranslation } from "@/lib/tipe/menu-intelligence.functions";

type Studio = Awaited<ReturnType<typeof getMenuStudio>>;
export function MenuInteligente({ slug }: { slug: string }) {
  const query = useQuery({ queryKey: ["menu-studio", slug], queryFn: () => getMenuStudio({ data: { slug } }) });
  const [selected, setSelected] = useState("");
  const studio = query.data;
  const item = studio?.items.find((i) => i.id === selected) ?? studio?.items[0];
  return <details className="surface-card p-4 sm:p-5">
    <summary className="cursor-pointer font-semibold">Cardápio inteligente · destaques, combinações e idiomas</summary>
    <p className="my-3 text-sm text-muted-foreground">Valorize os pratos, ofereça complementos e facilite a escolha. Fotos, logomarca e efeito 3D continuam nos controles do cardápio.</p>
    {query.isPending && <p role="status">Carregando…</p>}
    {query.error && <p role="alert" className="text-sm text-destructive">{query.error.message}</p>}
    {studio && <div className="space-y-5">
      <label className="block text-sm font-medium">Produto
        <select value={item?.id ?? ""} onChange={(e) => setSelected(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3">
          {studio.items.map((i) => <option key={i.id} value={i.id}>{i.code} · {i.name}</option>)}
        </select>
      </label>
      {item ? <Editor key={item.id} slug={slug} item={item} items={studio.items} /> : <p className="text-sm text-muted-foreground">Cadastre um produto para configurar sua apresentação.</p>}
      <SocialLinks slug={slug} initial={studio.links} />
      <section className="border-t border-border pt-4">
        <h3 className="font-semibold">Interações nos últimos 30 dias</h3>
        <p className="mt-1 text-xs text-muted-foreground">Aberturas de fotos e toques em adicionar, somente de visitantes que autorizaram estatísticas. São interações, não vendas ou clientes únicos. Consulte Relatórios para os pedidos efetivamente lançados.</p>
        <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm">
          <thead><tr><th className="py-2">Produto</th><th className="px-2">Fotos abertas</th><th className="px-2">Adições</th></tr></thead>
          <tbody>{studio.items.map((i) => <tr key={i.id} className="border-t border-border"><td className="py-2">{i.name}</td><td className="px-2 tabular-nums">{studio.metrics[i.id]?.opens ?? 0}</td><td className="px-2 tabular-nums">{studio.metrics[i.id]?.adds ?? 0}</td></tr>)}</tbody>
        </table></div>
      </section>
    </div>}
  </details>;
}

function Editor({ slug, item, items }: { slug: string; item: Studio["items"][number]; items: Studio["items"] }) {
  const qc = useQueryClient();
  const [config, setConfig] = useState<MenuConfig>(item.config);
  const [badge, setBadge] = useState(item.badge);
  const [allergens, setAllergens] = useState(item.allergens.join(", "));
  const [busy, setBusy] = useState(false);
  async function translate() {
    setBusy(true);
    try {
      const translations = await suggestMenuTranslation({ data: { slug, itemId: item.id } });
      setConfig((c) => ({ ...c, translations }));
      toast.success("Traduções preparadas. Revise os textos e salve para publicar.");
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try {
      await saveMenuPresentation({ data: { slug, itemId: item.id, badge, allergens: allergens.split(",").map((s) => s.trim()).filter(Boolean), config } });
      await qc.invalidateQueries({ queryKey: ["menu-studio", slug] });
      toast.success("Apresentação publicada no cardápio");
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  return <form onSubmit={save}><fieldset disabled={busy} className="space-y-4">
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={config.featured} onChange={(e) => setConfig({ ...config, featured: e.target.checked })} />Exibir em Destaques</label>
    <label className="block text-sm">Selo do produto<Input className="mt-1" maxLength={40} placeholder="Ex.: Novidade, Especial da casa" value={badge} onChange={(e) => setBadge(e.target.value)} /></label>
    <label className="block text-sm">Alergênicos, separados por vírgula<Input className="mt-1" value={allergens} onChange={(e) => setAllergens(e.target.value)} placeholder="Ex.: leite, ovos, crustáceos" /></label>
    <fieldset className="rounded-xl border border-border p-3"><legend className="px-1 text-sm font-medium">Informações alimentares confirmadas pela cozinha</legend>
      <div className="flex flex-wrap gap-3">{Object.entries(dietLabels).map(([key, label]) => <label key={key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={config.diets.includes(key as MenuConfig["diets"][number])} onChange={(e) => setConfig({ ...config, diets: e.target.checked ? [...config.diets, key as MenuConfig["diets"][number]] : config.diets.filter((d) => d !== key) })} />{label}</label>)}</div>
      <p className="mt-2 text-xs text-muted-foreground">Não marque por dedução. Confirme ingredientes e risco de contaminação cruzada com a cozinha.</p>
    </fieldset>
    {([["recommendations", "Combina bem com"], ["addons", "Adicionais e complementos"], ["variants", "Outras versões do prato"]] as const).map(([key, label]) => <details key={key} className="rounded-xl border border-border p-3">
      <summary className="cursor-pointer text-sm font-medium">{label} · {config[key].length}/8</summary>
      <p className="my-2 text-xs text-muted-foreground">Selecione produtos já cadastrados, cada um com seu próprio preço. Itens esgotados não aparecem para o cliente. O complemento entra como item separado no pedido.</p>
      <div className="max-h-48 space-y-2 overflow-y-auto">{items.filter((i) => i.id !== item.id).map((i) => <label key={i.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={config[key].includes(i.code)} disabled={!config[key].includes(i.code) && config[key].length >= 8} onChange={(e) => setConfig({ ...config, [key]: e.target.checked ? [...config[key], i.code] : config[key].filter((c) => c !== i.code) })} />{i.code} · {i.name}</label>)}</div>
    </details>)}
    <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-semibold">Idiomas do produto</h4><Button type="button" variant="outline" onClick={translate}>Preparar traduções com IA</Button></div>
    <p className="text-xs text-muted-foreground">A IA prepara um rascunho usando a cota disponível da Tipe. Confira nomes e ingredientes antes de salvar. Textos não traduzidos continuam em português.</p>
    {(["en", "es"] as const).map((lang) => <fieldset key={lang} className="space-y-2 rounded-xl border border-border p-3"><legend className="px-1 text-sm font-medium">{lang === "en" ? "English" : "Español"}</legend>
      <label className="block text-xs">Nome<Input maxLength={80} value={config.translations[lang]?.name ?? ""} onChange={(e) => setConfig({ ...config, translations: { ...config.translations, [lang]: { description: config.translations[lang]?.description ?? "", name: e.target.value } } })} /></label>
      <label className="block text-xs">Descrição<Input maxLength={200} value={config.translations[lang]?.description ?? ""} onChange={(e) => setConfig({ ...config, translations: { ...config.translations, [lang]: { name: config.translations[lang]?.name ?? "", description: e.target.value } } })} /></label>
    </fieldset>)}
    <Button type="submit">{busy ? "Aguarde…" : "Salvar apresentação"}</Button>
  </fieldset></form>;
}

function SocialLinks({ slug, initial }: { slug: string; initial: Studio["links"] }) {
  const [links, setLinks] = useState(initial);
  const [busy, setBusy] = useState(false);
  return <form className="space-y-3 border-t border-border pt-4" onSubmit={async (e) => {
    e.preventDefault(); setBusy(true);
    try { await saveMenuLinks({ data: { slug, links } }); toast.success("Links atualizados"); }
    catch (error) { toast.error((error as Error).message); } finally { setBusy(false); }
  }}><h3 className="font-semibold">Instagram e avaliações</h3>
    <label className="block text-sm">Instagram<Input type="url" placeholder="https://www.instagram.com/seu-restaurante" value={links.instagram} onChange={(e) => setLinks({ ...links, instagram: e.target.value })} /></label>
    <label className="block text-sm">Google ou TripAdvisor<Input type="url" placeholder="Link de avaliações do restaurante" value={links.reviews} onChange={(e) => setLinks({ ...links, reviews: e.target.value })} /></label>
    <Button type="submit" variant="outline" disabled={busy}>Salvar links</Button>
  </form>;
}
