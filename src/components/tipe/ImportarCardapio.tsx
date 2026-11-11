import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { importMenuCsv } from "@/lib/tipe/pdv-integrations.functions";
import { parseMenuCsv, type MenuRow } from "@/lib/tipe/menu-csv";

export function ImportarCardapio({ slug, onDone }: { slug: string; onDone: () => void }) {
  const importar = useServerFn(importMenuCsv);
  const [rows, setRows] = useState<MenuRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function ler(file?: File) {
    setRows([]);
    setError("");
    if (!file) return;
    try {
      if (file.size > 1_000_000) throw new Error("Use um CSV de até 1 MB");
      setRows(parseMenuCsv(await file.text()));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <section className="surface-card space-y-3 p-4 sm:p-5">
      <h3 className="font-display font-semibold">Migrar cardápio de outro sistema</h3>
      <p className="text-sm text-muted-foreground">
        Exporte o cardápio do sistema atual como CSV e organize as colunas na ordem abaixo. Confira
        a prévia antes de importar. Fotos são adicionadas pelo banco de imagens.
      </p>
      <a
        className="inline-block text-sm underline underline-offset-4"
        href={`data:text/csv;charset=utf-8,${encodeURIComponent("categoria;codigo;item;preco;ativo\nPratos;P01;Prato exemplo;12,50;sim\n")}`}
        download="modelo-cardapio-tipe.csv"
      >
        Baixar modelo CSV
      </a>
      <p className="text-xs text-muted-foreground">
        Categoria; código; item; preço; ativo (sim/não). Códigos iguais atualizam nome, categoria,
        preço e disponibilidade. Os demais produtos e suas fotos são preservados. Até 500 itens por
        arquivo.
      </p>
      <Input
        aria-label="Selecionar CSV do cardápio"
        type="file"
        accept=".csv,text/csv"
        disabled={busy}
        onChange={(e) => {
          void ler(e.target.files?.[0]);
          e.currentTarget.value = "";
        }}
      />
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {rows.length > 0 && (
        <>
          <p role="status" className="text-sm font-medium">
            {rows.length === 1
              ? "1 item pronto para importar"
              : `${rows.length} itens prontos para importar`}
          </p>
          <div className="max-h-64 overflow-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Prévia do cardápio</caption>
              <thead>
                <tr>
                  <th className="p-2">Código / item</th>
                  <th className="p-2">Preço / ativo</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.code} className="border-t border-border">
                    <td className="p-2">
                      {r.code} — {r.name}
                      <span className="block text-xs text-muted-foreground">{r.category}</span>
                    </td>
                    <td className="p-2">
                      {r.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      <span className="block text-xs">{r.available ? "Sim" : "Não"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  const r = await importar({ data: { slug, rows } });
                  toast.success(`${r.imported} itens importados`);
                  setRows([]);
                  onDone();
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Importando…" : "Confirmar importação"}
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => setRows([])}>
              Cancelar
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
