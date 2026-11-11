// Fotos licenciadas do próprio projeto (casting fictício e cardápio) para a demonstração do Guest.
const ARQ = import.meta.glob(
  [
    "/src/assets/fotos/*-640.webp",
    "/src/assets/fotos/salao-1080.webp",
    "/src/assets/cardapio/*-1080.webp",
    "/src/assets/cardapio/*-720.webp",
  ],
  { eager: true, query: "?url", import: "default" },
) as Record<string, string>;

const f = (p: string) => ARQ[p] ?? "";

export const FOTO_RESTAURANTE: Record<string, string> = {
  "mare-alta": f("/src/assets/fotos/casal-640.webp"),
  "brasa-do-sertao": f("/src/assets/fotos/amigos-640.webp"),
  "jangada-cafe": f("/src/assets/fotos/mesa-640.webp"),
  kazoku: f("/src/assets/fotos/salao-1080.webp"),
  "trattoria-dona-lia": f("/src/assets/fotos/garcom-640.webp"),
  "boteco-do-farol": f("/src/assets/cardapio/isca-1080.webp"),
};

export const FOTOS_PRATOS = [
  { nome: "Pastel de camarão", foto: f("/src/assets/cardapio/pastel-1080.webp") },
  { nome: "Baião de dois", foto: f("/src/assets/cardapio/baiao-1080.webp") },
  { nome: "Peixe na brasa", foto: f("/src/assets/cardapio/peixe-720.webp") },
  { nome: "Cartola", foto: f("/src/assets/cardapio/cartola-1080.webp") },
  { nome: "Suco de caju", foto: f("/src/assets/cardapio/caju-1080.webp") },
];
