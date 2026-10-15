/**
 * Telas de demonstração da jornada do cliente, desenhadas com os mesmos tokens
 * da conta real (/$restaurante/$mesa). Dados fictícios e sem ações reais: são
 * ilustrações estáticas, por isso nada aqui é <button>.
 */
import { Check, ChevronRight, HandCoins, Heart, QrCode, Smartphone } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const DEMO = {
  restaurante: "Maré Alta",
  mesa: "12",
  cliente: "Ana",
  itens: [
    { nome: "Moqueca de peixe", qtd: "1 porção", valor: 89.9, sel: true },
    { nome: "Caipirinha", qtd: "2 unidades", valor: 44, sel: true },
    { nome: "Água com gás", qtd: "1 unidade", valor: 7.5, sel: false },
    { nome: "Pudim de leite", qtd: "1 unidade", valor: 18, sel: false },
  ],
};
const subtotal = DEMO.itens.filter((i) => i.sel).reduce((s, i) => s + i.valor, 0);
const servico = Math.round(subtotal * 10) / 100;
export const DEMO_TOTAL = Math.round((subtotal + servico) * 100) / 100;
const restanteMesa = DEMO.itens.filter((i) => !i.sel).reduce((s, i) => s + i.valor, 0);

export const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function StatusBar({ dark = false }: { dark?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between px-6 pb-1 pt-3 text-[10px] font-semibold", dark ? "text-white/80" : "text-foreground/70")} aria-hidden>
      <span>20:41</span>
      <span className="flex items-center gap-1"><span className="h-1.5 w-3 rounded-sm bg-current opacity-70" /><span className="h-2 w-4 rounded-[3px] border border-current" /></span>
    </div>
  );
}

function TopBar() {
  return (
    <div className="flex items-center justify-between px-4 pt-1">
      <div>
        <p className="text-[10px] text-muted-foreground">{DEMO.restaurante}</p>
        <p className="font-display text-[13px] font-semibold">Mesa {DEMO.mesa}</p>
      </div>
      <span className="flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[9px] font-semibold text-brand-strong"><span className="h-1.5 w-1.5 rounded-full bg-brand" />Ao vivo</span>
    </div>
  );
}

function Cta({ children, tone = "brand" }: { children: ReactNode; tone?: "brand" | "ink" }) {
  return (
    <span className={cn("flex h-10 w-full items-center justify-center gap-1 rounded-full font-display text-[12px] font-semibold", tone === "brand" ? "bg-brand text-ink" : "bg-ink text-white")}>
      {children}
    </span>
  );
}

/** Comanda: itens da mesa, seleção do que a pessoa vai pagar e saldo. */
export function ScreenBill({ className }: { className?: string }) {
  return (
    <div className={cn("flex h-full flex-col bg-background", className)}>
      <StatusBar />
      <TopBar />
      <div className="px-4 pt-3">
        <p className="font-display text-[17px] font-semibold tracking-heading">Olá, {DEMO.cliente}.</p>
        <p className="text-[10.5px] text-muted-foreground">Toque no que você vai pagar.</p>
      </div>
      <ul className="mt-3 space-y-1.5 px-3">
        {DEMO.itens.map((i) => (
          <li key={i.nome} className={cn("flex items-center gap-2.5 rounded-xl border bg-surface px-2.5 py-2", i.sel ? "border-brand bg-brand-soft/60" : "border-border")}>
            <span className={cn("grid h-4 w-4 shrink-0 place-items-center rounded-full border", i.sel ? "border-brand bg-brand text-ink" : "border-border")}>{i.sel && <Check className="h-2.5 w-2.5" />}</span>
            <span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-semibold">{i.nome}</span><span className="block text-[9px] text-muted-foreground">{i.qtd}</span></span>
            <span className="money text-[11px] font-semibold">{money(i.valor)}</span>
          </li>
        ))}
      </ul>
      <div className="mx-3 mt-2.5 rounded-xl bg-surface p-2.5 text-[10px] shadow-xs">
        <div className="flex justify-between text-muted-foreground"><span>Itens escolhidos</span><span className="money">{money(subtotal)}</span></div>
        <div className="mt-1 flex justify-between text-muted-foreground"><span>Serviço (10%)</span><span className="money">{money(servico)}</span></div>
        <div className="mt-1.5 flex justify-between border-t border-border pt-1.5 font-display text-[12.5px] font-semibold"><span>Sua parte</span><span className="money">{money(DEMO_TOTAL)}</span></div>
        <p className="mt-1.5 rounded-md bg-background-muted px-2 py-1 text-[9px] text-muted-foreground">Depois do seu pagamento, faltarão <strong className="text-foreground">{money(restanteMesa)}</strong> na mesa.</p>
      </div>
      <div className="mt-auto px-3 pb-5 pt-3"><Cta>Continuar <ChevronRight className="h-3.5 w-3.5" /></Cta></div>
    </div>
  );
}

/** Escolha do meio de pagamento: só o que está ativo aparece como opção. */
export function ScreenPay({ className }: { className?: string }) {
  const opcoes = [
    { Icone: QrCode, nome: "Pix", desc: "Confirmação rápida pelo seu banco", sel: true, breve: false },
    { Icone: HandCoins, nome: "No estabelecimento", desc: "Dinheiro ou maquininha", sel: false, breve: false },
    { Icone: Smartphone, nome: "Apple Pay e Google Pay", desc: "Em breve", sel: false, breve: true },
  ];
  return (
    <div className={cn("flex h-full flex-col bg-background", className)}>
      <StatusBar />
      <TopBar />
      <div className="mx-3 mt-3 rounded-2xl bg-surface p-4 text-center shadow-xs">
        <p className="text-[10px] text-muted-foreground">Sua parte da conta</p>
        <p className="money mt-0.5 font-display text-[26px] font-semibold tracking-heading">{money(DEMO_TOTAL)}</p>
      </div>
      <p className="mt-4 px-4 text-[11px] font-semibold">Como você quer pagar?</p>
      <ul className="mt-2 space-y-1.5 px-3">
        {opcoes.map(({ Icone, nome, desc, sel, breve }) => (
          <li key={nome} className={cn("flex items-center gap-2.5 rounded-xl border bg-surface px-2.5 py-2.5", sel ? "border-brand bg-brand-soft/60" : "border-border", breve && "opacity-55")}>
            <span className={cn("grid h-7 w-7 place-items-center rounded-lg", sel ? "bg-ink text-white" : "bg-background-muted")}><Icone className="h-3.5 w-3.5" /></span>
            <span className="min-w-0 flex-1"><span className="block text-[11px] font-semibold">{nome}</span><span className="block text-[9px] text-muted-foreground">{desc}</span></span>
            {sel ? <span className="grid h-4 w-4 place-items-center rounded-full bg-brand"><Check className="h-2.5 w-2.5 text-ink" /></span> : <span className="h-4 w-4 rounded-full border-2 border-border" />}
          </li>
        ))}
      </ul>
      <div className="mt-auto px-3 pb-5 pt-3"><Cta tone="ink">Pagar {money(DEMO_TOTAL)} com Pix</Cta></div>
    </div>
  );
}

/** Confirmação inequívoca. */
export function ScreenDone({ className }: { className?: string }) {
  return (
    <div className={cn("flex h-full flex-col bg-background", className)}>
      <StatusBar />
      <TopBar />
      <div className="flex flex-1 flex-col items-center justify-center px-5 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-brand text-ink shadow-[0_12px_30px_-10px_var(--brand-primary)]"><Check className="h-8 w-8" strokeWidth={3} /></span>
        <p className="mt-5 font-display text-[19px] font-semibold tracking-heading">Pagamento realizado!</p>
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">Obrigado, {DEMO.cliente}, por pagar com o TIPE.</p>
        <div className="mt-5 w-full rounded-xl bg-surface p-3 text-left text-[10px] shadow-xs">
          <div className="flex justify-between"><span className="text-muted-foreground">Valor</span><span className="money font-semibold">{money(DEMO_TOTAL)}</span></div>
          <div className="mt-1 flex justify-between"><span className="text-muted-foreground">Forma</span><span className="font-semibold">Pix</span></div>
          <div className="mt-1 flex justify-between"><span className="text-muted-foreground">Mesa</span><span className="font-semibold">{DEMO.mesa} · {DEMO.restaurante}</span></div>
        </div>
      </div>
      <div className="px-3 pb-5"><Cta tone="ink">Avaliar atendimento</Cta></div>
    </div>
  );
}

/** Gorjeta extra: opcional, depois do pagamento, com saída clara. */
export function ScreenTip({ className }: { className?: string }) {
  return (
    <div className={cn("flex h-full flex-col bg-background", className)}>
      <StatusBar />
      <TopBar />
      <div className="flex flex-1 flex-col px-4 pt-6 text-center">
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-brand-soft text-brand-strong"><Heart className="h-5 w-5" /></span>
        <p className="mt-4 font-display text-[17px] font-semibold tracking-heading">Quer deixar uma gorjeta extra?</p>
        <p className="mt-1 text-[10.5px] text-muted-foreground">É opcional. Uma forma de agradecer pelo atendimento.</p>
        <div className="mt-5 grid grid-cols-2 gap-1.5">
          {[5, 10, 15, 20].map((v) => (
            <span key={v} className={cn("money rounded-xl border py-2.5 text-[12px] font-semibold", v === 10 ? "border-brand bg-brand-soft/60" : "border-border bg-surface")}>{money(v)}</span>
          ))}
        </div>
      </div>
      <div className="space-y-1.5 px-3 pb-5"><Cta>Continuar com {money(10)}</Cta><span className="block py-1 text-center text-[11px] font-semibold text-muted-foreground">Agora não, obrigado</span></div>
    </div>
  );
}

/** Totem de mesa com QR Code (ilustração geométrica, não é um QR funcional). */
export function TableTotem({ className }: { className?: string }) {
  const cells = Array.from({ length: 81 }, (_, i) => ((i * 37 + (i % 9) * 11) % 7) < 3);
  return (
    <div className={cn("flex flex-col items-center rounded-2xl bg-ink px-5 pb-5 pt-4 text-white", className)} role="img" aria-label="Totem de mesa com QR Code">
      <p className="eyebrow text-[9px] text-brand">Pague pelo celular</p>
      <div className="mt-3 rounded-xl bg-white p-2.5">
        <div className="grid grid-cols-9 gap-[2px]">
          {cells.map((on, i) => {
            const r = Math.floor(i / 9), c = i % 9;
            const corner = (r < 3 && c < 3) || (r < 3 && c > 5) || (r > 5 && c < 3);
            const ring = corner && !((r % 3 === 1 && c % 3 === 1) || (r === 1 && c === 7) || (r === 7 && c === 1));
            return <span key={i} className={cn("h-[7px] w-[7px] rounded-[1.5px]", corner ? (ring ? "bg-ink" : "bg-ink") : on ? "bg-ink" : "bg-transparent")} />;
          })}
        </div>
      </div>
      <p className="mt-3 font-display text-sm font-semibold">Mesa {DEMO.mesa}</p>
    </div>
  );
}

/** Divisão com a mesa: cada pessoa escolhe os itens; um item pode ser dividido em frações. */
export function ScreenSplit({ className }: { className?: string }) {
  const pessoas = [
    { nome: "Ana", itens: "Moqueca ⅓ · Caipirinha", valor: 51.97, pago: true },
    { nome: "Caio", itens: "Moqueca ⅓ · Caipirinha", valor: 51.97, pago: false },
    { nome: "Bia", itens: "Moqueca ⅓ · Pudim", valor: 47.96, pago: false },
  ];
  return (
    <div className={cn("flex h-full flex-col bg-background", className)}>
      <StatusBar />
      <TopBar />
      <div className="px-4 pt-3">
        <p className="font-display text-[17px] font-semibold tracking-heading">Quem paga o quê</p>
        <p className="text-[10.5px] text-muted-foreground">A moqueca foi dividida em 3.</p>
      </div>
      <div className="mt-3 flex -space-x-1.5 px-4">
        {pessoas.map((p, i) => (
          <span key={p.nome} className={cn("grid h-8 w-8 place-items-center rounded-full text-[10px] font-bold ring-2 ring-background", ["bg-brand text-ink", "bg-highlight text-ink", "bg-ink text-white"][i])}>{p.nome[0]}</span>
        ))}
      </div>
      <ul className="mt-3 space-y-1.5 px-3">
        {pessoas.map((p) => (
          <li key={p.nome} className={cn("flex items-center gap-2.5 rounded-xl border bg-surface px-2.5 py-2", p.pago ? "border-brand bg-brand-soft/60" : "border-border")}>
            <span className="min-w-0 flex-1"><span className="block text-[11px] font-semibold">{p.nome}</span><span className="block truncate text-[9px] text-muted-foreground">{p.itens}</span></span>
            <span className="text-right"><span className="money block text-[11px] font-semibold">{money(p.valor)}</span><span className={cn("block text-[8.5px] font-semibold", p.pago ? "text-brand-strong" : "text-muted-foreground")}>{p.pago ? "Pago" : "Escolhendo"}</span></span>
          </li>
        ))}
      </ul>
      <p className="mx-3 mt-2.5 rounded-lg bg-background-muted px-2.5 py-1.5 text-[9.5px] text-muted-foreground">Faltam <strong className="text-foreground">{money(99.93)}</strong> para fechar a mesa.</p>
      <div className="mt-auto px-3 pb-5 pt-3"><Cta>Escolher meus itens</Cta></div>
    </div>
  );
}

/** Câmera apontada para o QR Code da mesa (ilustração). */
export function ScreenScan({ className }: { className?: string }) {
  return (
    <div className={cn("relative flex h-full flex-col items-center justify-center overflow-hidden bg-[oklch(0.24_0.03_60)]", className)}>
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(70%_50%_at_50%_45%,oklch(0.55_0.08_60/0.55),transparent_70%)]" />
      <div className="relative">
        <TableTotem className="w-[132px] shadow-2xl" />
        <span aria-hidden className="scan-frame pointer-events-none absolute -inset-4 rounded-2xl border-2 border-white/80 [mask:linear-gradient(#000_0_0)_content-box_exclude,linear-gradient(#000_0_0)] p-0" />
        <span aria-hidden className="scan-line pointer-events-none absolute inset-x-[-10px] top-0 h-0.5 rounded bg-brand shadow-[0_0_14px_var(--brand-primary)]" />
      </div>
      <p className="relative mt-8 rounded-full bg-black/45 px-3 py-1.5 text-[10px] font-semibold text-white backdrop-blur">Abrir tipe.digital/mare-alta/12</p>
    </div>
  );
}
