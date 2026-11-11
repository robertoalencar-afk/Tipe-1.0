import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { nanoid } from "nanoid";
import { TipeLogo } from "@/components/tipe/Logo";
import { Button } from "@/components/ui/button";
import { TotemPedido } from "@/components/tipe/TotemPedido";
import { getTotemContext, placeTotemOrder, type TotemContext } from "@/lib/tipe/totem.functions";
import { totalCarrinho, carrinhoParaPedido } from "@/lib/tipe/pdv/comanda";

// Totem de autoatendimento em tela cheia. Sem login: autorizado pelo token do
// dispositivo, gerado pelo dono/caixa em Configurações.
export const Route = createFileRoute("/$restaurante/totem")({
  ssr: false,
  validateSearch: z.object({ t: z.string().max(64).optional() }),
  head: () => ({
    meta: [{ title: "Autoatendimento — TIPE" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: Totem,
});

const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Totem() {
  const { restaurante } = Route.useParams();
  const { t: token } = Route.useSearch();
  const [ctx, setCtx] = useState<TotemContext | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [fase, setFase] = useState<"inicio" | "pedido" | "senha">("inicio");
  const [carrinho, setCarrinho] = useState<Record<string, number>>({});
  const [obs, setObs] = useState<Record<string, string>>({});
  const [cat, setCat] = useState<string>("");
  const [nome, setNome] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [senha, setSenha] = useState<{ ticket: number; total: number } | null>(null);
  const requestId = useRef(nanoid(16));

  useEffect(() => {
    if (!token || token.length < 16) {
      setErro("invalid");
      return;
    }
    let vivo = true;
    void getTotemContext({ data: { slug: restaurante, token } })
      .then((r) => {
        if (!vivo) return;
        if ("error" in r) setErro("invalid");
        else setCtx(r);
      })
      .catch(() => vivo && setErro("net"));
    return () => {
      vivo = false;
    };
  }, [restaurante, token]);

  const precoDe = useMemo(() => {
    const m = new Map((ctx?.items ?? []).map((i) => [i.code, i.price]));
    return (c: string) => m.get(c) ?? 0;
  }, [ctx]);

  function reiniciar() {
    setCarrinho({});
    setObs({});
    setNome("");
    setCat("");
    setSenha(null);
    requestId.current = nanoid(16);
    setFase("inicio");
  }

  // Volta sozinho ao início depois de mostrar a senha, liberando o totem.
  useEffect(() => {
    if (fase !== "senha") return;
    const t = setTimeout(reiniciar, 12000);
    return () => clearTimeout(t);
  }, [fase]);

  if (erro)
    return (
      <Tela>
        <div className="m-auto max-w-lg px-8 text-center">
          <h1 className="font-display text-3xl font-bold">Totem</h1>
          <p className="mt-3 text-lg opacity-80">
            {erro === "invalid"
              ? "Este totem não está configurado. Peça ao caixa o link do totem em Configurações."
              : "Sem conexão. Tente de novo em instantes."}
          </p>
        </div>
      </Tela>
    );
  if (!ctx)
    return (
      <Tela>
        <p className="m-auto text-xl opacity-80">Carregando…</p>
      </Tela>
    );
  if (!ctx.enabled)
    return (
      <Tela>
        <p className="m-auto max-w-lg px-8 text-center text-xl opacity-80">
          O autoatendimento está desligado no momento. Faça seu pedido no caixa.
        </p>
      </Tela>
    );

  const linhas = carrinhoParaPedido(carrinho, obs);
  const total = totalCarrinho(linhas, precoDe);
  const qtdTotal = linhas.reduce((s, l) => s + l.qty, 0);
  const add = (c: string, d: number) =>
    setCarrinho((x) => ({ ...x, [c]: Math.max(0, Math.min(99, (x[c] ?? 0) + d)) }));

  async function finalizar() {
    if (!linhas.length) return;
    setEnviando(true);
    setErro(null);
    try {
      const r = await placeTotemOrder({
        data: {
          slug: restaurante,
          token: token!,
          requestId: requestId.current,
          ...(nome.trim() ? { customer: nome.trim() } : {}),
          items: linhas,
        },
      });
      if ("error" in r) {
        setErro(r.error === "disabled" ? "invalid" : "net");
        return;
      }
      setSenha({ ticket: r.ticket, total: r.total });
      setFase("senha");
    } catch {
      setErro("net");
    } finally {
      setEnviando(false);
    }
  }

  if (fase === "inicio") {
    return (
      <Tela>
        <button
          type="button"
          onClick={() => setFase("pedido")}
          className="m-auto flex flex-col items-center gap-8 px-8 text-center"
        >
          <TipeLogo className="h-12" />
          <div>
            <h1 className="font-display text-5xl font-extrabold">{ctx.restaurantName}</h1>
            <p className="mt-4 text-2xl opacity-80">Toque para fazer seu pedido</p>
          </div>
          <span className="rounded-full bg-primary px-10 py-5 font-display text-3xl font-bold text-primary-foreground shadow-[var(--shadow-glow)]">
            Começar
          </span>
        </button>
      </Tela>
    );
  }

  if (fase === "senha" && senha) {
    return (
      <Tela>
        <div className="m-auto flex flex-col items-center gap-4 px-8 text-center">
          <p className="text-2xl opacity-80">Pague no caixa a senha</p>
          <p className="font-display text-[12rem] font-extrabold leading-none text-primary">
            {senha.ticket}
          </p>
          <p className="text-3xl font-bold">{money(senha.total)}</p>
          <p className="max-w-xl text-xl opacity-80">
            Leve sua senha ao caixa para pagar. O pedido vai para a cozinha assim que o pagamento
            for confirmado.
          </p>
          <Button className="mt-4 h-16 px-10 text-xl" onClick={reiniciar}>
            Novo pedido
          </Button>
        </div>
      </Tela>
    );
  }

  return (
    <TotemPedido
      ctx={ctx}
      cat={cat}
      carrinho={carrinho}
      linhas={linhas}
      precoDe={precoDe}
      add={add}
      reiniciar={reiniciar}
      setCat={setCat}
      setCarrinho={setCarrinho}
      nome={nome}
      setNome={setNome}
      total={total}
      enviando={enviando}
      finalizar={finalizar}
      qtdTotal={qtdTotal}
    />
  );
}

function Tela({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex min-h-svh flex-col text-secondary-foreground"
      style={{ background: "var(--gradient-brand)" }}
    >
      {children}
    </div>
  );
}
