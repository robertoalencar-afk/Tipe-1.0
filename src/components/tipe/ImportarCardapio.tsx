import { useEffect, useRef, useState } from "react";
import { FileUp, Link as LinkIcon, Check, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LebreSuggestionButton } from "./LebreSuggestionButton";
import {
  analyzeMenuSource,
  loadMenuLink,
  prepareImportedPhoto,
  publishMenuImport,
} from "@/lib/tipe/menu-import.functions";
import { readMenuFile, readMenuHtml, releaseMenuSource, cropMenuPhoto } from "@/lib/tipe/menu-file";
import { parseMenuCsv } from "@/lib/tipe/menu-csv";
import type { ImportedDish, ImportSource } from "@/lib/tipe/menu-import";
import { prepareDishDepth, photoBlobDataUrl } from "@/lib/tipe/order/prepare-photo";
import { reduzirImagem } from "./UploadImagem";
type Draft = ImportedDish & { code: string; selected: boolean; priceText: string };
type Asset = { name: string; depthName: string };
const priceOf = (text: string) => (text.trim() ? Number(text.replace(",", ".")) : NaN);
const decodeFile = (content: string, type: string, url: string) => {
  const bytes = Uint8Array.from(atob(content), (c) => c.charCodeAt(0));
  const extensions: Record<string, string> = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "text/csv": "csv",
    "text/plain": "txt",
  };
  return new File(
    [bytes],
    extensions[type]
      ? `cardapio.${extensions[type]}`
      : new URL(url).pathname.split("/").pop() || "cardapio",
    { type },
  );
};
export function ImportarCardapio({ slug, onDone }: { slug: string; onDone: () => void }) {
  const [mode, setMode] = useState<"file" | "link">("file");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<Draft[]>([]);
  const [source, setSource] = useState<ImportSource | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [allowNoPhoto, setAllowNoPhoto] = useState(false);
  const [replace, setReplace] = useState(false);
  const assets = useRef(new Map<string, Asset>());
  const sourceRef = useRef<ImportSource | null>(null);
  const locked = useRef(false);
  useEffect(
    () => () => {
      if (sourceRef.current) releaseMenuSource(sourceRef.current);
    },
    [],
  );
  function clear() {
    if (sourceRef.current) releaseMenuSource(sourceRef.current);
    sourceRef.current = null;
    setSource(null);
    setRows([]);
    setWarnings([]);
    setConfirmed(false);
    assets.current.clear();
  }
  async function analyze() {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    setProgress("Preparando o cardápio…");
    clear();
    try {
      let input: File | null = file,
        parsed: ImportSource;
      if (mode === "link") {
        const remote = await loadMenuLink({ data: { slug, url } });
        if (remote.kind === "html") parsed = readMenuHtml(remote.content, remote.url);
        else {
          input = decodeFile(remote.content, remote.type, remote.url);
          parsed = await readMenuFile(input, setProgress);
        }
      } else {
        if (!input) throw new Error("Escolha um arquivo.");
        parsed = await readMenuFile(input, setProgress);
      }
      sourceRef.current = parsed;
      setSource(parsed);
      let dishes: ImportedDish[] = [];
      const notices = [...parsed.warnings];
      if (input?.name.toLowerCase().endsWith(".csv")) {
        try {
          dishes = parseMenuCsv(await input.text()).map((r) => ({
            ...r,
            description: "",
            imageIndex: null,
            photoBounds: null,
          }));
        } catch {
          /* unstructured CSV goes to the same review */
        }
      }
      if (!dishes.length)
        for (let i = 0; i < parsed.pages.length; i++) {
          setProgress(`A Lebre está lendo ${i + 1} de ${parsed.pages.length} parte(s)…`);
          const result = await analyzeMenuSource({ data: { slug, ...parsed.pages[i]! } });
          for (const dish of result.items) {
            const pageImage = parsed.pages[i]?.image;
            if (dish.photoBounds && pageImage && parsed.photos.length < 60) {
              const crop = await cropMenuPhoto(pageImage, dish.photoBounds);
              dish.imageIndex = parsed.photos.length;
              parsed.photos.push({ name: `Conferir recorte · ${dish.name}`, url: crop });
            }
          }
          dishes.push(...result.items);
          notices.push(...result.warnings);
        }
      if (!dishes.length)
        throw new Error(
          "Não encontrei pratos com segurança. Tente um arquivo mais legível ou o modelo CSV.",
        );
      if (dishes.length > 200)
        throw new Error(
          "Foram encontrados mais de 200 itens. Divida o arquivo para revisar por partes.",
        );
      const batch = crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
      setRows(
        dishes.map((dish, i) => ({
          ...dish,
          code: `I${batch}${String(i).padStart(3, "0")}`,
          selected: true,
          priceText: dish.price === null ? "" : dish.price.toFixed(2).replace(".", ","),
        })),
      );
      setWarnings([...new Set(notices)]);
      setProgress("");
    } catch (e) {
      setError((e as Error).message);
      setProgress("");
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  function edit(index: number, patch: Partial<Draft>) {
    setConfirmed(false);
    setRows((current) => current.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }
  async function publish() {
    if (locked.current || !confirmed) return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      const selected = rows.filter((r) => r.selected);
      const prepared = [];
      for (const [index, row] of selected.entries()) {
        let asset: Asset | null = null;
        const photo = row.imageIndex === null ? null : source?.photos[row.imageIndex];
        if (!photo && !allowNoPhoto)
          throw new Error(`Escolha uma foto de ${row.name} antes de publicar.`);
        if (photo) {
          const cached = assets.current.get(photo.url);
          if (cached) asset = cached;
          else {
            setProgress(`Preparando foto ${index + 1} de ${selected.length} para os stories…`);
            let image: File;
            if (photo.url.startsWith("https:")) {
              const remote = await loadMenuLink({ data: { slug, url: photo.url } });
              if (remote.kind !== "file" || !remote.type.startsWith("image/"))
                throw new Error(
                  "A foto do link não está acessível. Escolha outra ou envie uma foto deste prato.",
                );
              image = decodeFile(remote.content, remote.type, remote.url);
            } else {
              const response = await fetch(photo.url);
              const blob = await response.blob();
              image = new File([blob], "prato.jpg", { type: blob.type });
            }
            const depth = await prepareDishDepth(image, setProgress);
            asset = await prepareImportedPhoto({
              data: {
                slug,
                image: await reduzirImagem(image, 1200),
                depth: await photoBlobDataUrl(depth),
              },
            });
            assets.current.set(photo.url, asset);
          }
        }
        prepared.push({
          code: row.code,
          name: row.name,
          category: row.category,
          description: row.description,
          price: priceOf(row.priceText),
          asset,
        });
      }
      setProgress("Publicando os itens revisados…");
      const result = await publishMenuImport({
        data: { slug, rows: prepared, replace, allowNoPhoto },
      });
      toast.success(`${result.imported} itens publicados no cardápio`);
      clear();
      setFile(null);
      setUrl("");
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      locked.current = false;
      setProgress("");
    }
  }
  const selected = rows.filter((r) => r.selected);
  const ready = (r: Draft) =>
    r.name.trim().length >= 2 &&
    r.category.trim().length >= 2 &&
    r.category.trim().toLowerCase() !== "para organizar" &&
    r.description.trim().length >= 10 &&
    (allowNoPhoto || (r.imageIndex !== null && !!source?.photos[r.imageIndex])) &&
    Number.isFinite(priceOf(r.priceText)) &&
    priceOf(r.priceText) >= 0 &&
    priceOf(r.priceText) <= 10000;
  const valid = selected.length > 0 && selected.every(ready);
  return (
    <section className="space-y-5 border-t border-border py-6">
      <div>
        <h3 className="font-display text-xl font-semibold">Traga seu cardápio</h3>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Envie um arquivo ou cole um link. A Lebre organiza os pratos; você confere textos, preços
          e fotos antes de publicar.
        </p>
      </div>
      {!rows.length ? (
        <>
          <div role="group" aria-label="Origem do cardápio" className="flex gap-2">
            <Button
              variant={mode === "file" ? "default" : "outline"}
              disabled={busy}
              onClick={() => setMode("file")}
            >
              <FileUp className="size-4" /> Arquivo
            </Button>
            <Button
              variant={mode === "link" ? "default" : "outline"}
              disabled={busy}
              onClick={() => setMode("link")}
            >
              <LinkIcon className="size-4" /> Link
            </Button>
          </div>
          {mode === "file" ? (
            <div className="space-y-2">
              <Input
                type="file"
                accept=".pdf,.docx,.xlsx,.csv,.txt,.png,.jpg,.jpeg,.webp"
                aria-label="Arquivo do cardápio"
                disabled={busy}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">
                PDF, Word (.docx), Excel (.xlsx), CSV, texto ou imagem. Até 8 MB, 12 páginas de PDF
                e 200 itens. Arquivos .doc e .xls: salve no formato atual ou em PDF.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Input
                type="url"
                aria-label="Link público do cardápio"
                placeholder="https://…"
                value={url}
                disabled={busy}
                onChange={(e) => setUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Link público de página ou arquivo. Sites com login ou conteúdo carregado apenas por
                aplicativo podem exigir o envio do arquivo.
              </p>
            </div>
          )}
          <LebreSuggestionButton
            loading={busy}
            loadingText="A Lebre está lendo…"
            disabled={mode === "file" ? !file : !url.trim()}
            onClick={() => void analyze()}
          >
            Organizar com a Lebre
          </LebreSuggestionButton>
          <a
            className="ml-3 inline-block text-xs underline underline-offset-4"
            href={`data:text/csv;charset=utf-8,${encodeURIComponent("categoria;codigo;item;preco;ativo\nPratos;P01;Prato exemplo;12,50;sim\n")}`}
            download="modelo-cardapio-tipe.csv"
          >
            Baixar modelo CSV
          </a>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="font-semibold">Revise {rows.length} itens encontrados</h4>
            <Button variant="ghost" disabled={busy} onClick={clear}>
              Trocar arquivo ou link
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => {
                setConfirmed(false);
                setRows((current) => current.map((r) => ({ ...r, selected: true })));
              }}
            >
              Selecionar todos
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => {
                setConfirmed(false);
                setRows((current) => current.map((r) => ({ ...r, selected: false })));
              }}
            >
              Desmarcar todos
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => {
                setConfirmed(false);
                setRows((current) => current.map((r) => ({ ...r, selected: ready(r) })));
              }}
            >
              Selecionar completos ({rows.filter(ready).length})
            </Button>
          </div>
          {!!warnings.length && (
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          )}
          <p className="text-sm text-muted-foreground">
            Cada prato precisa de nome, categoria definida, descrição com detalhes confirmados,
            preço e foto. A foto passa pelo motor de volume antes da publicação. Complete as
            pendências ou desmarque o item para cuidar dele depois.
          </p>
          {!!source?.photos.length && (
            <details className="rounded-xl border border-border p-3">
              <summary className="cursor-pointer text-sm font-medium">
                Ver {source.photos.length} fotos extraídas
              </summary>
              <ul className="mt-3 grid max-h-80 grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-5">
                {source.photos.map((photo, i) => (
                  <li key={i}>
                    <img
                      src={photo.url}
                      alt={photo.name}
                      loading="lazy"
                      className="aspect-square w-full rounded-lg object-cover"
                    />
                    <p className="mt-1 text-xs">
                      {i + 1}. {photo.name}
                    </p>
                  </li>
                ))}
              </ul>
            </details>
          )}
          <div className="max-h-[65dvh] space-y-4 overflow-y-auto pr-2">
            {rows.map((row, index) => (
              <article key={row.code} className="space-y-3 rounded-xl border border-border p-4">
                <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={row.selected}
                    disabled={busy}
                    onChange={(e) => edit(index, { selected: e.target.checked })}
                  />{" "}
                  Incluir item {index + 1}
                </label>
                <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
                  <label className="text-xs">
                    Nome
                    <Input
                      maxLength={80}
                      disabled={busy}
                      value={row.name}
                      onChange={(e) => edit(index, { name: e.target.value })}
                    />
                  </label>
                  <label className="text-xs">
                    Preço (R$)
                    <Input
                      inputMode="decimal"
                      aria-invalid={row.selected && !Number.isFinite(priceOf(row.priceText))}
                      placeholder="Conferir"
                      disabled={busy}
                      value={row.priceText}
                      onChange={(e) => edit(index, { priceText: e.target.value })}
                    />
                  </label>
                </div>
                <label className="block text-xs">
                  Categoria
                  <Input
                    maxLength={60}
                    disabled={busy}
                    value={row.category}
                    onChange={(e) => edit(index, { category: e.target.value })}
                  />
                </label>
                <label className="block text-xs">
                  Descrição e detalhes do prato (obrigatório)
                  <textarea
                    maxLength={200}
                    disabled={busy}
                    className="mt-1 min-h-20 w-full rounded-lg border border-input bg-background p-3 text-sm"
                    value={row.description}
                    onChange={(e) => edit(index, { description: e.target.value })}
                  />
                </label>
                {!!source?.photos.length && (
                  <div className="flex items-center gap-3">
                    <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted">
                      {row.imageIndex === null ? (
                        <ImageIcon className="size-5 text-muted-foreground" />
                      ) : (
                        <img
                          src={source.photos[row.imageIndex]?.url}
                          alt="Foto selecionada"
                          className="size-full object-cover"
                        />
                      )}
                    </div>
                    <label className="min-w-0 flex-1 text-xs">
                      Foto extraída
                      <select
                        className="mt-1 h-11 w-full rounded-lg border border-input bg-background px-2 text-sm"
                        disabled={busy}
                        value={row.imageIndex ?? ""}
                        onChange={(e) =>
                          edit(index, {
                            imageIndex: e.target.value === "" ? null : Number(e.target.value),
                          })
                        }
                      >
                        <option value="">Escolher foto (obrigatório)</option>
                        {source.photos.map((photo, i) => (
                          <option key={i} value={i}>
                            {i + 1}. {photo.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}
                <label className="block text-xs">
                  Enviar foto deste prato
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={busy}
                    onChange={async (e) => {
                      const image = e.target.files?.[0];
                      if (!image || !sourceRef.current) return;
                      if (image.size > 8_000_000) {
                        setError("A foto deve ter até 8 MB.");
                        return;
                      }
                      if (sourceRef.current.photos.length >= 60) {
                        setError("Limite de 60 fotos por importação. Divida o cardápio em partes.");
                        return;
                      }
                      const indexPhoto = sourceRef.current.photos.length;
                      sourceRef.current.photos.push({
                        name: `Foto enviada · ${row.name}`,
                        url: URL.createObjectURL(image),
                      });
                      setSource({ ...sourceRef.current });
                      edit(index, { imageIndex: indexPhoto });
                    }}
                  />
                </label>
                {row.selected &&
                  (!row.description.trim() ||
                    row.description.trim().length < 10 ||
                    (!allowNoPhoto && row.imageIndex === null) ||
                    row.category.toLowerCase() === "para organizar" ||
                    !row.priceText.trim()) && (
                    <p className="text-xs text-amber-800">
                      Pendente: confira categoria, descrição, preço e foto. Este prato ainda não
                      está pronto para publicar.
                    </p>
                  )}
              </article>
            ))}
          </div>
          <label className="flex min-h-11 items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={allowNoPhoto}
              disabled={busy}
              onChange={(e) => {
                setAllowNoPhoto(e.target.checked);
                setConfirmed(false);
              }}
            />
            Permitir itens sem foto. As fotos disponíveis continuam passando pelo motor de volume.
          </label>
          <label className="flex min-h-11 items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={replace}
              disabled={busy}
              onChange={(e) => {
                setReplace(e.target.checked);
                setConfirmed(false);
              }}
            />{" "}
            Substituir o cardápio atual: os pratos anteriores ficarão indisponíveis, com seu
            histórico preservado.
          </label>
          <label className="flex min-h-11 items-start gap-3 text-sm">
            <input
              className="mt-1"
              type="checkbox"
              disabled={busy || !valid}
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />{" "}
            Conferi os textos, preços e fotos selecionados e tenho autorização para publicá-los.
          </label>
          <Button disabled={busy || !confirmed || !valid} onClick={() => void publish()}>
            <Check className="size-4" />{" "}
            {busy ? "Publicando…" : `Publicar ${selected.length} itens`}
          </Button>
        </>
      )}
      {progress && (
        <p role="status" className="text-sm text-muted-foreground">
          {progress}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
