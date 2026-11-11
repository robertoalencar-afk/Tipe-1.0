import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  addBancoImagem,
  getBancoImagens,
  removeBancoImagem,
  usarImagemDoBanco,
} from "@/lib/tipe/midia.functions";
import { reduzirImagem } from "@/components/tipe/UploadImagem";

type Item = { id: string; name: string };

/** Banco de imagens do restaurante: envie várias fotos e aplique cada uma a um prato. */
export function BancoImagens({
  slug,
  podeDono,
  itens,
  onAplicada,
}: {
  slug: string;
  podeDono: boolean;
  itens: Item[];
  onAplicada: () => void;
}) {
  const qc = useQueryClient();
  const fetchB = useServerFn(getBancoImagens);
  const add = useServerFn(addBancoImagem);
  const del = useServerFn(removeBancoImagem);
  const usar = useServerFn(usarImagemDoBanco);
  const q = useQuery({
    queryKey: ["banco-imagens", slug],
    queryFn: () => fetchB({ data: { slug } }),
  });
  const ref = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(0);
  const [escolhida, setEscolhida] = useState<string | null>(null);
  const [aplicando, setAplicando] = useState(false);

  async function enviar(files: FileList | null) {
    if (!files?.length) return;
    setEnviando(files.length);
    let ok = 0;
    for (const f of Array.from(files)) {
      try {
        await add({ data: { slug, imagem: await reduzirImagem(f, 1200) } });
        ok += 1;
      } catch (e) {
        toast.error(`${f.name}: ${(e as Error).message}`);
      }
      setEnviando((n) => n - 1);
    }
    if (ok) toast.success(ok === 1 ? "Imagem enviada" : `${ok} imagens enviadas`);
    if (ref.current) ref.current.value = "";
    await qc.invalidateQueries({ queryKey: ["banco-imagens", slug] });
  }
  async function aplicar(nome: string, itemId: string) {
    setAplicando(true);
    try {
      await usar({ data: { slug, itemId, nome } });
      toast.success("Foto aplicada ao prato");
      setEscolhida(null);
      onAplicada();
    } catch (e) {
      toast.error((e as Error).message);
    }
    setAplicando(false);
  }
  async function remover(nome: string) {
    try {
      await del({ data: { slug, nome } });
      toast.success("Imagem removida");
      await qc.invalidateQueries({ queryKey: ["banco-imagens", slug] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  const imagens = q.data?.imagens ?? [];
  return (
    <section className="surface-card space-y-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display font-semibold">Banco de imagens</h2>
          <p className="text-xs text-muted-foreground">
            Guarde as fotos do restaurante em um só lugar e use em qualquer prato. PNG, JPG ou WebP;
            o sistema reduz o tamanho sozinho.
          </p>
        </div>
        {podeDono && (
          <>
            <input
              ref={ref}
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              aria-label="Enviar imagens"
              onChange={(e) => void enviar(e.target.files)}
            />
            <Button type="button" onClick={() => ref.current?.click()} disabled={enviando > 0}>
              {enviando > 0 ? (
                <Loader2 className="mr-1.5 size-4 animate-spin" />
              ) : (
                <ImagePlus className="mr-1.5 size-4" />
              )}
              {enviando > 0 ? `Enviando… (${enviando})` : "Enviar imagens"}
            </Button>
          </>
        )}
      </div>
      {q.isPending ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="aspect-square animate-pulse rounded-xl bg-muted motion-reduce:animate-none"
            />
          ))}
        </div>
      ) : q.isError ? (
        <div role="alert" className="space-y-2 text-sm">
          <p>Não foi possível carregar as imagens.</p>
          <Button variant="outline" onClick={() => void q.refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : imagens.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Nenhuma imagem ainda.{" "}
          {podeDono
            ? "Envie fotos autorizadas para exibição pública no cardápio."
            : "O administrador pode enviar as fotos."}
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {imagens.map((im) => (
            <li key={im.nome} className="min-w-0 space-y-1.5">
              <div className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-muted">
                <img src={im.url} alt="" loading="lazy" className="size-full object-cover" />
                {podeDono && (
                  <button
                    type="button"
                    onClick={() => void remover(im.nome)}
                    className="absolute right-1.5 top-1.5 grid size-8 place-items-center rounded-full bg-black/60 text-white opacity-100 transition-opacity hover:bg-black/80 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                    aria-label="Remover imagem"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
              {podeDono &&
                (escolhida === im.nome ? (
                  <select
                    autoFocus
                    disabled={aplicando}
                    defaultValue=""
                    onChange={(e) => e.target.value && void aplicar(im.nome, e.target.value)}
                    onBlur={() => setEscolhida(null)}
                    className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm"
                    aria-label="Escolher prato"
                  >
                    <option value="" disabled>
                      Escolha o prato
                    </option>
                    {itens.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => setEscolhida(im.nome)}
                  >
                    Usar em um prato
                  </Button>
                ))}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
