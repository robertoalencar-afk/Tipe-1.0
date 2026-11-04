/**
 * Celular com uma tela REAL do app do cliente. As imagens de src/assets/telas-reais
 * foram capturadas do código atual do app com dados de teste do restaurante
 * fictício "Maré Alta" (mesa 12, garçom Joyce, cliente Lucas). As telas antigas de
 * src/assets/telas e src/assets/telas-v4 não entram aqui.
 */
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import conta390 from "@/assets/telas-reais/conta-390.webp";
import conta780 from "@/assets/telas-reais/conta-780.webp";
import dividir390 from "@/assets/telas-reais/dividir-390.webp";
import dividir780 from "@/assets/telas-reais/dividir-780.webp";
import metodos390 from "@/assets/telas-reais/metodos-390.webp";
import metodos780 from "@/assets/telas-reais/metodos-780.webp";
import pix390 from "@/assets/telas-reais/pix-390.webp";
import pix780 from "@/assets/telas-reais/pix-780.webp";
import pago390 from "@/assets/telas-reais/pago-390.webp";
import pago780 from "@/assets/telas-reais/pago-780.webp";
import gorjeta390 from "@/assets/telas-reais/gorjeta-390.webp";
import gorjeta780 from "@/assets/telas-reais/gorjeta-780.webp";
import gorjetaMetodo390 from "@/assets/telas-reais/gorjeta-metodo-390.webp";
import gorjetaMetodo780 from "@/assets/telas-reais/gorjeta-metodo-780.webp";
import gorjetaPix390 from "@/assets/telas-reais/gorjeta-pix-390.webp";
import gorjetaPix780 from "@/assets/telas-reais/gorjeta-pix-780.webp";
import avaliacao390 from "@/assets/telas-reais/avaliacao-390.webp";
import avaliacao780 from "@/assets/telas-reais/avaliacao-780.webp";
// Cardápio e pedido do Tipe Order: captura do componente MesaPedido do PR #8
// (branch integracao/colibri-c-pedido-mesa, ainda fora do main), com cardápio de exemplo.
import cardapio390 from "@/assets/telas-reais/cardapio-390.webp";
import cardapio780 from "@/assets/telas-reais/cardapio-780.webp";
import pedido390 from "@/assets/telas-reais/pedido-390.webp";
import pedido780 from "@/assets/telas-reais/pedido-780.webp";

// Tipe Guest e Tipe Order (03/11): telas dos simuladores de cada produto, capturadas do
// código em desenvolvimento com restaurantes fictícios (/mnt/project-files/tipe-guest e tipe-order).
import guestDescobrir390 from "@/assets/telas-reais/guest-descobrir-390.webp";
import guestDescobrir780 from "@/assets/telas-reais/guest-descobrir-780.webp";
import guestHorarios390 from "@/assets/telas-reais/guest-horarios-390.webp";
import guestHorarios780 from "@/assets/telas-reais/guest-horarios-780.webp";
import guestHold390 from "@/assets/telas-reais/guest-hold-390.webp";
import guestHold780 from "@/assets/telas-reais/guest-hold-780.webp";
import guestConfirmada390 from "@/assets/telas-reais/guest-confirmada-390.webp";
import guestConfirmada780 from "@/assets/telas-reais/guest-confirmada-780.webp";
import guestPagar390 from "@/assets/telas-reais/guest-pagar-390.webp";
import guestPagar780 from "@/assets/telas-reais/guest-pagar-780.webp";
import guestGorjeta390 from "@/assets/telas-reais/guest-gorjeta-390.webp";
import guestGorjeta780 from "@/assets/telas-reais/guest-gorjeta-780.webp";
import guestFim390 from "@/assets/telas-reais/guest-fim-390.webp";
import guestFim780 from "@/assets/telas-reais/guest-fim-780.webp";
import guestEspera390 from "@/assets/telas-reais/guest-espera-390.webp";
import guestEspera780 from "@/assets/telas-reais/guest-espera-780.webp";
import orderInicio390 from "@/assets/telas-reais/order-inicio-390.webp";
import orderInicio780 from "@/assets/telas-reais/order-inicio-780.webp";
import orderCozinha390 from "@/assets/telas-reais/order-cozinha-390.webp";
import orderCozinha780 from "@/assets/telas-reais/order-cozinha-780.webp";
import orderConta390 from "@/assets/telas-reais/order-conta-390.webp";
import orderConta780 from "@/assets/telas-reais/order-conta-780.webp";
import orderFim390 from "@/assets/telas-reais/order-fim-390.webp";
import orderFim780 from "@/assets/telas-reais/order-fim-780.webp";
import orderStoryBaiao390 from "@/assets/telas-reais/order-story-baiao-390.webp";
import orderStoryBaiao780 from "@/assets/telas-reais/order-story-baiao-780.webp";
import orderStoryPeixe390 from "@/assets/telas-reais/order-story-peixe-390.webp";
import orderStoryPeixe780 from "@/assets/telas-reais/order-story-peixe-780.webp";
import orderStoryBebidas390 from "@/assets/telas-reais/order-story-bebidas-390.webp";
import orderStoryBebidas780 from "@/assets/telas-reais/order-story-bebidas-780.webp";
import orderStory3d390 from "@/assets/telas-reais/order-story-3d-390.webp";
import orderStory3d780 from "@/assets/telas-reais/order-story-3d-780.webp";
// App Tipe Guest (apps/guest, 03/11): telas do app nativo em modo demonstração, até a garantia.
import appDescobrir390 from "@/assets/telas-reais/app-descobrir-390.webp";
import appDescobrir780 from "@/assets/telas-reais/app-descobrir-780.webp";
import appHorarios390 from "@/assets/telas-reais/app-horarios-390.webp";
import appHorarios780 from "@/assets/telas-reais/app-horarios-780.webp";
import appDados390 from "@/assets/telas-reais/app-dados-390.webp";
import appDados780 from "@/assets/telas-reais/app-dados-780.webp";
import appGarantia390 from "@/assets/telas-reais/app-garantia-390.webp";
import appGarantia780 from "@/assets/telas-reais/app-garantia-780.webp";
import appConfirmada390 from "@/assets/telas-reais/app-confirmada-390.webp";
import appConfirmada780 from "@/assets/telas-reais/app-confirmada-780.webp";
import salao560 from "@/assets/telas-reais/salao-560.webp";
import salao1000 from "@/assets/telas-reais/salao-1000.webp";

export const TELAS_REAIS = {
  conta: [conta390, conta780],
  dividir: [dividir390, dividir780],
  metodos: [metodos390, metodos780],
  pix: [pix390, pix780],
  pago: [pago390, pago780],
  gorjeta: [gorjeta390, gorjeta780],
  "gorjeta-metodo": [gorjetaMetodo390, gorjetaMetodo780],
  "gorjeta-pix": [gorjetaPix390, gorjetaPix780],
  avaliacao: [avaliacao390, avaliacao780],
  cardapio: [cardapio390, cardapio780],
  pedido: [pedido390, pedido780],
  "guest-descobrir": [guestDescobrir390, guestDescobrir780],
  "guest-horarios": [guestHorarios390, guestHorarios780],
  "guest-hold": [guestHold390, guestHold780],
  "guest-confirmada": [guestConfirmada390, guestConfirmada780],
  "guest-pagar": [guestPagar390, guestPagar780],
  "guest-gorjeta": [guestGorjeta390, guestGorjeta780],
  "guest-fim": [guestFim390, guestFim780],
  "guest-espera": [guestEspera390, guestEspera780],
  "app-descobrir": [appDescobrir390, appDescobrir780],
  "app-horarios": [appHorarios390, appHorarios780],
  "app-dados": [appDados390, appDados780],
  "app-garantia": [appGarantia390, appGarantia780],
  "app-confirmada": [appConfirmada390, appConfirmada780],
  "order-inicio": [orderInicio390, orderInicio780],
  "order-cozinha": [orderCozinha390, orderCozinha780],
  "order-conta": [orderConta390, orderConta780],
  "order-fim": [orderFim390, orderFim780],
  "order-story-baiao": [orderStoryBaiao390, orderStoryBaiao780],
  "order-story-peixe": [orderStoryPeixe390, orderStoryPeixe780],
  "order-story-bebidas": [orderStoryBebidas390, orderStoryBebidas780],
  "order-story-3d": [orderStory3d390, orderStory3d780],
} as const;

export type TelaReal = keyof typeof TELAS_REAIS;

export function CelularReal({
  tela,
  alt,
  className,
  sizes = "280px",
  prioridade = false,
  style,
}: {
  tela: TelaReal;
  alt: string;
  className?: string;
  sizes?: string;
  prioridade?: boolean;
  style?: CSSProperties;
}) {
  const [p, g] = TELAS_REAIS[tela];
  return (
    <figure
      style={style}
      className={cn(
        "relative w-full rounded-[13%/6%] bg-[oklch(0.17_0_0)] p-[2.6%] shadow-[0_50px_80px_-40px_oklch(0.2_0.05_250/0.55),0_0_0_1px_oklch(0.42_0_0/0.55),inset_0_0_0_1.5px_oklch(0.3_0_0)]",
        className,
      )}
    >
      <div className="relative overflow-hidden rounded-[11%/5%] bg-white pt-[7%]">
        <span
          aria-hidden
          className="absolute left-1/2 top-[1.4%] h-[2.2%] w-[30%] -translate-x-1/2 rounded-full bg-black"
        />
        <img
          src={p}
          srcSet={`${p} 390w, ${g} 780w`}
          sizes={sizes}
          alt={alt}
          width={390}
          height={844}
          loading={prioridade ? "eager" : "lazy"}
          decoding="async"
          className="block h-auto w-full"
        />
      </div>
    </figure>
  );
}

/**
 * Tablet com a tela REAL do Salão do painel do restaurante (Maré Alta, mesa 12 já paga).
 * Captura do componente RestaurantPanel com dados de teste respondidos no navegador.
 */
export function TabletSalao({
  alt,
  className,
  sizes = "320px",
}: {
  alt: string;
  className?: string;
  sizes?: string;
}) {
  return (
    <figure
      className={cn(
        "relative w-full rounded-[6%/4.5%] bg-[oklch(0.17_0_0)] p-[2.8%] shadow-[0_60px_90px_-40px_oklch(0.2_0.05_250/0.55),0_0_0_1px_oklch(0.42_0_0/0.5)]",
        className,
      )}
    >
      <img
        src={salao560}
        srcSet={`${salao560} 560w, ${salao1000} 1000w`}
        sizes={sizes}
        alt={alt}
        width={560}
        height={747}
        loading="lazy"
        decoding="async"
        className="block h-auto w-full rounded-[3.5%/2.6%]"
      />
    </figure>
  );
}
