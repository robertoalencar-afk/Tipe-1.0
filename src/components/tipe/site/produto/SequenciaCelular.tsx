/**
 * O "vídeo" das páginas de produto: o celular realista (CelularReal) trocando as telas
 * reais do app do cliente sozinho, a cada ~2,3 s, com troca curta (350–400 ms) e o
 * toque turquesa antes de cada passo. Só anda na tela; com movimento reduzido fica
 * parado na primeira tela e os pontos abaixo deixam escolher a tela.
 */
import { cn } from "@/lib/utils";
import { CelularReal, useSequencia, type EtapaCelular, type TelaReal } from "../CelularReal";
import { useMovimentoReduzido, useVisivel } from "./useVisivel";
import "./produto.css";

export const ETAPAS_TELA: Record<TelaReal, Omit<EtapaCelular, "tela">> = {
  conta: {
    alt: "Conta da Mesa 12 no celular: total de R$ 356,40 com a taxa de serviço",
    toque: { x: 13, y: 88 },
  },
  dividir: {
    alt: "Itens escolhidos na conta: metade do baião de dois, uma caipirinha e um pudim, R$ 89,10 com a taxa",
    toque: { x: 50, y: 95 },
  },
  metodos: {
    alt: "Formas de pagamento: Pix, Apple Pay, Google Pay e pagar no estabelecimento",
    toque: { x: 50, y: 90 },
  },
  pix: { alt: "Tela do Pix com o valor de R$ 89,10 e o QR Code" },
  pago: {
    alt: "Pagamento realizado, com o valor pago, o restaurante e a mesa",
    toque: { x: 50, y: 91 },
  },
  gorjeta: {
    alt: "Gorjeta extra opcional para a Joyce: 3%, 5%, 8% ou outro valor, ou seguir sem gorjeta",
    toque: { x: 50, y: 82 },
  },
  "gorjeta-metodo": { alt: "Forma de pagamento da gorjeta extra" },
  "gorjeta-pix": { alt: "Pix da gorjeta extra" },
  avaliacao: { alt: "Avaliação do atendimento com cinco estrelas e campo de comentário" },
  cardapio: {
    alt: "Cardápio da Mesa 12 no celular, com busca, categorias e o botão de adicionar cada item (dados de exemplo)",
    toque: { x: 86, y: 54 },
  },
  pedido: {
    alt: "Pedido montado no celular: 2 pastéis e 1 isca de peixe, com o botão Enviar 3 itens por R$ 118,00 (dados de exemplo)",
    toque: { x: 50, y: 93 },
  },
  "guest-descobrir": {
    alt: "Tipe Reserva: busca de restaurantes em Fortaleza com os horários livres de cada um (restaurantes fictícios)",
    toque: { x: 12, y: 32 },
  },
  "guest-horarios": {
    alt: "Escolha de pessoas, dia e horário livre para reservar no Maré Alta (dados de exemplo)",
    toque: { x: 50, y: 30 },
  },
  "guest-hold": {
    alt: "Confirmação da reserva: o horário fica segurado por 5 minutos, reservar é grátis e sem cartão",
    toque: { x: 50, y: 92 },
  },
  "guest-confirmada": {
    alt: "Reserva confirmada para amanhã às 12:00, 2 pessoas, com o código da reserva",
  },
  "guest-pagar": {
    alt: "Conta da mesa no Tipe Reserva com Pix, Apple Pay, Google Pay e pagar no estabelecimento",
    toque: { x: 50, y: 85 },
  },
  "guest-gorjeta": {
    alt: "Depois de pagar, a gorjeta extra opcional para quem atendeu: 3%, 5% sugerida, 8% ou outro valor",
    toque: { x: 50, y: 87 },
  },
  "guest-fim": {
    alt: "Conta paga e avaliação registrada, com os botões Salvar nos favoritos e Reservar de novo",
  },
  "guest-espera": {
    alt: "Lista de espera: o app avisa que uma mesa liberou e dá 15 minutos para confirmar",
  },
  "app-descobrir": {
    alt: "App Tipe Reserva: Pergunte à Lebre, pessoas, dia e hora, e o destaque A Lebre recomenda (restaurantes fictícios)",
    toque: { x: 28, y: 36 },
  },
  "app-horarios": {
    alt: "Maré Alta: dia, pessoas e horário escolhido, com o botão Reservar às 21:00",
    toque: { x: 50, y: 93 },
  },
  "app-dados": {
    alt: "Confirmar reserva: horário seguro por 5 minutos, nome e ocasião",
    toque: { x: 50, y: 54 },
  },
  "app-garantia": {
    alt: "Garantia de R$ 50,00 que vira crédito de consumação, paga com Pix, Apple Pay ou Google Pay",
    toque: { x: 50, y: 89 },
  },
  "app-confirmada": {
    alt: "Reserva confirmada no Maré Alta para 2 pessoas, com a garantia de R$ 50,00 paga",
  },
  "order-inicio": {
    alt: "Cardápio da Mesa 12 no Tipe Order com categorias Petiscos, Pratos, Bebidas e Sobremesas",
  },
  "order-cozinha": {
    alt: "Pedido enviado: os itens foram para a cozinha e já estão na conta da mesa",
    toque: { x: 50, y: 70 },
  },
  "order-conta": {
    alt: "Conta da Mesa 12 com o que foi pedido, a taxa de serviço e o botão Pagar R$ 74,80 (dados de exemplo)",
    toque: { x: 50, y: 93 },
  },
  "order-fim": { alt: "Conta paga: o próximo pedido abre uma nova conta na mesma mesa" },
  "order-story-baiao": {
    alt: "Cardápio em stories: foto do Baião de dois em tela cheia, com o botão Adicionar (dados de exemplo)",
    toque: { x: 50, y: 85 },
  },
  "order-story-peixe": {
    alt: "Cardápio em stories: Peixe na brasa com o selo Saindo da brasa e 1 no pedido (dados de exemplo)",
    toque: { x: 50, y: 85 },
  },
  "order-story-bebidas": {
    alt: "Cardápio em stories: Suco de caju, copo de 400 ml (dados de exemplo)",
  },
  "order-story-3d": {
    alt: "Cardápio em stories: sobremesa em 3D que o cliente gira no celular",
  },
};

const ROTULO: Record<TelaReal, string> = {
  conta: "Conta",
  dividir: "Dividir",
  metodos: "Pagar",
  pix: "Pix",
  pago: "Pago",
  gorjeta: "Gorjeta",
  "gorjeta-metodo": "Gorjeta",
  "gorjeta-pix": "Pix",
  avaliacao: "Avaliar",
  cardapio: "Cardápio",
  pedido: "Pedido",
  "guest-descobrir": "Descobrir",
  "guest-horarios": "Horário",
  "guest-hold": "Reservar",
  "guest-confirmada": "Confirmada",
  "guest-pagar": "Pagar",
  "guest-gorjeta": "Gorjeta",
  "guest-fim": "Voltar",
  "guest-espera": "Espera",
  "app-descobrir": "Descobrir",
  "app-horarios": "Horário",
  "app-dados": "Dados",
  "app-garantia": "Garantia",
  "app-confirmada": "Confirmada",
  "order-inicio": "Cardápio",
  "order-cozinha": "Cozinha",
  "order-conta": "Conta",
  "order-fim": "Pago",
  "order-story-baiao": "Escolher",
  "order-story-peixe": "Pedir",
  "order-story-bebidas": "Bebidas",
  "order-story-3d": "3D",
};

export const PASSO_MS = 2300;

export function SequenciaCelular({
  telas,
  className,
  sizes = "(min-width: 1024px) 15rem, 40vw",
  prioridade = false,
  legenda = true,
}: {
  telas: TelaReal[];
  className?: string;
  sizes?: string;
  prioridade?: boolean;
  /** Pontos com o nome de cada tela, abaixo do celular. */
  legenda?: boolean;
}) {
  const [ref, visivel] = useVisivel<HTMLDivElement>();
  const reduz = useMovimentoReduzido();
  const anda = visivel && !reduz;
  const [i, setI] = useSequencia(telas.length, PASSO_MS, anda);
  const etapas = telas.map((t) => ({ tela: t, ...ETAPAS_TELA[t] }));
  return (
    <div ref={ref} className={cn("seq-rapida", className)}>
      <CelularReal
        etapas={etapas}
        indice={i}
        ms={PASSO_MS}
        animando={anda}
        sizes={sizes}
        prioridade={prioridade}
      />
      {legenda && (
        <ol className="seq-pontos" aria-label="Telas do app do cliente">
          {telas.map((t, k) => (
            <li key={t + k}>
              <button
                type="button"
                aria-current={k === i ? "step" : undefined}
                aria-label={`Ver a tela ${ROTULO[t]}`}
                onClick={() => setI(k)}
                data-on={k === i || undefined}
              >
                <span aria-hidden className="seq-ponto" />
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
