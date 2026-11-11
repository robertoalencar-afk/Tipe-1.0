import { useState } from "react";
import { KeyRound, Loader2, RefreshCw, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { claimTableOrdering } from "@/lib/tipe/order-access.functions";

const chaveToken = (slug: string, code: string) => `tipe-order-device:${slug}:${code}`;

/**
 * Token deste celular (modo código curto). Sem a sessão, devolve o último salvo:
 * o servidor confere se ele vale para a conta atual da mesa.
 */
export function lerTokenPedido(slug: string, code: string, session?: string): string | undefined {
  try {
    const salvo = JSON.parse(localStorage.getItem(chaveToken(slug, code)) ?? "null") as {
      session: string;
      token: string;
    } | null;
    return salvo && (session === undefined || salvo.session === session) ? salvo.token : undefined;
  } catch {
    return undefined;
  }
}

function salvarTokenPedido(slug: string, code: string, session: string, token: string) {
  try {
    localStorage.setItem(chaveToken(slug, code), JSON.stringify({ session, token }));
  } catch {
    // Sem armazenamento, o token vale só enquanto a página estiver aberta.
  }
}

/**
 * Aviso no topo do cardápio quando a mesa ainda não pode pedir: ou a equipe
 * precisa liberar os pedidos, ou falta digitar o código que o garçom passou.
 */
export function MesaLiberacao({
  estado,
  slug,
  code,
  session,
  garcom,
  onLiberado,
  onAtualizar,
}: {
  estado: "closed" | "code";
  slug: string;
  code: string;
  session: string;
  garcom: string;
  onLiberado: (token: string | undefined) => void;
  onAtualizar: () => Promise<void> | void;
}) {
  const [pin, setPin] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function confirmar(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[0-9]{4}$/.test(pin)) {
      setErro("O código tem 4 números.");
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      const r = await claimTableOrdering({ data: { slug, code, session, pin } });
      if (r.ok) {
        if (r.token) salvarTokenPedido(slug, code, session, r.token);
        onLiberado(r.token ?? undefined);
        return;
      }
      setErro(
        r.reason === "wrong_code"
          ? "Esse código não confere. Confira com a equipe e tente de novo."
          : r.reason === "locked"
            ? "Muitas tentativas com código errado. Peça um código novo à equipe."
            : "Os pedidos desta mesa foram encerrados. Chame a equipe para liberar de novo.",
      );
      setPin("");
    } catch {
      setErro("Não foi possível conferir o código agora. Tente de novo em instantes.");
    } finally {
      setEnviando(false);
    }
  }

  if (estado === "closed") {
    return (
      <div role="status" className="mb-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-muted">
            <UserRound className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Pedidos pelo celular ainda não liberados</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {garcom ? `Chame ${garcom} e peça` : "Peça à equipe"} para liberar esta mesa. Enquanto
              isso, você já pode escolher no cardápio.
            </p>
          </div>
        </div>
        <Button variant="outline" className="mt-3 h-11 w-full" onClick={() => void onAtualizar()}>
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden /> Já liberaram, atualizar
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={confirmar}
      className="mb-4 rounded-2xl border border-border bg-card p-4"
      noValidate
    >
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-muted">
          <KeyRound className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <label htmlFor="codigo-mesa" className="font-semibold">
            Código da mesa
          </label>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Digite os 4 números que {garcom || "a equipe"} passou para esta mesa.
          </p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <input
          id="codigo-mesa"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{4}"
          maxLength={4}
          value={pin}
          onChange={(e) => {
            setPin(e.target.value.replace(/\D/g, "").slice(0, 4));
            if (erro) setErro(null);
          }}
          aria-invalid={!!erro}
          aria-describedby={erro ? "codigo-mesa-erro" : undefined}
          className="h-12 w-full rounded-xl border border-input bg-background px-3 text-center font-mono text-xl tracking-[0.4em] outline-none focus-visible:ring-2 focus-visible:ring-focus-ring/40"
        />
        <Button
          type="submit"
          className="h-12 shrink-0 px-5"
          disabled={enviando || pin.length !== 4}
        >
          {enviando ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-label="Conferindo" />
          ) : (
            "Liberar"
          )}
        </Button>
      </div>
      {erro && (
        <p id="codigo-mesa-erro" role="alert" className="mt-2 text-sm text-destructive">
          {erro}
        </p>
      )}
    </form>
  );
}
