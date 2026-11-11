import { Nfc, QrCode } from "lucide-react";
import logo from "@/assets/marca/tipe-logo.svg";
import { TotemPedido } from "@/components/tipe/TotemPedido";
import { CelularReal } from "../produto/TelaReal";
import { Foto } from "../Foto";

const noop = () => {};
const itens = [
  {
    id: "pastel",
    code: "pastel",
    categoryId: "petiscos",
    name: "Pastel de camarão",
    price: 34,
    description: "Porção com 6 unidades",
  },
  {
    id: "isca",
    code: "isca",
    categoryId: "petiscos",
    name: "Isca de peixe",
    price: 54,
    description: "Com molho tártaro da casa",
  },
  {
    id: "baiao",
    code: "baiao",
    categoryId: "pratos",
    name: "Baião de dois",
    price: 42,
    description: "Feijão-verde, queijo coalho e nata",
  },
];

/** O próprio JSX do terminal, sem sessão, rede ou controles ativos na vitrine. */
export function TotemDemonstracao() {
  return (
    <div className="relative flex h-full items-center justify-center overflow-hidden bg-[#021E34] px-5 py-16 sm:px-9">
      <div className="relative w-full">
        <div className="relative z-10 overflow-hidden rounded-2xl bg-[#132d40] p-2.5 shadow-[0_30px_60px_-20px_#0008] sm:p-3.5">
          <svg
            viewBox="0 0 1120 780"
            className="block w-full rounded-lg bg-white"
            role="img"
            aria-label="Tela real do totem Tipe: categorias, produtos e carrinho. Dados de demonstração Maré Alta."
          >
            <foreignObject width="1120" height="780">
              <div
                inert
                aria-hidden="true"
                className="h-[780px] overflow-hidden [&>div]:min-h-[780px]"
              >
                <TotemPedido
                  ctx={{
                    restaurantName: "Maré Alta",
                    enabled: true,
                    categories: [
                      { id: "petiscos", name: "Petiscos" },
                      { id: "pratos", name: "Pratos" },
                    ],
                    items: itens,
                  }}
                  cat=""
                  carrinho={{ pastel: 1 }}
                  linhas={[{ code: "pastel", qty: 1 }]}
                  precoDe={(c) => itens.find((i) => i.code === c)?.price ?? 0}
                  add={noop}
                  reiniciar={noop}
                  setCat={noop}
                  setCarrinho={noop}
                  nome=""
                  setNome={noop}
                  total={34}
                  enviando={false}
                  finalizar={noop}
                  qtdTotal={1}
                />
              </div>
            </foreignObject>
          </svg>
        </div>
        <div aria-hidden="true" className="mx-auto h-24 w-[15%] bg-[#132d40] sm:h-32" />
        <div aria-hidden="true" className="mx-auto h-3 w-[55%] rounded-t-xl bg-[#254255]" />
      </div>
    </div>
  );
}

export function PulseiraDemonstracao() {
  return (
    <div className="relative h-full overflow-hidden bg-[#021E34]">
      <Foto
        nome="cena-praia"
        alt="Casting oficial da Tipe em uma mesa na praia"
        className="h-full w-full opacity-60"
      />
      <div className="absolute bottom-7 left-5 flex w-[48%] -rotate-12 items-center gap-3 rounded-[2rem] bg-[#0FC9BD] px-4 py-5 text-[#021E34] shadow-[0_20px_45px_-15px_#0008] sm:left-8 sm:py-7">
        <img src={logo} alt="Tipe" width="74" height="28" className="w-[40%]" loading="lazy" />
        <span className="font-display text-xl font-semibold tabular-nums sm:text-3xl">0421</span>
        <Nfc aria-hidden className="size-5 shrink-0" />
      </div>
      <QrCode aria-hidden className="absolute bottom-[27%] left-[24%] size-7 text-white" />
      <CelularReal
        tela="order-inicio"
        alt="Cardápio real do Tipe Order aberto no celular após a leitura NFC ou QR da pulseira"
        sizes="(min-width: 1024px) 240px, 42vw"
        className="absolute right-5 top-[12%] w-[43%] max-w-[15rem] sm:right-8"
      />
    </div>
  );
}
