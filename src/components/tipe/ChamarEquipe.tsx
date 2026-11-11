import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { callStaff, type TipoChamado } from "@/lib/tipe/chamados.functions";

const ESPERA_MS = 120_000;

/** "Chamar garçom" na conta do QR: avisa a equipe sem ninguém levantar a mão. */
export function ChamarEquipe({
  slug,
  mesa,
  session,
}: {
  slug: string;
  mesa: string;
  session: string;
}) {
  const chamar = useServerFn(callStaff);
  const [enviando, setEnviando] = useState<TipoChamado | null>(null);
  const [avisado, setAvisado] = useState<Partial<Record<TipoChamado, number>>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [agora, setAgora] = useState(() => Date.now());

  const esperando = (k: TipoChamado) => (avisado[k] ?? 0) + ESPERA_MS > agora;
  const algumEsperando = esperando("waiter") || esperando("bill");
  useEffect(() => {
    if (!algumEsperando) return;
    const t = setInterval(() => setAgora(Date.now()), 5000);
    return () => clearInterval(t);
  }, [algumEsperando]);

  async function pedir(kind: TipoChamado) {
    setEnviando(kind);
    setErro(null);
    try {
      await chamar({ data: { slug, table: mesa, session, kind } });
      const t = Date.now();
      setAvisado((a) => ({ ...a, [kind]: t }));
      setAgora(t);
    } catch (e) {
      // Limite de toques: a equipe já foi avisada há pouco.
      if (e instanceof Error && /limite|muitas|rate/i.test(e.message)) {
        const t = Date.now();
        setAvisado((a) => ({ ...a, [kind]: t }));
        setAgora(t);
      } else setErro(e instanceof Error ? e.message : "Não foi possível avisar a equipe.");
    } finally {
      setEnviando(null);
    }
  }

  const botao = (kind: TipoChamado, rotulo: string, Icone: typeof BellRing) => (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-10 flex-1 rounded-full"
      disabled={enviando !== null || esperando(kind)}
      onClick={() => void pedir(kind)}
    >
      <Icone className="h-4 w-4" aria-hidden />
      {esperando(kind) ? "Equipe avisada" : rotulo}
    </Button>
  );

  return (
    <div className="mt-4">
      <div className="flex gap-2">{botao("waiter", "Chamar garçom", BellRing)}</div>
      <p role="status" aria-live="polite" className="mt-2 min-h-4 text-xs text-muted-foreground">
        {erro ?? (algumEsperando ? "Avisamos a equipe. Alguém já vem até a sua mesa." : "")}
      </p>
    </div>
  );
}
