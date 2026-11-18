import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LebreSuggestionButton } from "./LebreSuggestionButton";
import lebreAvatar from "@/assets/lebre/avatar-feliz.webp";
import { getMenuPromos, saveMenuPromos, suggestMenuPromos } from "@/lib/tipe/menu-promos.functions";
import { getMenuPosts, saveMenuPosts } from "@/lib/tipe/menu-posts.functions";
import {
  PROMO_KINDS,
  WEAK_DAYS,
  daysWithoutPromo,
  promoHoursLabel,
  type MenuPromo,
} from "@/lib/tipe/menu-promos";
import { WEEKDAYS } from "@/lib/tipe/menu-posts";

type Item = { code: string; name: string; imageUrl: string | null };
/** Semana começando na segunda, como o restaurante pensa a semana. */
const WEEK = [1, 2, 3, 4, 5, 6, 0];
const STUDY = [
  "Promoção é para encher dia fraco. Segunda e terça são os dias mais fracos; a quarta virou o pico de consumo fora do lar e sexta e sábado enchem sozinhos.",
  'Dia temático com nome fácil ("Terça do camarão") cria hábito e é fácil de divulgar.',
  "Happy hour em dia útil, das 17h às 19h, com bebida em dobro ou petisco com bebida.",
  "Cortesia (sobremesa, taça, prato kids) costuma valer mais para o cliente do que desconto em porcentagem.",
  "Regra clara e visível: dias, horário, para quantas pessoas, limite e validade. O Código de Defesa do Consumidor trata como enganosa a promoção que omite condição.",
];

export function PromocoesCardapio({ slug, items }: { slug: string; items: Item[] }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["menu-promos", slug],
    queryFn: () => getMenuPromos({ data: { slug } }),
  });
  const [draft, setDraft] = useState<MenuPromo[] | null>(null),
    [busy, setBusy] = useState(false),
    [suggesting, setSuggesting] = useState(false),
    [brief, setBrief] = useState("");
  const list = draft ?? q.data ?? [];
  const name = (code: string) => items.find((i) => i.code === code)?.name ?? code;
  const empty = daysWithoutPromo(list);
  const patch = (i: number, p: Partial<MenuPromo>) =>
    setDraft(list.map((v, n) => (n === i ? { ...v, ...p } : v)));
  const locked = busy || suggesting || q.isPending || q.isError;

  async function toBanner(p: MenuPromo) {
    const code = p.itemCodes.find((c) => items.some((i) => i.code === c && i.imageUrl));
    if (!code) {
      toast.error("Escolha um prato com foto nesta promoção para criar o banner.");
      return;
    }
    try {
      const posts = await getMenuPosts({ data: { slug } });
      if (posts.length >= 8) {
        toast.error("O carrossel já tem 8 banners. Retire um antes.");
        return;
      }
      const hours = promoHoursLabel(p);
      const next = [
        ...posts,
        {
          id: crypto.randomUUID(),
          title: p.name,
          caption: `${p.rule}${hours ? ` ${hours[0]!.toUpperCase()}${hours.slice(1)}.` : ""}`.slice(
            0,
            180,
          ),
          itemCode: code,
          theme: "photo" as const,
          enabled: true,
          tag: "promo" as const,
          ...(p.days.length ? { days: p.days } : {}),
        },
      ];
      await saveMenuPosts({ data: { slug, posts: next } });
      qc.setQueryData(["menu-posts", slug], next);
      toast.success("Banner criado e publicado no carrossel do cardápio.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <section aria-labelledby="promocoes-titulo" className="space-y-6 border-t border-border py-6">
      <div>
        <h3 id="promocoes-titulo" className="font-display text-xl font-semibold">
          Promoções
        </h3>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Monte a semana de promoções com a Lebre. Cada promoção aparece no cardápio do cliente só
          nos dias dela, com a regra completa. O desconto ou a cortesia é aplicado pela equipe.
        </p>
      </div>

      <ol className="grid grid-cols-7 gap-1.5" aria-label="Semana de promoções">
        {WEEK.map((d) => {
          const today = list.filter((p) => p.enabled && (!p.days.length || p.days.includes(d)));
          const weak = WEAK_DAYS.includes(d) && empty.includes(d);
          return (
            <li
              key={d}
              className={`min-h-28 rounded-xl border p-2 text-xs ${weak ? "border-dashed border-amber-500/70 bg-amber-500/5" : "border-border"}`}
            >
              <p className="font-semibold">{WEEKDAYS[d]}</p>
              <ul className="mt-1.5 space-y-1">
                {today.map((p) => (
                  <li key={p.id} className="rounded-md bg-primary/10 px-1.5 py-1 leading-tight">
                    {p.name}
                  </li>
                ))}
              </ul>
              {weak && (
                <p className="mt-1.5 text-amber-700 dark:text-amber-400">Dia fraco, sem promoção</p>
              )}
            </li>
          );
        })}
      </ol>

      <div className="flex flex-col gap-3 rounded-2xl border border-[#2ED3B7]/40 bg-[#2ED3B7]/5 p-4 sm:flex-row sm:items-start">
        <img src={lebreAvatar} alt="" className="size-11 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-3">
          <label className="block text-sm font-medium">
            Peça promoções à Lebre
            <textarea
              className="mt-1 min-h-16 w-full rounded-lg border border-input bg-background p-3 text-sm font-normal"
              maxLength={300}
              value={brief}
              disabled={locked}
              placeholder="Opcional. Ex.: quero encher a segunda à noite sem dar desconto"
              onChange={(e) => setBrief(e.target.value)}
            />
          </label>
          <LebreSuggestionButton
            loading={suggesting}
            disabled={locked || list.length > 17}
            onClick={async () => {
              setSuggesting(true);
              try {
                const ideas = await suggestMenuPromos({
                  data: { slug, ...(brief.trim() ? { brief: brief.trim() } : {}) },
                });
                setDraft([...list, ...ideas].slice(0, 20));
                setBrief("");
                toast.success("A Lebre sugeriu promoções. Revise, ative e salve.");
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setSuggesting(false);
              }
            }}
          >
            Sugerir promoções
          </LebreSuggestionButton>
        </div>
      </div>

      {q.isError && (
        <p role="alert" className="text-sm text-destructive">
          Não foi possível carregar as promoções.{" "}
          <button className="underline" onClick={() => void q.refetch()}>
            Tentar novamente
          </button>
        </p>
      )}

      <div className="space-y-4">
        {list.map((p, i) => (
          <article key={p.id} className="space-y-3 rounded-2xl border border-border p-4">
            {p.why && (
              <p className="flex items-start gap-2 rounded-xl bg-[#2ED3B7]/10 p-3 text-sm">
                <img src={lebreAvatar} alt="" className="size-6 shrink-0 rounded-full" />
                <span>
                  <span className="font-semibold">Por que a Lebre sugere: </span>
                  {p.why}
                </span>
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <label className="block text-xs">
                Nome da promoção
                <Input
                  value={p.name}
                  maxLength={60}
                  disabled={locked}
                  onChange={(e) => patch(i, { name: e.target.value })}
                />
              </label>
              <label className="block text-xs">
                Tipo
                <select
                  className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-2 text-sm"
                  value={p.kind}
                  disabled={locked}
                  onChange={(e) => patch(i, { kind: e.target.value as MenuPromo["kind"] })}
                >
                  {Object.entries(PROMO_KINDS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <fieldset>
              <legend className="text-xs">Dias (nenhum marcado: todos os dias)</legend>
              <div className="mt-1 flex flex-wrap gap-1">
                {WEEK.map((d) => {
                  const on = p.days.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={on}
                      disabled={locked}
                      onClick={() =>
                        patch(i, {
                          days: on ? p.days.filter((x) => x !== d) : [...p.days, d].sort(),
                        })
                      }
                      className={`min-h-11 min-w-11 rounded-lg border px-2 text-sm ${on ? "border-primary bg-primary text-primary-foreground" : "border-input"}`}
                    >
                      {WEEKDAYS[d]}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <div className="flex flex-wrap gap-3">
              <label className="text-xs">
                Das
                <Input
                  type="time"
                  className="w-32"
                  value={p.start}
                  disabled={locked}
                  onChange={(e) => patch(i, { start: e.target.value })}
                />
              </label>
              <label className="text-xs">
                Até
                <Input
                  type="time"
                  className="w-32"
                  value={p.end}
                  disabled={locked}
                  onChange={(e) => patch(i, { end: e.target.value })}
                />
              </label>
              <label className="text-xs">
                Válida até (opcional)
                <Input
                  type="date"
                  className="w-44"
                  value={p.until}
                  disabled={locked}
                  onChange={(e) => patch(i, { until: e.target.value })}
                />
              </label>
            </div>
            <div className="text-xs">
              Pratos da promoção
              <div className="mt-1 flex flex-wrap gap-1.5">
                {p.itemCodes.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1 rounded-full bg-muted py-1 pl-3 pr-1 text-sm"
                  >
                    {name(c)}
                    <button
                      type="button"
                      aria-label={`Retirar ${name(c)}`}
                      disabled={locked || p.itemCodes.length < 2}
                      className="grid size-7 place-items-center rounded-full hover:bg-background"
                      onClick={() => patch(i, { itemCodes: p.itemCodes.filter((x) => x !== c) })}
                    >
                      <X className="size-3.5" />
                    </button>
                  </span>
                ))}
                {p.itemCodes.length < 6 && (
                  <select
                    aria-label="Adicionar prato à promoção"
                    className="h-9 rounded-full border border-input bg-background px-3 text-sm"
                    value=""
                    disabled={locked}
                    onChange={(e) =>
                      e.target.value && patch(i, { itemCodes: [...p.itemCodes, e.target.value] })
                    }
                  >
                    <option value="">+ prato</option>
                    {items
                      .filter((it) => !p.itemCodes.includes(it.code))
                      .map((it) => (
                        <option key={it.code} value={it.code}>
                          {it.name}
                        </option>
                      ))}
                  </select>
                )}
              </div>
            </div>
            <label className="block text-xs">
              Regra para o cliente (dias, pessoas, limite)
              <textarea
                className="mt-1 min-h-16 w-full rounded-lg border border-input bg-background p-3 text-sm"
                maxLength={200}
                value={p.rule}
                disabled={locked}
                onChange={(e) => patch(i, { rule: e.target.value })}
              />
            </label>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={p.enabled}
                  disabled={locked}
                  onChange={(e) => patch(i, { enabled: e.target.checked })}
                />
                Ativa no cardápio
              </label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={locked || draft !== null}
                  title={draft !== null ? "Salve as promoções antes" : undefined}
                  onClick={() => void toBanner(p)}
                >
                  Criar banner
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Excluir ${p.name}`}
                  disabled={locked}
                  onClick={() => setDraft(list.filter((_, n) => n !== i))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={locked || !items.length || list.length >= 20}
          onClick={() =>
            setDraft([
              ...list,
              {
                id: crypto.randomUUID(),
                name: "Nova promoção",
                kind: "cortesia",
                itemCodes: [items[0]!.code],
                days: [],
                start: "",
                end: "",
                rule: "Válida no salão. Não cumulativa com outras promoções.",
                until: "",
                enabled: false,
              },
            ])
          }
        >
          <Plus className="mr-1 size-4" /> Nova promoção
        </Button>
        {draft !== null && (
          <Button
            disabled={locked}
            onClick={async () => {
              setBusy(true);
              try {
                await saveMenuPromos({ data: { slug, promos: list } });
                qc.setQueryData(["menu-promos", slug], list);
                setDraft(null);
                toast.success("Promoções salvas");
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Salvando…" : "Salvar promoções"}
          </Button>
        )}
      </div>

      <details className="rounded-2xl border border-border p-4 text-sm">
        <summary className="min-h-11 cursor-pointer content-center font-semibold">
          O que funciona em promoções no Brasil
        </summary>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-muted-foreground">
          {STUDY.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </details>
    </section>
  );
}
