import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, Check } from "lucide-react";
import { fotoSrc, type NomeFoto } from "./Foto";
import { telaReal, type TelaReal } from "./CelularReal";

type Cena = { titulo: string; texto: string; foto: NomeFoto; alt: string; tela?: TelaReal; legenda: string };
const cenas: Cena[] = [
  { titulo: "A conta chega pelo QR.", texto: "O cliente aponta a câmera para o totem e abre a conta da mesa no próprio celular.", foto: "mesa", alt: "Totem da Tipe na mesa do restaurante", tela: "conta", legenda: "Conta da mesa" },
  { titulo: "Cada um escolhe sua parte.", texto: "Quem dividiu um prato escolhe uma fração. Quem vai embora primeiro pode pagar só o que consumiu.", foto: "cena-amigos-larga", alt: "Amigos reunidos à mesa", tela: "dividir", legenda: "Divisão por item" },
  { titulo: "O total fica claro.", texto: "Itens, taxa de serviço e valor da sua parte aparecem antes de escolher como pagar.", foto: "cena-executiva", alt: "Cliente conferindo o celular no restaurante", tela: "metodos", legenda: "Formas de pagamento" },
  { titulo: "O atendimento ganha um obrigado.", texto: "Depois de pagar, o cliente pode deixar uma gorjeta extra. O garçom recebe 70% e a Tipe fica com 30%.", foto: "cena-garconete", alt: "Garçonete durante o atendimento", tela: "gorjeta", legenda: "Gorjeta opcional" },
  { titulo: "A equipe vê a mesa livre.", texto: "No painel do salão, a equipe acompanha o que já foi pago e identifica as mesas que pode liberar.", foto: "cena-gerente", alt: "Gerente com o painel do salão aberto no tablet", legenda: "Gestão do salão" },
];

function CenaMesa({ cena }: { cena: Cena }) {
  const foto = fotoSrc(cena.foto);
  const tela = cena.tela && telaReal(cena.tela);
  return <figure className="relative isolate h-full min-h-80 overflow-hidden rounded-[1.65rem] bg-[#123b43] lg:min-h-[36rem]">
    <img src={foto.src} srcSet={foto.srcSet} sizes="(min-width:1024px) 50vw, 90vw" alt={cena.alt} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
    <div className="absolute inset-0 bg-gradient-to-t from-[#021e34]/90 via-transparent to-black/10" />
    <span className="absolute left-5 top-5 rounded-full bg-[#021e34]/90 px-3 py-1.5 text-xs font-medium text-white">Mesa 12 · Demonstração</span>
    {tela && <div className="absolute bottom-[14%] right-[7%] w-[29%] max-w-48 rotate-[4deg] overflow-hidden rounded-[1.5rem] border-[5px] border-[#101e25] bg-white shadow-2xl lg:rounded-[2rem]"><img src={tela.src} srcSet={tela.srcSet} sizes="190px" width="390" height="844" alt={cena.legenda + " no celular"} className="block h-auto w-full" /></div>}
    <figcaption className="absolute inset-x-6 bottom-5 flex items-center gap-2 text-sm font-medium text-white"><span className="h-2 w-2 rounded-full bg-[#44ecda]" />{cena.legenda}</figcaption>
  </figure>;
}

export function ResultadosMesa() {
  const [ativa, selecionar] = useState(0);
  const atual = cenas[ativa]!;
  return <section aria-labelledby="resultados" className="bg-[#021e34] py-16 text-white sm:py-24">
    <div className="container-page">
      <div className="mb-9 flex flex-wrap items-end justify-between gap-5 border-b border-white/20 pb-8">
        <div><p className="mb-4 text-sm font-medium tracking-wide text-[#6ce5d7]">O que muda na sua mesa</p>
          <h2 id="resultados" className="max-w-[16ch] scroll-mt-24 font-display text-[clamp(2.8rem,6.1vw,6.1rem)] font-medium leading-[0.98] tracking-[-0.055em]">Do QR Code <span className="text-[#70e5d6]">à mesa livre.</span></h2></div>
        <a href="/simulador" className="inline-flex min-h-11 items-center gap-3 rounded-full border border-white/35 px-5 text-sm font-medium hover:bg-white/10">Experimentar a Mesa 12 <ArrowUpRight size={16} /></a>
      </div>
      <div className="grid items-stretch gap-10 lg:grid-cols-[1.12fr_1fr]">
        <div className="hidden lg:block"><CenaMesa cena={atual} /></div>
        <div className="flex flex-col justify-center">{cenas.map((c,i) => {
          const aberta = i === ativa;
          return <div key={c.titulo} className="border-b border-white/20">
            <h3><button type="button" aria-expanded={aberta} aria-controls={`mesa-cena-${i}`} onClick={()=>selecionar(i)} className="group flex w-full items-center gap-4 py-5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#70e5d6]">
              <span aria-hidden className={aberta ? "h-5 w-1 shrink-0 rounded-full bg-[#70e5d6]" : "h-1 w-1 shrink-0 rounded-full bg-white/45"} />
              <span className={`flex-1 font-display text-[clamp(1.35rem,2.4vw,2.15rem)] leading-tight tracking-tight ${aberta ? "text-white" : "text-white/70 group-hover:text-white"}`}>{c.titulo}</span>
              {aberta ? <Check size={18} className="text-[#70e5d6]" /> : <ArrowDownRight size={18} aria-hidden />}
            </button></h3>
            <div id={`mesa-cena-${i}`} hidden={!aberta}>{aberta && <div className="pb-6"><p className="mb-4 max-w-[45ch] pl-5 text-base leading-relaxed text-white/80">{c.texto}</p><div className="lg:hidden"><CenaMesa cena={c} /></div></div>}</div>
          </div>;
        })}</div>
      </div>
    </div>
  </section>;
}
