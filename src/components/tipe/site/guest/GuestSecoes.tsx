/**
 * Seções extras da página /produtos/guest (Projeto 4): restaurantes e experiências, como
 * reservar, Guest Manager, integração com o Tipe Pay, avaliações e pontos, Restaurante Fundador e
 * CTA de interesse. O Guest segue "Em breve": nada aqui reserva de verdade. Os restaurantes são os
 * fictícios da demonstração, sempre rotulados.
 */
import { BadgeCheck, CalendarCheck, MapPin, Sparkles, Star, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { ordenar, VITRINE } from "@/lib/tipe/guest/vitrine";
import { FOTO_RESTAURANTE } from "@/components/tipe/guest-demo/fotos";
import { BotaoPrincipal, BotaoSecundario, Secao, Titulo } from "../Site";

const nota = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1 });

export function GuestVitrine() {
  const lista = ordenar(VITRINE, "nota").slice(0, 3);
  return (
    <Secao id="restaurantes" ariaLabel="Restaurantes e experiências">
      <div className="mx-auto max-w-6xl px-5">
        <Titulo
          rotulo="Descubra"
          titulo="Busque por bairro, cozinha, dia e hora."
          texto="Filtros, mapa, coleções de verdade e horários livres na hora. Restaurantes abaixo são fictícios, da demonstração."
        />
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {lista.map((r) => (
            <article
              key={r.id}
              className="group overflow-hidden rounded-[1.4rem] border border-border bg-foreground/[.04]"
            >
              <img
                src={FOTO_RESTAURANTE[r.id]}
                alt=""
                loading="lazy"
                className="h-44 w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
              />
              <div className="p-4">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{r.nome}</p>
                  {r.patrocinado && (
                    <span className="flex items-center gap-1 rounded-full bg-brand/15 px-2 py-0.5 text-[0.65rem] font-medium">
                      <Sparkles className="h-3 w-3" aria-hidden /> A Lebre recomenda · Patrocinado
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  <Star className="inline h-3.5 w-3.5 -translate-y-px fill-current" aria-hidden />{" "}
                  {nota(r.nota)} · {r.cozinha} · {r.bairro}
                </p>
                {r.experiencias[0] && (
                  <p className="mt-2 text-sm">Experiência: {r.experiencias[0].titulo}</p>
                )}
              </div>
            </article>
          ))}
        </div>
        <div className="mt-6">
          <BotaoSecundario href="/guest-demo">Abrir a demonstração completa</BotaoSecundario>
        </div>
      </div>
    </Secao>
  );
}

const PASSOS = [
  { icone: MapPin, titulo: "Escolha", texto: "Busque ou pergunte à Lebre onde ir." },
  { icone: CalendarCheck, titulo: "Reserve", texto: "Horário livre de verdade, seguro por 5 min." },
  { icone: Users, titulo: "Chegue", texto: "A recepção já sabe seu nome e sua mesa." },
  { icone: BadgeCheck, titulo: "Pague e volte", texto: "Conta no Tipe Pay, avaliação e pontos." },
];

export function GuestComoReservar() {
  return (
    <Secao id="como-reservar" ariaLabel="Como reservar">
      <div className="mx-auto max-w-6xl px-5">
        <Titulo rotulo="Como reservar" titulo="Quatro toques, nenhuma ligação." />
        <ol className="mt-8 grid gap-3 sm:grid-cols-4">
          {PASSOS.map((p, i) => (
            <li
              key={p.titulo}
              className="rounded-[1.4rem] border border-border bg-foreground/[.04] p-5"
            >
              <p className="text-xs text-muted-foreground">Passo {i + 1}</p>
              <p.icone className="mt-3 h-6 w-6 text-brand-strong" aria-hidden />
              <p className="mt-3 font-semibold">{p.titulo}</p>
              <p className="text-sm text-muted-foreground">{p.texto}</p>
            </li>
          ))}
        </ol>
      </div>
    </Secao>
  );
}

const MESAS = [
  { n: "1", e: "reservada", c: "col-span-1" },
  { n: "2", e: "ocupada", c: "col-span-1" },
  { n: "4", e: "fechando", c: "col-span-2" },
  { n: "7", e: "livre", c: "col-span-2" },
  { n: "8", e: "limpeza", c: "col-span-1" },
  { n: "9", e: "reservada", c: "col-span-1" },
] as const;
const COR = {
  livre: "bg-white/5 border-white/20",
  reservada: "bg-brand/20 border-brand",
  ocupada: "bg-white text-[#021E34] border-white",
  fechando: "bg-amber-200/20 border-amber-300",
  limpeza: "border-dashed border-sky-300",
} as const;

export function GuestManagerSecao() {
  return (
    <Secao tema="escuro" id="guest-manager" ariaLabel="Gestão de reservas">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 lg:grid-cols-2">
        <Titulo
          rotulo="Para o restaurante"
          titulo="Gestão de reservas, dentro do Tipe Gestão."
          texto="Próximas chegadas, mapa do salão com as mesmas mesas da operação, lista de espera e disponibilidade com prévia. Cada pessoa da equipe vê só o que o papel permite."
        />
        <div className="rounded-[1.6rem] border border-white/10 bg-white/[.04] p-5">
          <div className="grid grid-cols-4 gap-2">
            {MESAS.map((m) => (
              <div
                key={m.n}
                className={cn(
                  "grid h-20 place-items-center rounded-xl border-2 font-display text-lg",
                  COR[m.e],
                  m.c,
                )}
              >
                {m.n}
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-white/70">
            19:30 Ana · mesa 1 · aniversário · alergia a camarão
          </p>
          <div className="mt-4">
            <BotaoSecundario href="/guest-demo?lado=restaurante" className="text-white">
              Ver a gestão de reservas
            </BotaoSecundario>
          </div>
        </div>
      </div>
    </Secao>
  );
}

export function GuestPaySecao() {
  return (
    <Secao id="pay" ariaLabel="Integração com o Tipe Pay">
      <div className="mx-auto grid max-w-6xl gap-6 px-5 lg:grid-cols-[1.2fr_1fr]">
        <Titulo
          rotulo="Com o Tipe Pay"
          titulo="Reserva, conta e gorjeta no mesmo lugar."
          texto="Na mesa, a conta sai pelo Tipe Pay: Pix, Apple Pay, Google Pay ou no estabelecimento. A garantia, quando o restaurante cobra, vira crédito na conta. A gorjeta extra é separada da garantia e vai 70% para o garçom."
        />
        <ul className="grid content-start gap-2 text-sm">
          {[
            "Garantia vira crédito na conta",
            "Cancelou no prazo, devolvemos tudo",
            "Gorjeta extra separada: 3%, 5% ou 8%",
            "Sem cartão digitado",
          ].map((t) => (
            <li key={t} className="rounded-xl border border-border bg-foreground/[.04] px-4 py-3">
              {t}
            </li>
          ))}
        </ul>
      </div>
    </Secao>
  );
}

export function GuestAvaliacoesSecao() {
  return (
    <Secao id="avaliacoes" ariaLabel="Avaliações e pontos">
      <div className="mx-auto grid max-w-6xl gap-4 px-5 sm:grid-cols-2">
        <div className="rounded-[1.6rem] border border-border bg-foreground/[.04] p-6">
          <p className="font-display text-2xl tracking-[-0.02em]">Avaliações verificadas</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Só quem reservou e foi avalia comida, serviço e ambiente. Tem moderação e o restaurante
            pode responder.
          </p>
        </div>
        <div className="rounded-[1.6rem] border border-border bg-foreground/[.04] p-6">
          <p className="font-display text-2xl tracking-[-0.02em]">Tipe Pontos</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Cada reserva honrada soma pontos que viram crédito em restaurantes do Tipe. Valores
            ainda em definição.
          </p>
        </div>
      </div>
    </Secao>
  );
}

export function GuestFundadorSecao() {
  return (
    <Secao id="fundador" ariaLabel="Restaurante Fundador">
      <div className="mx-auto max-w-6xl px-5">
        <div className="rounded-[1.8rem] bg-[#021E34] p-7 text-white sm:p-10">
          <p className="text-sm text-brand">Restaurante Fundador</p>
          <p className="mt-2 max-w-2xl font-display text-3xl tracking-[-0.03em] sm:text-4xl">
            Os primeiros restaurantes do Tipe Reserva ajudam a desenhar o produto.
          </p>
          <p className="mt-3 max-w-2xl text-sm text-white/70">
            Demonstração do percurso de interesse e implantação. Tipe Reserva: em breve, com
            Fortaleza.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <BotaoPrincipal href="/fundador">Quero ser Fundador</BotaoPrincipal>
          </div>
        </div>
      </div>
    </Secao>
  );
}
