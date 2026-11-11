import praiaPulseira from "@/assets/cenas/cena-praia-pulseira-1120.jpg";
import praiaPulseiraPequena from "@/assets/cenas/cena-praia-pulseira-640.jpg";
import { TotemPedido } from "@/components/tipe/TotemPedido";
import { CelularReal } from "../produto/TelaReal";

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
      <img
        src={praiaPulseira}
        srcSet={`${praiaPulseiraPequena} 516w, ${praiaPulseira} 902w`}
        sizes="(min-width: 1024px) 48vw, 100vw"
        width={902}
        height={1120}
        alt="Na foto oficial da Tipe, a cliente toma água de coco usando uma pulseira NFC turquesa numerada no pulso; a equipe atende à mesa na praia"
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover"
      />
      <CelularReal
        tela="order-inicio"
        alt="Cardápio real do Tipe Order aberto no celular, com dados de exemplo"
        sizes="(min-width: 1024px) 150px, 28vw"
        className="absolute bottom-5 right-4 w-[28%] max-w-[9rem] sm:bottom-7 sm:right-6"
      />
    </div>
  );
}
