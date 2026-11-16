import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getBrand, saveBrand, suggestBrand } from "@/lib/tipe/brand.functions";
import { loadMenuLink } from "@/lib/tipe/menu-import.functions";
import { readMenuHtml, releaseMenuSource } from "@/lib/tipe/menu-file";
import { LebreSuggestionButton } from "./LebreSuggestionButton";

export function IdentidadeLebre({ slug }: { slug: string }) {
  const qc = useQueryClient(),
    q = useQuery({ queryKey: ["brand", slug], queryFn: () => getBrand({ data: { slug } }) });
  const [draft, setDraft] = useState<{ links: string[]; summary: string } | null>(null),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const value = draft ?? q.data ?? { links: [], summary: "" };
  const edit = (patch: Partial<typeof value>) => setDraft({ ...value, ...patch });
  return (
    <section className="space-y-4 border-t border-border py-5 lg:col-span-2">
      <h2 className="font-display text-xl font-semibold">A identidade do seu restaurante</h2>
      <p className="max-w-2xl text-sm text-muted-foreground">
        Compartilhe o site e as redes sociais. A Lebre usa o resumo que você revisar para adaptar
        suas respostas ao estilo da casa. Só o resumo compacto é usado nas conversas; as páginas não
        são recarregadas a cada pergunta.
      </p>
      {q.isError ? (
        <p role="alert">
          Não foi possível carregar.{" "}
          <button className="underline" onClick={() => void q.refetch()}>
            Tentar novamente
          </button>
        </p>
      ) : (
        <>
          <label className="block text-sm font-medium">
            Site, Instagram e outros links públicos (um por linha, até cinco)
            <textarea
              className="mt-2 min-h-24 w-full rounded-xl border bg-background p-3 text-sm"
              placeholder={
                "https://seurestaurante.com.br\nhttps://www.instagram.com/seurestaurante"
              }
              disabled={busy || q.isPending}
              value={value.links.join("\n")}
              onChange={(e) => edit({ links: e.target.value.split("\n") })}
            />
          </label>
          <LebreSuggestionButton
            loading={busy}
            disabled={q.isPending || !value.links.some((l) => l.trim())}
            onClick={async () => {
              setBusy(true);
              setNotice("");
              const texts: string[] = [],
                failed: string[] = [];
              try {
                for (const url of value.links
                  .map((l) => l.trim())
                  .filter(Boolean)
                  .slice(0, 5)) {
                  try {
                    const r = await loadMenuLink({ data: { slug, url } });
                    if (r.kind !== "html")
                      throw new Error("Use uma página pública do restaurante.");
                    const source = readMenuHtml(r.content, r.url);
                    texts.push(
                      source.pages
                        .map((p) => p.text)
                        .join("\n")
                        .slice(0, 5000),
                    );
                    releaseMenuSource(source);
                  } catch {
                    failed.push(url);
                  }
                }
                if (!texts.length)
                  throw new Error(
                    "Esses sites não permitiram a leitura pública. Cole no resumo as informações que a Lebre deve conhecer.",
                  );
                const result = await suggestBrand({
                  data: { slug, text: texts.join("\n").slice(0, 18000) },
                });
                edit({ summary: result.summary });
                setNotice(
                  "Resumo sugerido. Confira os fatos e salve para a Lebre passar a usá-lo." +
                    (failed.length
                      ? " Alguns links não permitiram leitura; complete com as informações dessas páginas."
                      : ""),
                );
              } catch (e) {
                setNotice((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Conhecer o restaurante com a Lebre
          </LebreSuggestionButton>
          <label className="block text-sm font-medium">
            O que a Lebre deve conhecer
            <textarea
              className="mt-2 min-h-36 w-full rounded-xl border bg-background p-3 text-sm"
              maxLength={1400}
              disabled={busy || q.isPending}
              value={value.summary}
              placeholder="Tipo de cozinha, ambiente, proposta e forma de conversar com os clientes."
              onChange={(e) => edit({ summary: e.target.value })}
            />
          </label>
          <p className="text-xs text-muted-foreground">
            {value.summary.length}/1400 caracteres. Revise sempre que a identidade mudar. A Lebre
            não acessa perfis privados ou páginas que exigem login.
          </p>
          <Button
            disabled={busy || q.isPending || draft === null}
            onClick={async () => {
              setBusy(true);
              try {
                const brand = { ...value, links: value.links.map((l) => l.trim()).filter(Boolean) };
                await saveBrand({ data: { slug, brand } });
                qc.setQueryData(["brand", slug], brand);
                setDraft(null);
                toast.success("Identidade guardada para a Lebre");
              } catch (e) {
                setNotice((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Salvar identidade
          </Button>
        </>
      )}
      {notice && (
        <p role="status" className="max-w-2xl text-sm text-muted-foreground">
          {notice}
        </p>
      )}
    </section>
  );
}
