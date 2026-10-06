import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Copy, KeyRound, Pause, Play, Plug, RotateCcw, Store, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setIntegration } from "@/lib/tipe/admin.functions";
import { finishOnboarding } from "@/lib/tipe/subscription.functions";

import { PDVS, pdvGeneric, type PdvInfo } from "@/lib/tipe/pdvs";
import { Input } from "@/components/ui/input";

function cenas(pdv: PdvInfo) {
  return [
    { icon: Store, t: `Integrando ${pdv.l} com a TIPE`, d: "Em poucos minutos, as mesas e os pedidos do seu PDV aparecem na TIPE em tempo real." },
    { icon: KeyRound, t: "1. Gere sua chave TIPE", d: "Clique em “Gerar chave de integração” aqui embaixo. Copie o endereço e a chave. A chave aparece uma única vez." },
    { icon: Plug, t: `2. Abra o ${pdv.l}`, d: `No seu sistema, vá em ${pdv.menu} e escolha adicionar a TIPE (ou um webhook/API personalizado).` },
    { icon: Copy, t: "3. Cole os dados", d: "Cole o endereço de integração e a chave TIPE nos campos do PDV e salve. Se o PDV pedir, ative o envio de mesas e pedidos." },
    { icon: Wifi, t: "4. Lance um pedido de teste", d: "Abra uma mesa no PDV e lance um item. Ele aparece aqui na TIPE e a integração fica “Conectada”." },
    { icon: Check, t: "Pronto!", d: "Seus clientes já podem pagar pelo QR Code da mesa, e o painel TIPE mostra tudo o que vem do seu PDV." },
  ];
}

function VideoExplicativo({ pdv }: { pdv: PdvInfo }) {
  const lista = cenas(pdv);
  const DUR = 5000;
  const [i, setI] = useState(0);
  const [play, setPlay] = useState(true);
  const [t, setT] = useState(0);
  useEffect(() => { setI(0); setT(0); setPlay(true); }, [pdv.k]);
  useEffect(() => {
    if (!play) return;
    const id = setInterval(() => setT((v) => {
      if (v + 100 >= DUR) { setI((x) => { if (x + 1 >= lista.length) { setPlay(false); return x; } return x + 1; }); return 0; }
      return v + 100;
    }), 100);
    return () => clearInterval(id);
  }, [play, lista.length]);
  const c = lista[i]!;
  const Icon = c.icon;
  return (
    <div className="overflow-hidden rounded-2xl bg-secondary text-secondary-foreground">
      <div key={i} className="flex aspect-video flex-col items-center justify-center gap-3 p-6 text-center animate-in fade-in zoom-in-95 duration-500">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground"><Icon className="h-8 w-8" /></span>
        <h3 className="font-display text-xl font-extrabold sm:text-2xl">{c.t}</h3>
        <p className="max-w-md text-sm opacity-85 sm:text-base">{c.d}</p>
      </div>
      <div className="flex items-center gap-3 px-4 pb-3">
        <button type="button" aria-label={play ? "Pausar" : "Reproduzir"} onClick={() => { if (!play && i === lista.length - 1) { setI(0); setT(0); } setPlay(!play); }} className="rounded-full p-1.5 hover:bg-primary/20">
          {play ? <Pause className="h-4 w-4" /> : i === lista.length - 1 ? <RotateCcw className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <div className="flex flex-1 gap-1">
          {lista.map((_, n) => (
            <button key={n} type="button" aria-label={`Etapa ${n + 1}`} onClick={() => { setI(n); setT(0); }} className="h-1.5 flex-1 overflow-hidden rounded-full bg-primary/25">
              <span className="block h-full bg-primary" style={{ width: n < i ? "100%" : n === i ? `${(t / DUR) * 100}%` : "0%" }} />
            </button>
          ))}
        </div>
        <span className="text-xs opacity-70">{i + 1}/{lista.length}</span>
      </div>
    </div>
  );
}

export function OnboardingPdv({ slug, nome, onDone }: { slug: string; nome: string; onDone: () => void }) {
  const set = useServerFn(setIntegration);
  const finish = useServerFn(finishOnboarding);
  const qc = useQueryClient();
  const [pdv, setPdv] = useState<string | null>(null);
  const [outroNome, setOutroNome] = useState("");
  const [chave, setChave] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const endpoint = `https://tipe.digital/api/public/pos/${slug}`;
  const sel = pdv === "outro" ? (outroNome.trim().length >= 2 ? pdvGeneric(outroNome.trim()) : null) : PDVS.find((p) => p.k === pdv);
  const copiar = (v: string) => { void navigator.clipboard.writeText(v); toast.success("Copiado"); };

  async function gerar() {
    if (!sel) return;
    setBusy(true);
    try { const r = await set({ data: { slug, provider: sel!.k, newKey: true } }); setChave(r.key); toast.success("Chave gerada"); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  async function concluir() {
    setBusy(true);
    try {
      await finish({ data: { slug } });
      qc.invalidateQueries({ queryKey: ["ops", slug] });
      onDone();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">Bem-vindo à TIPE, {nome}!</p>
        <h1 className="font-display text-2xl font-extrabold sm:text-3xl">Vamos conectar o seu PDV</h1>
        <p className="mt-1 text-muted-foreground">A TIPE funciona junto com o sistema que você já usa: as mesas e os pedidos chegam do seu PDV e os pagamentos voltam para ele. Essa conexão é obrigatória para começar. Qual PDV o restaurante usa hoje?</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[...PDVS, { k: "outro", l: "Outro PDV", menu: "" }].map((p) => (
          <button key={p.k} type="button" onClick={() => { setPdv(p.k); setChave(null); }} className={`rounded-xl border-2 p-3 text-left text-sm font-semibold transition ${pdv === p.k ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/50"}`}>{p.l}</button>
        ))}
      </div>
      {pdv === "outro" && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <label className="text-sm font-semibold" htmlFor="outro-pdv">Qual é o nome do seu PDV?</label>
          <Input id="outro-pdv" className="mt-2" maxLength={40} placeholder="Ex.: Sistema do Zé" value={outroNome} onChange={(e) => { setOutroNome(e.target.value); setChave(null); }} />
          <p className="mt-2 text-xs text-muted-foreground">Aceitamos qualquer PDV do mercado. Se ele tiver API ou webhook, a conexão é feita pela chave abaixo, e nossa equipe ajuda se precisar.</p>
        </div>
      )}
      {sel && (
        <>
          <VideoExplicativo pdv={sel} />
          <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-lg font-bold">Dados para colar no {sel.l}</h2>
            <div>
              <div className="text-xs text-muted-foreground">Endereço de integração</div>
              <div className="flex gap-2"><code className="flex-1 break-all rounded bg-muted p-2 text-xs">{endpoint}</code><Button size="icon" variant="outline" onClick={() => copiar(endpoint)}><Copy className="h-4 w-4" /></Button></div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Chave de integração</div>
              {chave ? (
                <>
                  <div className="flex gap-2"><code className="flex-1 break-all rounded bg-accent/20 p-2 text-xs">{chave}</code><Button size="icon" variant="outline" onClick={() => copiar(chave)}><Copy className="h-4 w-4" /></Button></div>
                  <p className="mt-1 text-xs text-destructive">Copie agora: por segurança, ela não será mostrada novamente.</p>
                </>
              ) : <Button onClick={gerar} disabled={busy}><KeyRound className="mr-1 h-4 w-4" />Gerar chave de integração</Button>}
            </div>
            <Button className="w-full" size="lg" disabled={!chave || busy} onClick={() => concluir()}>Já colei no meu PDV — ir para o painel</Button>
            <p className="text-center text-xs text-muted-foreground">O painel mostra “Aguardando primeira sincronização” até o PDV enviar o primeiro pedido. Precisa de ajuda? Nossa equipe faz a integração com você.</p>
          </div>
        </>
      )}
      <p className="text-center text-sm text-muted-foreground">Não encontrou o seu sistema ou precisa de ajuda? Fale com a gente em <a className="underline" href="mailto:contato@tipe.digital">contato@tipe.digital</a> que fazemos a conexão junto com você.</p>
    </div>
  );
}
