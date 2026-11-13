/**
 * Catálogo de integrações com passo a passo (03/11). A pessoa escolhe a categoria e o
 * sistema; abre o passo a passo daquele sistema, com o jeito de conectar que ela escolher
 * (chave de API, autorização da conta, arquivo, certificado ou API TIPE).
 * No site, termina no teste grátis; no painel, `acao` recebe o formulário de envio.
 */
import { useMemo, useState, type ReactNode } from "react";
import { Check, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  CATEGORIAS,
  METODOS,
  SISTEMAS,
  passosPara,
  type CategoriaId,
  type MetodoId,
  type Sistema,
} from "./catalogo";
import { LOGOS } from "./logos";

export function MarcaSistema({ sis, tamanho = "md" }: { sis: Sistema; tamanho?: "md" | "lg" }) {
  const logo = sis.logo ? LOGOS[sis.logo] : undefined;
  const lado = tamanho === "lg" ? "h-12 w-12" : "h-10 w-10";
  if (logo)
    return (
      <span
        className={cn(
          "grid shrink-0 place-items-center rounded-xl bg-white ring-1 ring-black/[0.06]",
          lado,
        )}
      >
        <svg viewBox="0 0 24 24" className="h-[58%] w-[58%]" aria-hidden fill={logo.cor}>
          <path d={logo.d} />
        </svg>
      </span>
    );
  const iniciais = sis.nome
    .replace(/\(.*\)/, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-xl bg-[#021E34] font-display font-medium tracking-[-0.04em] text-[#0FC9BD]",
        lado,
        tamanho === "lg" ? "text-lg" : "text-[0.95rem]",
      )}
      aria-hidden
    >
      {iniciais}
    </span>
  );
}

export function CatalogoIntegracoes({
  acao,
  className,
}: {
  /** Painel: formulário de envio da chave/arquivo para o sistema e o método escolhidos. */
  acao?: (sis: Sistema, metodo: MetodoId) => ReactNode;
  className?: string;
}) {
  const [cat, setCat] = useState<CategoriaId | "todas">("todas");
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<Sistema | null>(null);
  const [metodo, setMetodo] = useState<MetodoId>("api");

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return SISTEMAS.filter(
      (s) => (cat === "todas" || s.cat === cat) && (!q || s.nome.toLowerCase().includes(q)),
    );
  }, [cat, busca]);

  const abrir = (s: Sistema) => {
    setAberto(s);
    setMetodo(s.metodos[0]!);
  };

  return (
    <div className={className}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:px-0">
          {[{ id: "todas" as const, titulo: "Todas" }, ...CATEGORIAS].map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCat(c.id)}
              aria-pressed={cat === c.id}
              className={cn(
                "h-10 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors",
                cat === c.id
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background hover:border-foreground/40",
              )}
            >
              {c.titulo}
            </button>
          ))}
        </div>
        <label className="relative block lg:w-72">
          <span className="sr-only">Buscar sistema</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Ex.: Saipos, iFood, Omie"
            className="h-11 w-full rounded-full border border-border bg-background pl-10 pr-4 text-[0.95rem] outline-none focus-visible:border-foreground"
          />
        </label>
      </div>

      <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {lista.map((s) => {
          const c = CATEGORIAS.find((x) => x.id === s.cat)!;
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => abrir(s)}
                className="group flex h-full w-full flex-col gap-4 rounded-[1.4rem] border border-border bg-card p-4 text-left transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-foreground/30 sm:p-5"
              >
                <span className="flex items-start justify-between gap-2">
                  <MarcaSistema sis={s} />
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#0FC9BD]/12 px-2 py-0.5 text-[0.68rem] font-medium text-[#08766f]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#0FC9BD]" />
                    {s.id === "pagarme"
                      ? "Sujeito à validação"
                      : s.nativo
                        ? "Disponível"
                        : "Sob consulta"}
                  </span>
                </span>
                <span>
                  <span className="block font-display text-[1.1rem] font-medium leading-tight tracking-[-0.03em] sm:text-[1.2rem]">
                    {s.nome}
                  </span>
                  <span className="mt-1 block text-[0.8rem] text-muted-foreground">{c.titulo}</span>
                </span>
              </button>
            </li>
          );
        })}
        {lista.length === 0 && (
          <li className="col-span-full rounded-[1.4rem] border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Não achou o seu sistema? Escolha{" "}
            <button
              type="button"
              className="font-medium text-foreground underline"
              onClick={() => abrir(SISTEMAS.find((x) => x.id === "outro-pdv")!)}
            >
              Outro sistema
            </button>{" "}
            e conecte pela API TIPE ou por arquivo.
          </li>
        )}
      </ul>

      <Dialog open={!!aberto} onOpenChange={(v) => !v && setAberto(null)}>
        <DialogContent className="max-h-[92svh] overflow-y-auto rounded-[1.6rem] p-0 sm:max-w-xl [&>button]:hidden">
          {aberto && (
            <div className="p-5 sm:p-7">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <MarcaSistema sis={aberto} tamanho="lg" />
                  <div>
                    <DialogTitle className="font-display text-[1.45rem] font-medium leading-tight tracking-[-0.035em]">
                      Conectar {aberto.nome}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground">
                      {CATEGORIAS.find((x) => x.id === aberto.cat)!.titulo} · passo a passo
                    </DialogDescription>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAberto(null)}
                  aria-label="Fechar"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full hover:bg-muted"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {aberto.metodos.length > 1 && (
                <div className="mt-5">
                  <p className="text-sm font-medium">Como você quer conectar?</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {aberto.metodos.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMetodo(m)}
                        aria-pressed={metodo === m}
                        className={cn(
                          "rounded-2xl border p-3 text-left transition-colors",
                          metodo === m
                            ? "border-foreground ring-1 ring-foreground"
                            : "border-border hover:border-foreground/40",
                        )}
                      >
                        <span className="block text-[0.95rem] font-medium">
                          {METODOS[m].titulo}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {METODOS[m].sub}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <ol className="mt-6 space-y-4">
                {passosPara(aberto, metodo).map((p, i) => (
                  <li key={p.titulo} className="flex gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#021E34] text-xs font-medium text-[#0FC9BD]">
                      {i + 1}
                    </span>
                    <span>
                      <span className="block font-medium leading-snug">{p.titulo}</span>
                      <span className="mt-0.5 block text-sm leading-relaxed text-muted-foreground">
                        {p.texto}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>

              <div className="mt-6 border-t border-border pt-5">
                {acao ? (
                  acao(aberto, metodo)
                ) : (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <a
                      href={`/solicitar-demonstracao?integracao=${aberto.id}`}
                      className="btn-tema inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full px-6 font-medium"
                    >
                      Começar e conectar
                    </a>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground sm:max-w-[13rem]">
                      <Check className="h-3.5 w-3.5 shrink-0 text-[#0FC9BD]" />
                      Você envia a chave ou o arquivo no painel, já no primeiro dia.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
