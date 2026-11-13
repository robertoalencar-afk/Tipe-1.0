/**
 * Dados fictícios do simulador (restaurante "Maré Alta"). Um cardápio só para todas as
 * modalidades: mesa, balcão, totem e pulseira usam o mesmo cadastro, como no produto.
 */
import type { ItemSim, MetodoCaixa, MetodoPay } from "@/lib/tipe/order/simulacao";
import fotoPastel from "@/assets/cardapio/pastel-1080.webp";
import profPastel from "@/assets/cardapio/pastel-depth.png";
import fotoIsca from "@/assets/cardapio/isca-1080.webp";
import profIsca from "@/assets/cardapio/isca-depth.png";
import fotoBaiao from "@/assets/cardapio/baiao-1080.webp";
import profBaiao from "@/assets/cardapio/baiao-depth.png";
import fotoCartola from "@/assets/cardapio/cartola-1080.webp";
import profCartola from "@/assets/cardapio/cartola-depth.png";
import fotoPeixe from "@/assets/cardapio/peixe-720.webp";
import fotoCaju from "@/assets/cardapio/caju-1080.webp";
import profCaju from "@/assets/cardapio/caju-depth.png";
import fotoCoco from "@/assets/cardapio/coco-720.webp";

export const RESTAURANTE = "Maré Alta";
export const GARCOM = "Joyce";
export const CLIENTE = "Rafael";
export const CATEGORIAS = ["Petiscos", "Pratos", "Bebidas", "Sobremesas"];

export const CARDAPIO: ItemSim[] = [
  {
    code: "pastel",
    nome: "Pastel de camarão",
    desc: "Porção com 6 unidades",
    preco: 3400,
    cat: "Petiscos",
    foto: fotoPastel,
    profundidade: profPastel,
    modelo: "/modelos/pastel-triposr.glb",
    adicionais: [{ code: "molho", nome: "Molho extra", preco: 300 }],
  },
  {
    code: "isca",
    nome: "Isca de peixe",
    desc: "Com molho tártaro da casa",
    preco: 5400,
    cat: "Petiscos",
    foto: fotoIsca,
    profundidade: profIsca,
    selo: "Mais pedido",
    alergenicos: ["peixe", "ovo", "glúten"],
  },
  {
    code: "baiao",
    nome: "Baião de dois",
    desc: "Feijão-verde, queijo coalho e nata",
    preco: 4200,
    cat: "Pratos",
    foto: fotoBaiao,
    profundidade: profBaiao,
    alergenicos: ["leite"],
    adicionais: [{ code: "carne", nome: "Carne de sol", preco: 1200 }],
  },
  {
    code: "peixe",
    nome: "Peixe na brasa",
    desc: "Pargo com pirão e salada",
    preco: 6800,
    cat: "Pratos",
    foto: fotoPeixe,
    selo: "Saindo da brasa",
    alergenicos: ["peixe"],
  },
  {
    code: "caju",
    nome: "Suco de caju",
    desc: "Copo de 400 ml",
    preco: 950,
    cat: "Bebidas",
    foto: fotoCaju,
    profundidade: profCaju,
  },
  {
    code: "coco",
    nome: "Água de coco",
    desc: "Servida no coco, bem gelada",
    preco: 800,
    cat: "Bebidas",
    foto: fotoCoco,
  },
  {
    code: "cartola",
    nome: "Cartola",
    desc: "Banana, queijo coalho e canela",
    preco: 1900,
    cat: "Sobremesas",
    foto: fotoCartola,
    profundidade: profCartola,
    alergenicos: ["leite"],
  },
  {
    code: "abacate",
    nome: "Creme de abacate",
    desc: "Com limão e raspas de rapadura. Gire o abacate em 3D.",
    preco: 1600,
    cat: "Sobremesas",
    modelo: "/modelos/abacate.glb",
    selo: "Em 3D",
  },
];

export const POR_CODE = Object.fromEntries(CARDAPIO.map((i) => [i.code, i])) as Record<
  string,
  ItemSim
>;

export const METODOS_PAY: { id: MetodoPay; nome: string; desc: string }[] = [
  { id: "pix", nome: "Pix (simulação)", desc: "Copia e cola ou QR Code" },
  { id: "apple_pay", nome: "Apple Pay (simulação)", desc: "Com Face ID ou Touch ID" },
  { id: "google_pay", nome: "Google Pay (simulação)", desc: "Com a carteira do Google" },
  { id: "estabelecimento", nome: "Pagar no estabelecimento", desc: "A equipe confirma no caixa" },
];

export const METODOS_CAIXA: { id: MetodoCaixa; nome: string }[] = [
  { id: "dinheiro", nome: "Dinheiro" },
  { id: "cartao", nome: "Cartão" },
  { id: "pix", nome: "Pix" },
];

/** Pedido externo de exemplo para a demonstração de delivery. */
export const PEDIDOS_EXTERNOS = [
  {
    origem: "Canal parceiro A",
    cliente: "Entrega · Aldeota",
    itens: [
      { code: "baiao", qtd: 2 },
      { code: "caju", qtd: 2 },
    ],
  },
  {
    origem: "Pedido pelo WhatsApp",
    cliente: "Entrega · Meireles",
    itens: [
      { code: "pastel", qtd: 1 },
      { code: "coco", qtd: 1 },
    ],
  },
  {
    origem: "Canal parceiro B",
    cliente: "Entrega · Praia de Iracema",
    itens: [{ code: "peixe", qtd: 1 }],
  },
];

/** Setores do mapa do evento (Tipe Localiza, demonstração). */
export const SETORES_EVENTO = ["Pista", "Deck da piscina", "Bar central", "Lounge", "Quiosque 3"];

export const brl = (c: number) =>
  (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
