/**
 * Catálogo dos produtos do site. Cada produto vira uma página /produtos/<slug>
 * no formato das páginas de produto da sunday. Só entra aqui o que a Tipe faz
 * de verdade; o que ainda está a caminho tem status "em-breve" e aparece assim.
 */
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  Bot,
  ChefHat,
  ClipboardList,
  Clock,
  HandCoins,
  Heart,
  History,
  LayoutGrid,
  MessageSquareText,
  QrCode,
  ReceiptText,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Timer,
  UserRound,
  Users,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";
import type { Tela } from "@/components/tipe/landing/PhoneShot";
import type { NomeFoto } from "./Foto";
import type { TelaReal } from "./produto/TelaReal";

/** Palco desenhado sem foto (conversa da Lebre) ou card sobre a foto. */
export type Painel = "lebre-salao" | "lebre-acao" | "lebre-limite";

export type Status = "disponivel" | "em-breve";
export type Grupo = "Na mesa" | "Na equipe" | "Na gestão";
export const GRUPOS: Grupo[] = ["Na mesa", "Na equipe", "Na gestão"];

export type Produto = {
  slug: string;
  nome: string;
  /** Uma linha para o menu e os cards. */
  resumo: string;
  status: Status;
  icone: LucideIcon;
  foto: NomeFoto;
  posicao?: string;
  altFoto: string;
  rotulo: string;
  titulo: string;
  texto: string;
  /** Card de interface que flutua sobre a foto do topo. */
  cartao: { titulo: string; linhas: [string, string][]; rodape: string };
  /** Grupo no menu Produtos (como "Take payments" / "Power your business" na sunday). */
  grupo: Grupo;
  /**
   * Abas logo abaixo do topo: cada uma troca a foto (ou o painel desenhado) e a
   * tela REAL do app do cliente (src/assets/telas-reais).
   */
  beneficios: {
    t: string;
    d: string;
    foto?: NomeFoto;
    posicao?: string;
    telaReal?: TelaReal;
    painel?: Painel;
    /** Card "em desenvolvimento" sobre a foto, sem tela que finja existir. */
    emDesenvolvimento?: boolean;
    /** Tablet com a captura real do Salão do painel (src/assets/telas-reais/salao-*). */
    tabletSalao?: boolean;
    /** @deprecated Telas antigas do PhoneShot; não use. Mantido só para o tipo da Home. */
    tela?: Tela;
  }[];
  /** Foto do topo da página de produto (cenas do casting). `foto` acima fica para o menu e a Home. */
  topo: { foto: NomeFoto; posicao?: string; alt: string };
  /** Sequência de telas reais que roda no celular sobre a foto do topo (~2,3 s por tela). */
  heroTelas?: TelaReal[];
  /** Seção escura "onde acontece": duas cenas grandes com legenda (ou a conversa da Lebre). */
  cenario: {
    titulo: string;
    texto: string;
    itens: { foto?: NomeFoto; posicao?: string; painel?: Painel; legenda: string }[];
  };
  /** Faixa na cor da marca com o celular (tela real) ou a conversa da Lebre. */
  banda: { titulo: string; texto: string; telaReal?: TelaReal; lebre?: boolean; altTela: string };
  /** Fatos verdadeiros do produto (sem números de mercado inventados). */
  fatos: { v: string; t: string }[];
  /** Sequência de telas reais do app do cliente, com legenda. */
  fluxoReal?: {
    titulo: string;
    texto: string;
    telas: { tela: TelaReal; t: string; d: string; alt: string }[];
  };
  recursos: { icone: LucideIcon; t: string; d: string }[];
  faq: [string, string][];
};

export const PRODUTOS: Produto[] = [
  {
    slug: "pay",
    grupo: "Na mesa",
    nome: "Tipe Pay",
    resumo: "Conta na mesa por QR Code, divisão e pagamento",
    status: "disponivel",
    icone: QrCode,
    foto: "pay",
    posicao: "50% 55%",
    altFoto: "Casal pagando a conta pelo celular à mesa, com o suporte da Tipe ao lado do pão",
    topo: {
      foto: "cena-casal",
      posicao: "50% 40%",
      alt: "Casal rindo à mesa de um restaurante; ele mostra a conta no celular, com o suporte da Tipe ao lado",
    },
    heroTelas: ["conta", "dividir", "metodos", "pix", "pago"],
    cenario: {
      titulo: "Da mesa ao caixa, sem fila.",
      texto:
        "Onde tem mesa e QR Code, a conta abre no celular de quem está sentado. Pagou, a mesa fica livre para o próximo cliente.",
      itens: [
        {
          foto: "cena-caixa",
          posicao: "50% 40%",
          legenda: "No caixa: a mesa já aparece paga, sem fila para fechar a conta.",
        },
        {
          foto: "cena-mesa-liberada",
          posicao: "50% 40%",
          legenda: "Conta paga, mesa liberada: o garçom já sabe que pode arrumar.",
        },
      ],
    },
    rotulo: "Tipe Pay",
    titulo: "A conta chega antes de alguém pedir.",
    texto:
      "O cliente aponta a câmera para o QR Code da mesa, confere a conta ao vivo, divide do jeito que quiser e paga com Pix, Apple Pay ou Google Pay. Sem baixar aplicativo.",
    cartao: {
      titulo: "Mesa 12 · sua parte",
      linhas: [
        ["Moqueca (1/2)", "R$ 44,90"],
        ["Caipirinha", "R$ 22,00"],
        ["Serviço 10%", "R$ 6,69"],
      ],
      rodape: "Pix aprovado · R$ 73,59",
    },
    beneficios: [
      {
        t: "Sem aplicativo",
        d: "Abre direto na câmera do celular, no navegador. A família inteira vê a mesma conta.",
        foto: "cena-familia",
        posicao: "50% 40%",
        telaReal: "conta",
      },
      {
        t: "Cada um paga o seu",
        d: "Por item, em partes iguais, por valor ou porcentagem. A tela mostra quanto falta.",
        foto: "cena-amigos",
        posicao: "50% 40%",
        telaReal: "dividir",
      },
      {
        t: "Pague como preferir",
        d: "Pix, Apple Pay, Google Pay ou no estabelecimento. Almoço pago em um minuto.",
        foto: "cena-executiva",
        posicao: "50% 35%",
        telaReal: "metodos",
      },
      {
        t: "Gorjeta para a equipe",
        d: "Depois de pagar, o cliente pode agradecer quem atendeu. É opcional e 70% vai para o garçom.",
        foto: "cena-garconete",
        posicao: "40% 35%",
        telaReal: "gorjeta",
      },
    ],
    banda: {
      titulo: "Aponte a câmera. A conta está ali.",
      texto:
        "Cada mesa tem o seu QR Code no suporte da Tipe. Os pedidos lançados aparecem na conta em tempo real e os itens pagos saem na hora para todo mundo.",
      telaReal: "conta",
      altTela: "Conta da Mesa 12 do Maré Alta aberta no celular, com o total de R$ 356,40",
    },
    fatos: [
      { v: "0", t: "aplicativos para baixar" },
      { v: "4", t: "formas de pagar na mesa" },
      { v: "R$ 0", t: "de taxa para quem paga a conta" },
      { v: "70%", t: "da gorjeta extra vai para quem atendeu" },
    ],
    recursos: [
      {
        icone: Smartphone,
        t: "Pix, Apple Pay e Google Pay",
        d: "Processados pelo Pagar.me, com o dinheiro direto na conta do restaurante.",
      },
      {
        icone: Wallet,
        t: "Pagar no estabelecimento",
        d: "Dinheiro ou maquininha no caixa, com confirmação da equipe.",
      },
      {
        icone: Users,
        t: "Divisão sem conta de cabeça",
        d: "A tela mostra quanto falta para fechar a mesa.",
      },
      {
        icone: ShieldCheck,
        t: "Sem pagamento em dobro",
        d: "O valor é conferido antes de aprovar e cada ação fica registrada.",
      },
      {
        icone: Star,
        t: "Avaliação depois de pagar",
        d: "Nota e comentário ligados ao garçom da mesa.",
      },
      {
        icone: UserRound,
        t: "O celular lembra o cliente",
        d: "Na próxima visita à mesma mesa, a conta já abre com o nome dele.",
      },
    ],
    faq: [
      [
        "Preciso de maquininha na mesa?",
        "Não. O pagamento digital acontece no celular do cliente. Quem preferir pagar em dinheiro ou cartão faz isso no caixa, e a equipe confirma no painel.",
      ],
      ["O cliente paga alguma taxa?", "Não. Quem está na mesa não paga nada a mais pela Tipe."],
      [
        "E se o cliente quiser dividir um prato?",
        "Ele escolhe o item e divide com quem quiser; cada pessoa paga a sua fração.",
      ],
    ],
  },
  {
    slug: "order",
    grupo: "Na mesa",
    nome: "Tipe Order",
    resumo: "Cardápio e pedido pelo celular, direto da mesa",
    status: "em-breve",
    icone: UtensilsCrossed,
    foto: "order",
    posicao: "50% 50%",
    altFoto: "Colegas de trabalho no almoço; um deles aponta o celular para o QR Code da Tipe",
    topo: {
      foto: "cena-amigos",
      posicao: "50% 40%",
      alt: "Amigos numa mesa de calçada à noite mostrando a conta no celular, com o suporte da Tipe na mesa",
    },
    cenario: {
      titulo: "Pediu, comeu, pagou. Na mesma mesa.",
      texto:
        "O pedido pelo celular está em fase final. Até lá, a conta e o pagamento já funcionam pelo mesmo QR Code.",
      itens: [
        {
          foto: "cena-praia",
          posicao: "50% 45%",
          legenda: "Na barraca, sem esperar alguém passar com o cardápio.",
        },
        {
          foto: "cena-casal",
          posicao: "50% 40%",
          legenda: "No jantar, a conversa não para para chamar o garçom.",
        },
      ],
    },
    rotulo: "Tipe Order",
    titulo: "O pedido sai da mesa sem esperar o garçom.",
    texto:
      "O mesmo QR Code que mostra a conta abre o cardápio. O cliente escolhe, pede e acompanha; o pedido vai para a cozinha e entra na conta da mesa.",
    cartao: {
      titulo: "Mesa 7 · novo pedido",
      linhas: [
        ["2× Pastel de queijo", "R$ 28,00"],
        ["1× Chope 300 ml", "R$ 14,00"],
      ],
      rodape: "Enviado para a cozinha",
    },
    beneficios: [
      {
        t: "Cardápio com fotos",
        d: "Sempre atualizado, sem reimprimir nada.",
        foto: "cena-familia",
        posicao: "50% 40%",
        emDesenvolvimento: true,
      },
      {
        t: "Pedido direto na cozinha",
        d: "Sem papel e sem passar pelo garçom.",
        foto: "cena-cozinha",
        posicao: "50% 40%",
        emDesenvolvimento: true,
      },
      {
        t: "Entra na conta sozinho",
        d: "O que foi pedido já aparece para pagar.",
        foto: "cena-bartender",
        posicao: "50% 40%",
        telaReal: "conta",
      },
    ],
    banda: {
      titulo: "Um QR Code para pedir e pagar.",
      texto:
        "O suporte da mesa é a porta de entrada para tudo: cardápio, pedido, conta e pagamento, na mesma tela que o cliente já conhece.",
      telaReal: "conta",
      altTela: "Conta da Mesa 12 aberta no celular depois de ler o QR Code",
    },
    fatos: [
      { v: "1", t: "QR Code para pedir e pagar" },
      { v: "0", t: "aplicativos para baixar" },
      { v: "Ao vivo", t: "o pedido aparece na conta da mesa" },
    ],
    recursos: [
      {
        icone: ClipboardList,
        t: "Cardápio do restaurante",
        d: "Categorias, fotos e observações por item.",
      },
      {
        icone: ChefHat,
        t: "Integrado à cozinha",
        d: "Cada pedido vira um ticket no Tipe Kitchen.",
      },
      {
        icone: ReceiptText,
        t: "Conta sempre certa",
        d: "O que foi pedido entra na conta da mesa, sem digitação.",
      },
    ],
    faq: [
      [
        "Quando o Tipe Order fica disponível?",
        "Está em fase final de implantação. Quem entrar no teste grátis recebe a novidade primeiro.",
      ],
    ],
  },
  {
    slug: "staff",
    grupo: "Na equipe",
    nome: "Tipe Staff",
    resumo: "Área do garçom com gorjetas, saldo e avaliações",
    status: "disponivel",
    icone: HandCoins,
    foto: "staff",
    posicao: "55% 35%",
    altFoto: "Garçom com pratos numa mão sorrindo ao ver uma notificação no celular",
    topo: {
      foto: "cena-garconete",
      posicao: "40% 35%",
      alt: "Garçonete sorrindo ao ver um aviso no celular, apoiada no balcão do salão",
    },
    cenario: {
      titulo: "A equipe inteira sabe o que está acontecendo.",
      texto:
        "Do bar ao caixa, cada pagamento aparece na hora. Ninguém precisa atravessar o salão para perguntar se a mesa já pagou.",
      itens: [
        {
          foto: "cena-bartender",
          posicao: "50% 40%",
          legenda: "No bar, a caipirinha sai e a conta já está na mesa.",
        },
        {
          foto: "cena-caixa",
          posicao: "50% 40%",
          legenda: "No caixa, os pagamentos digitais chegam aprovados.",
        },
      ],
    },
    rotulo: "Tipe Staff",
    titulo: "Mais tempo para servir. Menos para cobrar.",
    texto:
      "Sem levar conta impressa e maquininha de mesa em mesa. O garçom acompanha as mesas, recebe a gorjeta extra no saldo e saca por Pix.",
    cartao: {
      titulo: "Gorjeta extra · Mesa 12",
      linhas: [
        ["Valor deixado", "R$ 10,00"],
        ["Seu saldo (70%)", "R$ 7,00"],
      ],
      rodape: "Avaliação: 5 estrelas",
    },
    beneficios: [
      {
        t: "Gorjeta extra no saldo",
        d: "70% do valor vai para o garçom da mesa.",
        foto: "gorjetas-garcom",
        posicao: "50% 40%",
      },
      {
        t: "Saque por Pix",
        d: "Ciclos quinzenais, com histórico completo.",
        foto: "cena-garcom",
        posicao: "40% 30%",
      },
      {
        t: "Avaliações",
        d: "Cada nota chega ligada a quem atendeu.",
        foto: "cena-casal",
        posicao: "50% 40%",
        telaReal: "avaliacao",
      },
    ],
    banda: {
      titulo: "A gorjeta chega com o nome de quem atendeu.",
      texto:
        "Na hora de pagar, o cliente pode deixar uma gorjeta extra para o garçom da mesa. O valor entra no saldo dele, separado da conta do restaurante.",
      telaReal: "gorjeta",
      altTela: "Tela real de gorjeta extra: dos R$ 6,00, R$ 4,20 vão para a Joyce",
    },
    fatos: [
      { v: "70%", t: "da gorjeta extra para o garçom da mesa" },
      { v: "2×", t: "por mês: saque nos ciclos 1–15 e 16–fim" },
      { v: "Pix", t: "para receber o saldo" },
    ],
    recursos: [
      {
        icone: Bell,
        t: "Mesas pagas na tela",
        d: "O garçom vê quem já pagou sem precisar perguntar.",
      },
      { icone: Wallet, t: "Saldo e histórico", d: "Cada gorjeta com mesa, data e valor." },
      { icone: Star, t: "Avaliações", d: "Nota e comentário dos clientes atendidos." },
      {
        icone: ShieldCheck,
        t: "Acesso por convite",
        d: "O dono convida a equipe; ninguém mexe no próprio saldo.",
      },
    ],
    faq: [
      [
        "Como o garçom entra?",
        "O dono do restaurante envia um convite e o garçom cria o acesso dele.",
      ],
      [
        "Quem paga o saque?",
        "A Tipe separa 70% da gorjeta extra para o garçom e paga por Pix ao fim de cada ciclo quinzenal.",
      ],
    ],
  },
  {
    slug: "kitchen",
    grupo: "Na equipe",
    nome: "Tipe Kitchen",
    resumo: "Tela da cozinha e do bar com pedidos por ordem",
    status: "disponivel",
    icone: ChefHat,
    foto: "kitchen",
    posicao: "50% 40%",
    altFoto: "Cozinha em pleno serviço com a tela de pedidos acima do passe",
    topo: {
      foto: "cena-cozinha",
      posicao: "50% 40%",
      alt: "Chef montando um prato na cozinha, com a tela de pedidos na parede ao fundo",
    },
    cenario: {
      titulo: "Salão cheio, cozinha em ordem.",
      texto:
        "Quanto mais mesas, mais importa saber o que entrou primeiro. A tela mostra a fila de cada setor, sem grito no passe.",
      itens: [
        {
          foto: "cena-amigos",
          posicao: "50% 40%",
          legenda: "Sexta à noite: a fila aparece por ordem de chegada.",
        },
        {
          foto: "cena-mesa-liberada",
          posicao: "50% 40%",
          legenda: "Prato servido, mesa paga, mesa liberada.",
        },
      ],
    },
    rotulo: "Tipe Kitchen",
    titulo: "A cozinha vê o pedido na hora certa.",
    texto:
      "Os pedidos chegam numa tela para a cozinha e para o bar, na ordem em que foram feitos, com o tempo de cada um. Sem comanda de papel perdida.",
    cartao: {
      titulo: "Cozinha · 3 em preparo",
      linhas: [
        ["Mesa 4 · Moqueca", "08 min"],
        ["Mesa 9 · Picanha", "05 min"],
        ["Mesa 2 · Risoto", "02 min"],
      ],
      rodape: "Mesa 7 · pronto para servir",
    },
    beneficios: [
      {
        t: "Por ordem de chegada",
        d: "Cada pedido com o tempo que está esperando.",
        foto: "cena-garcom",
        posicao: "40% 30%",
      },
      {
        t: "Cozinha e bar",
        d: "Cada setor vê só o que é seu.",
        foto: "cena-bartender",
        posicao: "50% 35%",
      },
      {
        t: "Pronto para servir",
        d: "Um toque avisa que o prato saiu.",
        foto: "cena-garconete",
        posicao: "40% 35%",
      },
    ],
    banda: {
      titulo: "Do salão para a cozinha sem papel.",
      texto:
        "O pedido lançado no salão vai direto para a tela do setor certo. Quando fica pronto, o salão sabe.",
      telaReal: "conta",
      altTela: "Conta da Mesa 12 com os itens lançados",
    },
    fatos: [
      { v: "0", t: "comandas de papel" },
      { v: "2", t: "setores: cozinha e bar" },
      { v: "Ao vivo", t: "tempo de cada pedido" },
    ],
    recursos: [
      { icone: Timer, t: "Tempo de preparo", d: "Cada ticket mostra há quanto tempo espera." },
      { icone: LayoutGrid, t: "Fila clara", d: "Novos, em preparo e prontos." },
      { icone: Bell, t: "Aviso ao salão", d: "O garçom sabe quando buscar o prato." },
    ],
    faq: [
      [
        "Preciso de equipamento especial?",
        "Qualquer tela com navegador serve: TV com computador, tablet ou monitor.",
      ],
    ],
  },
  {
    slug: "restaurant",
    grupo: "Na gestão",
    nome: "Tipe Restaurant",
    resumo: "Painel do salão, caixa e relatórios em tempo real",
    status: "disponivel",
    icone: LayoutGrid,
    foto: "restaurant",
    posicao: "45% 45%",
    altFoto: "Dono de restaurante conferindo o painel da Tipe no notebook no salão vazio da tarde",
    topo: {
      foto: "cena-gerente",
      posicao: "50% 35%",
      alt: "Gerente conferindo o salão no tablet durante o serviço, com as mesas cheias ao fundo",
    },
    cenario: {
      titulo: "Do almoço executivo ao domingo em família.",
      texto:
        "O painel acompanha o ritmo do salão: mesas abrindo, contas sendo divididas e pagamentos aprovados, tudo na mesma tela.",
      itens: [
        {
          foto: "cena-executiva",
          posicao: "50% 35%",
          legenda: "Almoço rápido: pagou pelo celular e saiu sem esperar.",
        },
        {
          foto: "cena-familia",
          posicao: "50% 40%",
          legenda: "Mesa grande: a conta dividida aparece fechando no painel.",
        },
      ],
    },
    rotulo: "Tipe Restaurant",
    titulo: "Seu salão inteiro, numa tela só.",
    texto:
      "Cada mesa, cada item e cada pagamento em tempo real, no computador, no tablet ou no celular. O caixa fecha sem susto.",
    cartao: {
      titulo: "Hoje · ao vivo",
      linhas: [
        ["Mesas ocupadas", "14 de 20"],
        ["Pagas pela Tipe", "31"],
        ["Aguardando no caixa", "2"],
      ],
      rodape: "Demonstração com dados fictícios",
    },
    beneficios: [
      {
        t: "Salão ao vivo",
        d: "Livre, ocupada, aguardando ou encerrada.",
        foto: "cena-mesa-liberada",
        posicao: "50% 40%",
        tabletSalao: true,
      },
      {
        t: "Caixa",
        d: "Abertura, sangria e fechamento do dia.",
        foto: "cena-caixa",
        posicao: "50% 40%",
      },
      {
        t: "Relatórios",
        d: "Vendas, mais vendidos e gorjetas por garçom.",
        foto: "cena-dono",
        posicao: "50% 45%",
      },
      {
        t: "Tudo registrado",
        d: "Cada ação com data e responsável.",
        foto: "tablet-maos",
        posicao: "50% 55%",
      },
    ],
    banda: {
      titulo: "Saiba quem pagou sem atravessar o salão.",
      texto:
        "Os pagamentos digitais aparecem aprovados na hora. Os presenciais ficam esperando a confirmação do caixa, com nome, itens, valor e horário.",
      telaReal: "pago",
      altTela: "Tela real de pagamento realizado no celular do cliente",
    },
    fatos: [
      { v: "Ao vivo", t: "mesas e pagamentos no painel" },
      { v: "R$ 0", t: "de tarifa da Tipe por transação nas contas" },
      { v: "3", t: "papéis de acesso: dono, caixa e garçom" },
    ],
    recursos: [
      { icone: LayoutGrid, t: "Mapa do salão", d: "Todas as mesas e o status de cada uma." },
      {
        icone: Wallet,
        t: "Controle de caixa",
        d: "Pagamentos presenciais confirmados pela equipe.",
      },
      { icone: BarChart3, t: "Fechamento do dia", d: "Vendas, formas de pagamento e gorjetas." },
      {
        icone: History,
        t: "Histórico completo",
        d: "Reaberturas e cancelamentos ficam guardados.",
      },
      {
        icone: ReceiptText,
        t: "Lançamento TIPE",
        d: "Lance os pedidos no próprio painel, se não tiver PDV.",
      },
      {
        icone: QrCode,
        t: "QR Codes e suportes",
        d: "Gerados por mesa, com troca segura do código.",
      },
    ],
    faq: [
      ["Funciona no celular?", "Sim. O painel abre no computador, no tablet ou no celular."],
      ["Posso dar acesso para a equipe?", "Sim, com papéis separados para dono, caixa e garçom."],
    ],
  },
  {
    slug: "ai",
    grupo: "Na gestão",
    nome: "Tipe AI",
    resumo: "A Lebre resume o salão e faz o que você pedir, com confirmação",
    status: "disponivel",
    icone: Bot,
    foto: "ai",
    posicao: "55% 40%",
    altFoto: "Gerente apoiada no balcão consultando o celular antes de abrir o restaurante",
    topo: {
      foto: "cena-dono",
      posicao: "50% 45%",
      alt: "Dono do restaurante no notebook com o painel da Tipe, no salão ainda fechado",
    },
    cenario: {
      titulo: "Pergunte de onde estiver.",
      texto:
        "No escritório antes de abrir ou no meio do salão cheio: a Lebre lê o que está acontecendo e responde em segundos.",
      itens: [
        {
          foto: "cena-gerente",
          posicao: "50% 35%",
          legenda: "Durante o serviço, a gerente pergunta e segue atendendo.",
        },
        { painel: "lebre-acao", legenda: "Nada muda sem o seu Confirmar." },
      ],
    },
    rotulo: "Tipe AI",
    titulo: "Você cuida do salão. A Lebre cuida das respostas.",
    texto:
      "Pergunte em português, digitando ou falando, como está o salão agora. E peça o que precisa: abrir uma mesa, pausar um item, convidar um garçom. A Lebre prepara e você confirma.",
    cartao: {
      titulo: "Lebre",
      linhas: [
        ["Você", "Resuma a situação do salão."],
        ["Lebre", "6 mesas abertas, 1 no caixa."],
      ],
      rodape: "Demonstração com dados fictícios",
    },
    beneficios: [
      {
        t: "Em português, por texto ou voz",
        d: "Pergunte como está o salão. A Lebre lê as mesas com conta aberta, os pagamentos esperando o caixa e a equipe do seu restaurante.",
        painel: "lebre-salao",
      },
      {
        t: "Você confirma antes",
        d: "Abrir, desativar ou liberar mesa, pausar item do cardápio, cadastrar e convidar garçom. Nada muda sem o seu toque em Confirmar.",
        painel: "lebre-acao",
      },
      {
        t: "Com limite diário",
        d: "Cada restaurante tem um limite de mensagens por dia. Quando ele acaba, a Lebre avisa e volta no dia seguinte.",
        painel: "lebre-limite",
      },
    ],
    banda: {
      titulo: "Pergunte como pergunta para o gerente.",
      texto:
        "A Lebre está no painel do restaurante e também no site da Tipe, para tirar dúvidas de quem ainda está conhecendo.",
      lebre: true,
      altTela: "Conversa demonstrativa com a Lebre no celular",
    },
    fatos: [
      { v: "PT-BR", t: "pergunta por texto ou por voz" },
      { v: "1 toque", t: "em Confirmar antes de qualquer mudança" },
      { v: "Foto e PDF", t: "anexos que a Lebre lê, como um cardápio" },
      { v: "Diário", t: "limite de mensagens por restaurante" },
    ],
    recursos: [
      {
        icone: LayoutGrid,
        t: "Situação do salão",
        d: "Mesas com conta aberta, pagamentos esperando o caixa e valor em aberto.",
      },
      {
        icone: ShieldCheck,
        t: "Ações com confirmação",
        d: "Mesas, equipe e cardápio. A Lebre propõe, você confirma.",
      },
      {
        icone: MessageSquareText,
        t: "Voz e anexos",
        d: "Fale em vez de digitar ou mande a foto de um cardápio.",
      },
      {
        icone: Users,
        t: "Respeita os papéis",
        d: "Só o dono altera cadastros. Os outros perfis fazem perguntas.",
      },
      { icone: Sparkles, t: "Respostas curtas", d: "Direto ao ponto, sem inventar números." },
      {
        icone: UserRound,
        t: "Só o seu restaurante",
        d: "Cada restaurante vê apenas os próprios dados.",
      },
    ],
    faq: [
      [
        "A Lebre toma decisões sozinha?",
        "Não. Ela responde e propõe. A ação só acontece quando você toca em Confirmar, e cada uma fica registrada.",
      ],
      [
        "E se o limite do dia acabar?",
        "A Lebre avisa que o limite do dia foi atingido e volta a responder no dia seguinte.",
      ],
    ],
  },
  {
    slug: "guest",
    grupo: "Na mesa",
    nome: "Tipe Guest",
    resumo: "Avaliação depois de pagar e cliente lembrado; relacionamento em desenvolvimento",
    status: "em-breve",
    icone: Heart,
    foto: "casal",
    posicao: "50% 45%",
    altFoto:
      "Casal num restaurante à luz de vela; ela confere a conta no celular, com o QR Code da Tipe na mesa",
    topo: {
      foto: "cena-casal",
      posicao: "50% 40%",
      alt: "Casal rindo à mesa de um restaurante; ele mostra a conta no celular, com o suporte da Tipe ao lado",
    },
    heroTelas: ["pago", "gorjeta", "avaliacao"],
    cenario: {
      titulo: "A experiência termina bem. E o cliente lembra.",
      texto:
        "A avaliação aparece logo depois do pagamento, quando a mesa ainda está ali. O nome fica guardado para a próxima visita.",
      itens: [
        {
          foto: "cena-amigos",
          posicao: "50% 40%",
          legenda: "Amigos avaliam o atendimento antes de levantar.",
        },
        {
          foto: "cena-mesa-liberada",
          posicao: "50% 40%",
          legenda: "A nota chega ligada ao garçom que atendeu.",
        },
      ],
    },
    rotulo: "Tipe Guest",
    titulo: "Quem paga bem, volta.",
    texto:
      "Cada pagamento é uma chance de conhecer o cliente. Hoje a Tipe já pede a avaliação logo depois do pagamento e lembra o nome de quem volta à mesma mesa. Relacionamento e campanhas estão em desenvolvimento.",
    cartao: {
      titulo: "Avaliação · Mesa 12",
      linhas: [
        ["Nota", "5 estrelas"],
        ["Garçom", "Joyce"],
      ],
      rodape: "Depois do pagamento",
    },
    beneficios: [
      {
        t: "Avaliação depois de pagar",
        d: "Com a conta paga, o cliente dá a nota e, se quiser, deixa um comentário. A avaliação chega ligada a quem atendeu.",
        foto: "cena-familia",
        posicao: "50% 40%",
        telaReal: "avaliacao",
      },
      {
        t: "Nome lembrado no aparelho",
        d: "Na próxima visita à mesma mesa, a conta abre com “Olá, Lucas”. O nome fica guardado no celular do cliente, sem cadastro.",
        foto: "cena-executiva",
        posicao: "50% 35%",
        telaReal: "conta",
      },
      {
        t: "Relacionamento e campanhas",
        d: "Em desenvolvimento. Ainda não está disponível para os restaurantes.",
        foto: "cena-praia",
        posicao: "50% 45%",
        emDesenvolvimento: true,
      },
    ],
    banda: {
      titulo: "Um obrigado vira uma visita de volta.",
      texto:
        "Logo depois do pagamento, quando a experiência ainda está fresca, o cliente pode agradecer quem atendeu com uma gorjeta extra e avaliar o atendimento.",
      telaReal: "gorjeta",
      altTela:
        "Tela real de gorjeta extra: Agradeça à Joyce com uma gorjeta, com opções de 3, 5 e 8 por cento",
    },
    fatos: [
      { v: "Depois", t: "do pagamento: a avaliação aparece na hora" },
      { v: "Por garçom", t: "cada avaliação ligada a quem atendeu" },
      { v: "Sem cadastro", t: "o nome fica guardado no celular do cliente" },
    ],
    fluxoReal: {
      titulo: "As telas que o cliente vê hoje.",
      texto: "Capturadas do app do cliente, com dados de teste do restaurante fictício Maré Alta.",
      telas: [
        {
          tela: "conta",
          t: "Nome lembrado",
          d: "A conta abre com o nome de quem já pagou nessa mesa.",
          alt: "Conta da Mesa 12 com a saudação Olá, Lucas e o total de R$ 356,40",
        },
        {
          tela: "pago",
          t: "Pagamento realizado",
          d: "Comprovante, gorjeta para a Joyce e avaliação.",
          alt: "Pagamento realizado de R$ 118,79 no Maré Alta, Mesa 12",
        },
        {
          tela: "gorjeta",
          t: "Gorjeta, se quiser",
          d: "Opcional, cobrada à parte. 70% vai para a Joyce.",
          alt: "Tela de gorjeta extra com 3, 5 ou 8 por cento e Outro valor",
        },
        {
          tela: "avaliacao",
          t: "Avaliação",
          d: "Estrelas e um comentário opcional.",
          alt: "Tela Como foi seu atendimento, com cinco estrelas e campo de comentário",
        },
      ],
    },
    recursos: [
      { icone: Star, t: "Avaliações", d: "Disponível hoje, logo depois do pagamento." },
      { icone: UserRound, t: "Nome lembrado", d: "Disponível hoje, no celular do cliente." },
      { icone: Clock, t: "Relacionamento e campanhas", d: "Em desenvolvimento." },
    ],
    faq: [
      [
        "O programa de relacionamento já existe?",
        "Ainda não. Avaliações e nome lembrado já funcionam; relacionamento e campanhas estão em desenvolvimento.",
      ],
      [
        "Quem vê as avaliações?",
        "O restaurante, e cada avaliação fica ligada ao garçom que atendeu a mesa.",
      ],
    ],
  },
];

export const produtoPorSlug = (slug: string) => PRODUTOS.find((p) => p.slug === slug);

/** Integrações reais hoje e as que estão a caminho. */
export const INTEGRACOES: { nome: string; tipo: string; status: Status; d: string }[] = [
  {
    nome: "Pix",
    tipo: "Pagamento",
    status: "disponivel",
    d: "Pelo Pagar.me, com o dinheiro direto na conta do restaurante.",
  },
  {
    nome: "Apple Pay",
    tipo: "Pagamento",
    status: "disponivel",
    d: "Pagamento em um toque no iPhone.",
  },
  {
    nome: "Google Pay",
    tipo: "Pagamento",
    status: "disponivel",
    d: "Pagamento em um toque no Android.",
  },
  {
    nome: "Pagar.me",
    tipo: "Processamento",
    status: "disponivel",
    d: "Processa os pagamentos digitais das contas.",
  },
  {
    nome: "Lançamento TIPE",
    tipo: "PDV",
    status: "disponivel",
    d: "Lance os pedidos no próprio painel, sem outro sistema.",
  },
  {
    nome: "API TIPE",
    tipo: "PDV",
    status: "disponivel",
    d: "Envie mesas e itens do seu sistema para a Tipe.",
  },
  {
    nome: "Conectores de PDV",
    tipo: "PDV",
    status: "em-breve",
    d: "Integração assistida com os PDVs mais usados no Brasil.",
  },
  {
    nome: "Baixa automática no PDV",
    tipo: "PDV",
    status: "em-breve",
    d: "O pagamento fecha o item no seu sistema.",
  },
];

/**
 * Dúvidas que valem para qualquer produto (mesmos textos do FAQ da home). Completam as
 * dúvidas de cada página até pelo menos quatro, sem repetir pergunta.
 */
export const DUVIDAS_COMUNS: Record<string, [string, string]> = {
  comecar: [
    "Quanto tempo leva para começar?",
    "A implantação é acompanhada: cadastramos as mesas, geramos os QR Codes para os totens e treinamos a equipe. Dá para começar por um salão e ampliar depois.",
  ],
  seguro: [
    "É seguro?",
    "Os pagamentos digitais são processados pelo Pagar.me e o dinheiro cai direto na conta do restaurante; a Tipe não retém o valor das contas. O sistema protege contra pagamento em duplicidade, confere o valor pago antes de aprovar e registra cada ação com data e responsável.",
  ],
  pdv: [
    "Funciona com o meu PDV?",
    "Você pode usar a Tipe completa, lançando os pedidos pelo Lançamento TIPE no próprio painel, ou enviar mesas e itens pela API TIPE. Conectores para outros PDVs estão em desenvolvimento, com integração assistida pela nossa equipe.",
  ],
  custo: [
    "Quanto custa?",
    "Assinatura mensal de acordo com o número de mesas, sem tarifa por transação nas contas; o restaurante paga apenas as tarifas do Pagar.me. Os valores serão divulgados no lançamento.",
  ],
  gorjeta: [
    "Como funciona a gorjeta extra?",
    "Ela vem depois que a conta está paga, como um segundo pagamento, separado. É opcional, nunca vem marcada, e o cliente vê o valor antes de confirmar. A Tipe separa 70% para quem atendeu e 30% como taxa da plataforma.",
  ],
};

const ORDEM_COMUNS: Record<string, (keyof typeof DUVIDAS_COMUNS)[]> = {
  pay: ["seguro", "gorjeta", "custo"],
  order: ["pdv", "comecar", "custo"],
  staff: ["gorjeta", "comecar", "custo"],
  kitchen: ["pdv", "comecar", "custo"],
  restaurant: ["pdv", "seguro", "custo"],
  ai: ["comecar", "custo", "seguro"],
  guest: ["gorjeta", "comecar", "custo"],
};

/** As dúvidas da página do produto, completadas até quatro com as comuns. */
export function duvidasDe(p: Produto): [string, string][] {
  const lista = [...p.faq];
  for (const k of ORDEM_COMUNS[p.slug] ?? []) {
    if (lista.length >= 4) break;
    const d = DUVIDAS_COMUNS[k];
    if (d && !lista.some(([q]) => q === d[0])) lista.push(d);
  }
  return lista;
}
