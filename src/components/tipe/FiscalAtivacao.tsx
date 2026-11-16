import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Circle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getFiscalDocuments, getFiscalProducts, getFiscalSetup } from "@/lib/tipe/fiscal.functions";
import { passosAtivacaoFiscal, chaveTesteImpressao } from "@/lib/tipe/fiscal/ativacao";

/** Passo a passo de ativação da NFC-e, lido do estado real da configuração. */
export function FiscalAtivacao({
  slug,
  onIr,
}: {
  slug: string;
  onIr: (aba: string, ambiente?: "homologacao" | "producao") => void;
}) {
  const setup = useServerFn(getFiscalSetup);
  const produtos = useServerFn(getFiscalProducts);
  const docs = useServerFn(getFiscalDocuments);
  const hom = useQuery({
    queryKey: ["fiscal-setup", slug, "homologacao"],
    queryFn: () => setup({ data: { slug, environment: "homologacao" } }),
  });
  const prod = useQuery({
    queryKey: ["fiscal-setup", slug, "producao"],
    queryFn: () => setup({ data: { slug, environment: "producao" } }),
  });
  const perfis = useQuery({
    queryKey: ["fiscal-ativacao-produtos", slug],
    queryFn: () => produtos({ data: { slug, environment: "homologacao", offset: 0 } }),
  });
  const notas = useQuery({
    queryKey: ["fiscal-ativacao-docs", slug],
    queryFn: () => docs({ data: { slug, environment: "homologacao" } }),
  });
  const [impressaoTestada, setImpressaoTestada] = useState(false);
  useEffect(() => {
    try {
      setImpressaoTestada(Boolean(localStorage.getItem(chaveTesteImpressao(slug))));
    } catch {
      /* sem armazenamento local */
    }
  }, [slug]);

  const carregando = hom.isLoading || prod.isLoading || perfis.isLoading || notas.isLoading;
  const passos = passosAtivacaoFiscal({
    homologacao: hom.data?.settings ?? null,
    producao: prod.data?.settings ?? null,
    perfis: perfis.data?.profiles?.length ?? 0,
    notaHomologacaoAutorizada: (notas.data?.documents ?? []).some((d) => d.state === "authorized"),
    impressaoTestada,
  });
  const feitos = passos.filter((p) => p.feito).length;

  return (
    <section className="surface-card p-4 sm:p-6">
      <h3 className="font-semibold">Ativar a NFC-e</h3>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Siga na ordem. A nota é emitida com o CNPJ, o certificado e o CSC do restaurante. A Tipe
        envia pelo emissor Focus NFe. A produção só libera depois de uma nota autorizada em
        homologação.
      </p>
      <p className="mt-3 text-sm font-medium" aria-live="polite">
        {carregando
          ? "Conferindo sua configuração…"
          : `${feitos} de ${passos.length} passos concluídos`}
      </p>
      <ol className="mt-4 space-y-3">
        {passos.map((p, i) => (
          <li key={p.id} className="flex gap-3 rounded-xl border border-border p-4">
            {p.feito ? (
              <CheckCircle2
                className="mt-0.5 size-5 shrink-0 text-primary"
                aria-label="Concluído"
              />
            ) : (
              <Circle
                className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                aria-label="Pendente"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                {i + 1}. {p.titulo}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{p.texto}</p>
              {p.link ? (
                <a
                  href={p.link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-sm font-medium underline"
                >
                  {p.link.rotulo} <ExternalLink className="size-3.5" aria-hidden="true" />
                </a>
              ) : null}
              {p.aba ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => onIr(p.aba!, p.ambiente)}
                >
                  {p.acao}
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-xs text-muted-foreground">
        Dúvidas sobre CFOP, CSOSN, NCM e IBS/CBS são do contador do restaurante. Este passo a passo
        não substitui a orientação dele.
      </p>
    </section>
  );
}
