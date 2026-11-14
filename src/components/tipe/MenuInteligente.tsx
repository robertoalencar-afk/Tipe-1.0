import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMascotPreference } from "@/lib/tipe/mascot-preference";
import { MascoteVivo } from "./site/MascoteVivo";
import { Check, ChevronRight, RefreshCw } from "lucide-react";
import {
  dietLabels,
  menuLanguages,
  menuSource,
  type MenuConfig,
} from "@/lib/tipe/menu-intelligence";
import {
  getMenuStudio,
  saveMenuLinks,
  saveMenuPresentation,
  getMenuAssistant,
  saveMenuAssistant,
  reviewMenuAssistant,
  resolveMenuSuggestion,
} from "@/lib/tipe/menu-intelligence.functions";

type Studio = Awaited<ReturnType<typeof getMenuStudio>>;
export function MenuInteligente({
  slug,
  onEditItem,
}: {
  slug: string;
  onEditItem: (id: string) => void;
}) {
  const [mascotVisible, setMascotVisible] = useMascotPreference(slug);
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["menu-studio", slug],
    queryFn: () => getMenuStudio({ data: { slug } }),
    refetchInterval: 30000,
  });
  const assistant = useQuery({
    queryKey: ["menu-assistant", slug],
    queryFn: () => getMenuAssistant({ data: { slug } }),
    refetchInterval: 15000,
  });
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const studio = query.data;
  const state = assistant.data;
  const item = studio?.items.find((i) => i.id === selected) ?? studio?.items[0];
  async function refresh() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["menu-studio", slug] }),
      qc.invalidateQueries({ queryKey: ["menu-assistant", slug] }),
    ]);
  }
  async function review() {
    setReviewing(true);
    try {
      await reviewMenuAssistant({ data: { slug } });
      await refresh();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setReviewing(false);
    }
  }
  async function settings(change: Partial<NonNullable<typeof state>>) {
    if (!state) return;
    setBusy(true);
    try {
      const next = { ...state, ...change };
      await saveMenuAssistant({
        data: {
          slug,
          settings: {
            enabled: next.enabled,
            autoTranslate: next.autoTranslate,
            languages: next.languages,
          },
        },
      });
      await refresh();
      if (next.enabled) void review();
      toast.success("Preferências da Lebre atualizadas");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function resolve(id: string, apply: boolean) {
    setBusy(true);
    try {
      await resolveMenuSuggestion({ data: { slug, suggestionId: id, apply } });
      await refresh();
      toast.success(apply ? "Sugestão aplicada no cardápio" : "Sugestão dispensada");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const missing =
    studio?.items.filter((i) => !i.description?.trim() || !i.imageUrl).slice(0, 3) ?? [];
  const suggestions =
    state?.suggestions.filter((s) =>
      studio?.items.some((i) => i.id === s.itemId && menuSource(i) === s.source),
    ) ?? [];
  const foreign = state?.languages.filter((l) => l !== "pt") ?? [];
  const ready =
    studio?.items.filter(
      (i) =>
        i.available &&
        i.config.translationSource === menuSource(i) &&
        foreign.every((l) => !!i.config.translations[l as "en" | "es"]?.name),
    ).length ?? 0;
  const available = studio?.items.filter((i) => i.available).length ?? 0;
  return (
    <section
      aria-labelledby="lebre-menu-title"
      className="min-w-0 space-y-7 border-t border-border pt-8"
    >
      <div className="flex items-start gap-4 sm:gap-5">
        {mascotVisible && (
          <MascoteVivo alt="Lebre" expressive className="h-20 w-20 shrink-0 sm:h-28 sm:w-28" />
        )}
        <div className="min-w-0 flex-1">
          <h3 id="lebre-menu-title" className="font-display text-2xl font-medium">
            A Lebre cuida do seu cardápio
          </h3>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Eu acompanho seus pratos e trago ideias para facilitar a escolha do cliente. Você decide
            o que vai para o cardápio.
          </p>
          {state && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant={state.enabled ? "outline" : "default"}
                disabled={busy || reviewing}
                onClick={() => void settings({ enabled: !state.enabled })}
              >
                {state.enabled ? "Pausar cuidado da Lebre" : "Ativar cuidado da Lebre"}
              </Button>
              {state.enabled && (
                <span className="text-xs text-muted-foreground">
                  Revisão diária automática, mesmo com o painel fechado.
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input
          type="checkbox"
          className="h-5 w-5 accent-primary"
          checked={mascotVisible}
          onChange={(e) => setMascotVisible(e.target.checked)}
        />
        Exibir mascote da Lebre
        <span className="text-xs text-muted-foreground">Neste navegador</span>
      </label>
      {(query.isPending || assistant.isPending) && (
        <p role="status" className="text-sm">
          Buscando seu cardápio…
        </p>
      )}
      {(query.error || assistant.error) && (
        <div role="alert" className="space-y-2 text-sm">
          <p>Não consegui carregar esta área. Tente novamente.</p>
          <Button variant="outline" onClick={() => void refresh()}>
            Tentar novamente
          </Button>
        </div>
      )}
      {studio && state && (
        <>
          <section aria-label="Sugestões da Lebre" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h4 className="text-lg font-semibold">Minhas sugestões para você</h4>
              {state.enabled && (
                <Button variant="ghost" disabled={reviewing || busy} onClick={() => void review()}>
                  <RefreshCw
                    className={`mr-2 h-4 w-4 ${reviewing ? "motion-safe:animate-spin" : ""}`}
                  />
                  {reviewing ? "A Lebre está revisando…" : "Verificar agora"}
                </Button>
              )}
            </div>
            {state.notice && (
              <p role="status" className="text-sm text-muted-foreground">
                {state.notice}
              </p>
            )}
            {state.reviewedAt && (
              <p className="text-xs text-muted-foreground">
                Última análise por IA: {new Date(state.reviewedAt).toLocaleString("pt-BR")}. As
                ideias abaixo só são publicadas quando você aplica.
              </p>
            )}
            <div className="divide-y divide-border">
              {suggestions.map((s) => {
                const dish = studio.items.find((i) => i.id === s.itemId)!;
                const other = studio.items.find((i) => i.id === s.otherId);
                return (
                  <div
                    key={s.id}
                    className="flex flex-wrap items-center justify-between gap-4 py-4"
                  >
                    <div className="min-w-0 flex-1 basis-64">
                      <p className="font-medium">
                        {s.kind === "featured"
                          ? `Destacar ${dish.name}`
                          : `${dish.name} combina com ${other?.name ?? "outro prato"}`}
                      </p>
                      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{s.reason}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        disabled={busy}
                        onClick={() => void resolve(s.id, false)}
                      >
                        Dispensar
                      </Button>
                      <Button
                        disabled={busy || (s.kind === "pair" && !other)}
                        onClick={() => void resolve(s.id, true)}
                      >
                        <Check className="mr-2 h-4 w-4" />
                        Aplicar sugestão
                      </Button>
                    </div>
                  </div>
                );
              })}
              {missing.map((dish) => (
                <div
                  key={dish.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-4"
                >
                  <div className="min-w-0 flex-1 basis-64">
                    <p className="font-medium">
                      {!dish.description?.trim()
                        ? `Vamos contar mais sobre ${dish.name}?`
                        : `Uma foto para ${dish.name}`}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {!dish.description?.trim()
                        ? "A descrição está vazia. Conte como o prato é preparado, com os ingredientes confirmados pela cozinha."
                        : "Este prato ainda não tem foto. Envie uma imagem e eu preparo o efeito 3D."}
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => onEditItem(dish.id)}>
                    Completar prato
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            {!studio.items.length ? (
              <p className="text-sm text-muted-foreground">
                Cadastre seu primeiro prato no editor acima. Depois, eu ajudo a cuidar dele.
              </p>
            ) : (
              !suggestions.length &&
              !missing.length && (
                <p className="text-sm text-muted-foreground">
                  {reviewing
                    ? "Estou procurando oportunidades no seu cardápio."
                    : state.enabled
                      ? "Fotos e descrições estão preenchidas. Novas ideias aparecem aqui nas próximas análises."
                      : "Fotos e descrições estão preenchidas. Ative meu cuidado para receber ideias de destaques e combinações."}
                </p>
              )
            )}
          </section>
          <section aria-labelledby="menu-languages-title" className="border-t border-border pt-6">
            <h4 id="menu-languages-title" className="text-lg font-semibold">
              Seu cardápio em outros idiomas
            </h4>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Escolha os idiomas. Com a tradução automática ligada, eu traduzo e publico os nomes e
              as descrições, inclusive quando você alterar um prato.
            </p>
            <div
              role="group"
              aria-label="Idiomas do Tipe Order"
              className="mt-4 flex flex-wrap gap-2"
            >
              {menuLanguages.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  aria-pressed={state.languages.includes(l.id)}
                  disabled={l.id === "pt" || busy || reviewing}
                  onClick={() =>
                    void settings({
                      languages: state.languages.includes(l.id)
                        ? state.languages.filter((id) => id !== l.id)
                        : [...state.languages, l.id],
                    })
                  }
                  className={`flex min-h-12 items-center gap-2 rounded-xl border px-4 text-sm font-medium disabled:cursor-default ${state.languages.includes(l.id) ? "border-primary bg-primary/10 text-foreground" : "border-border"}`}
                >
                  <span aria-hidden="true" className="text-xl">
                    {l.flag}
                  </span>
                  {l.name}
                  {state.languages.includes(l.id) && <Check className="h-4 w-4" />}
                </button>
              ))}
            </div>
            <label className="mt-4 flex min-h-11 items-center gap-3 text-sm font-medium">
              <input
                type="checkbox"
                className="h-5 w-5 accent-primary"
                checked={state.autoTranslate}
                disabled={busy || reviewing || !foreign.length}
                onChange={(e) =>
                  void settings({
                    autoTranslate: e.target.checked,
                    ...(e.target.checked ? { enabled: true } : {}),
                  })
                }
              />
              Traduzir e publicar automaticamente com IA
            </label>
            <p role="status" className="mt-2 max-w-2xl text-xs text-muted-foreground">
              {!foreign.length
                ? "Português é o idioma original. Selecione inglês ou espanhol para ativar a tradução."
                : state.autoTranslate
                  ? `${ready} de ${available} pratos disponíveis preparados. Cada idioma aparece com sua bandeira no Tipe Order quando todos os pratos disponíveis estiverem traduzidos. A preparação continua em lotes, a cada cinco minutos.`
                  : "A tradução está desligada. O cliente vê o cardápio em português."}
            </p>
            {state.autoTranslate && !state.enabled && (
              <p className="mt-2 text-sm text-muted-foreground">
                O cuidado da Lebre está pausado. As traduções já preparadas continuam disponíveis;
                ative novamente para atualizar os pratos.
              </p>
            )}
          </section>
          <details className="border-t border-border pt-5">
            <summary className="cursor-pointer text-sm font-medium">
              Ajustes manuais · destaques, combinações e informações alimentares
            </summary>
            <div className="mt-4 space-y-4">
              <label className="block text-sm font-medium">
                Escolha um prato
                <select
                  value={item?.id ?? ""}
                  onChange={(e) => setSelected(e.target.value)}
                  className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3"
                >
                  {studio.items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </label>
              {item && <Editor key={item.id} slug={slug} item={item} items={studio.items} />}
            </div>
          </details>
          <details className="border-t border-border pt-5">
            <summary className="cursor-pointer text-sm font-medium">Instagram e avaliações</summary>
            <div className="mt-4">
              <SocialLinks slug={slug} initial={studio.links} />
            </div>
          </details>
          <details className="border-t border-border pt-5">
            <summary className="cursor-pointer text-sm font-medium">
              Interações nos últimos 30 dias
            </summary>
            <p className="mt-3 max-w-2xl text-xs text-muted-foreground">
              Aberturas de fotos e toques em adicionar de visitantes que autorizaram estatísticas.
              São interações, não vendas ou clientes únicos.
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    <th className="py-2">Produto</th>
                    <th className="px-2">Fotos abertas</th>
                    <th className="px-2">Adições</th>
                  </tr>
                </thead>
                <tbody>
                  {studio.items.map((i) => (
                    <tr key={i.id} className="border-t border-border">
                      <td className="py-2">{i.name}</td>
                      <td className="px-2 tabular-nums">{studio.metrics[i.id]?.opens ?? 0}</td>
                      <td className="px-2 tabular-nums">{studio.metrics[i.id]?.adds ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </section>
  );
}

function Editor({
  slug,
  item,
  items,
}: {
  slug: string;
  item: Studio["items"][number];
  items: Studio["items"];
}) {
  const qc = useQueryClient();
  const [config, setConfig] = useState<MenuConfig>(item.config);
  const [badge, setBadge] = useState(item.badge);
  const [allergens, setAllergens] = useState(item.allergens.join(", "));
  const [busy, setBusy] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await saveMenuPresentation({
        data: {
          slug,
          itemId: item.id,
          badge,
          allergens: allergens
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          config,
        },
      });
      await qc.invalidateQueries({ queryKey: ["menu-studio", slug] });
      toast.success("Apresentação publicada no cardápio");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={save}>
      <fieldset disabled={busy} className="space-y-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={config.featured}
            onChange={(e) => setConfig({ ...config, featured: e.target.checked })}
          />
          Exibir em Destaques
        </label>
        <label className="block text-sm">
          Selo do produto
          <Input
            className="mt-1"
            maxLength={40}
            placeholder="Ex.: Novidade, Especial da casa"
            value={badge}
            onChange={(e) => setBadge(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          Alergênicos, separados por vírgula
          <Input
            className="mt-1"
            value={allergens}
            onChange={(e) => setAllergens(e.target.value)}
            placeholder="Ex.: leite, ovos, crustáceos"
          />
        </label>
        <fieldset className="rounded-xl border border-border p-3">
          <legend className="px-1 text-sm font-medium">
            Informações alimentares confirmadas pela cozinha
          </legend>
          <div className="flex flex-wrap gap-3">
            {Object.entries(dietLabels).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={config.diets.includes(key as MenuConfig["diets"][number])}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      diets: e.target.checked
                        ? [...config.diets, key as MenuConfig["diets"][number]]
                        : config.diets.filter((d) => d !== key),
                    })
                  }
                />
                {label}
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Não marque por dedução. Confirme ingredientes e risco de contaminação cruzada com a
            cozinha.
          </p>
        </fieldset>
        {(
          [
            ["recommendations", "Combina bem com"],
            ["addons", "Adicionais e complementos"],
            ["variants", "Outras versões do prato"],
          ] as const
        ).map(([key, label]) => (
          <details key={key} className="rounded-xl border border-border p-3">
            <summary className="cursor-pointer text-sm font-medium">
              {label} · {config[key].length}/8
            </summary>
            <p className="my-2 text-xs text-muted-foreground">
              Selecione produtos já cadastrados, cada um com seu próprio preço. Itens esgotados não
              aparecem para o cliente. O complemento entra como item separado no pedido.
            </p>
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {items
                .filter((i) => i.id !== item.id)
                .map((i) => (
                  <label key={i.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={config[key].includes(i.code)}
                      disabled={!config[key].includes(i.code) && config[key].length >= 8}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          [key]: e.target.checked
                            ? [...config[key], i.code]
                            : config[key].filter((c) => c !== i.code),
                        })
                      }
                    />
                    {i.code} · {i.name}
                  </label>
                ))}
            </div>
          </details>
        ))}
        <Button type="submit">{busy ? "Aguarde…" : "Salvar apresentação"}</Button>
      </fieldset>
    </form>
  );
}

function SocialLinks({ slug, initial }: { slug: string; initial: Studio["links"] }) {
  const [links, setLinks] = useState(initial);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="space-y-3 border-t border-border pt-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await saveMenuLinks({ data: { slug, links } });
          toast.success("Links atualizados");
        } catch (error) {
          toast.error((error as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3 className="font-semibold">Instagram e avaliações</h3>
      <label className="block text-sm">
        Instagram
        <Input
          type="url"
          placeholder="https://www.instagram.com/seu-restaurante"
          value={links.instagram}
          onChange={(e) => setLinks({ ...links, instagram: e.target.value })}
        />
      </label>
      <label className="block text-sm">
        Google ou TripAdvisor
        <Input
          type="url"
          placeholder="Link de avaliações do restaurante"
          value={links.reviews}
          onChange={(e) => setLinks({ ...links, reviews: e.target.value })}
        />
      </label>
      <Button type="submit" variant="outline" disabled={busy}>
        Salvar links
      </Button>
    </form>
  );
}
