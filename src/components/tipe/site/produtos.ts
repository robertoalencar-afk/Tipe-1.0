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
export type Painel = "lebre-salao" | "lebre-acao" | "lebre-anexo";

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
  cartao: {
    titulo: string;
    linhas: [string, string][];
    rodape: string;
    ilustracao?: boolean | undefined;
  };
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
    /** Tablet com a tela da cozinha e do bar (KDS) sobre a foto. */
    tabletKds?: boolean;
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
  banda: {
    titulo: string;
    texto: string;
    telaReal?: TelaReal;
    lebre?: boolean;
    /** Tablet no lugar do celular (telas do restaurante). */
    tablet?: "kds" | "salao";
    altTela: string;
  };
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
      titulo: "Pix, Apple Pay ou Google Pay. Pago em segundos.",
      texto:
        "O cliente escolhe como pagar no próprio celular. O Pix já sai com o código pronto para copiar, e a confirmação aparece sozinha na tela.",
      telaReal: "pix",
      altTela: "Tela de pagamento por Pix da Mesa 12 do Maré Alta, com o código para copiar",
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
    status: "disponivel",
    icone: UtensilsCrossed,
    foto: "order",
    posicao: "50% 50%",
    altFoto: "Colegas de trabalho no almoço; um deles aponta o celular para o QR Code da Tipe",
    topo: {
      foto: "cena-praia",
      posicao: "40% 45%",
      alt: "Amigos numa barraca de praia com água de coco; um deles mostra o celular, com o suporte da Tipe na mesa",
    },
    cenario: {
      titulo: "Pediu, comeu, pagou. Na mesma mesa.",
      texto:
        "O cliente abre o cardápio, pede pelo celular e, no fim, paga pelo mesmo QR Code.",
      itens: [
        {
          foto: "cena-amigos",
          posicao: "50% 40%",
          legenda: "Na mesa grande, cada um pede do próprio celular.",
        },
        {
          foto: "cena-bartender",
          posicao: "50% 35%",
          legenda: "No balcão do bar, o pedido chega escrito, sem papel.",
        },
      ],
    },
    rotulo: "Tipe Order",
    titulo: "Peça sem esperar.",
    texto:
      "O mesmo QR Code da conta abre o cardápio. O cliente escolhe, pede pelo celular e o pedido vai para a cozinha e entra na conta da mesa. Módulo adicional do Tipe Pay.",
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
        t: "Cardápio no celular",
        d: "Sempre atualizado, sem reimprimir nada.",
        foto: "cena-familia",
        posicao: "50% 40%",
      },
      {
        t: "Pedido direto na cozinha",
        d: "Sem papel e sem passar pelo garçom.",
        foto: "cena-cozinha",
        posicao: "50% 40%",
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
    ],
    recursos: [
      {
        icone: ClipboardList,
        t: "Cardápio do restaurante",
        d: "Categorias, busca e observação por item.",
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
    // A pergunta "Quando estará disponível?" vem do estado de lançamento (launch-state.ts).
    faq: [
      [
        "Preciso do Tipe Pay para usar o Order?",
        "Sim. O Order é um módulo adicional do Tipe Pay: o mesmo QR Code da mesa abre o cardápio para pedir e a conta para pagar.",
      ],
      [
        "Como o cliente paga o que pediu?",
        "Pela conta da mesa, como no Tipe Pay: divide se quiser e paga com Apple Pay, Google Pay, Pix ou no estabelecimento. A gorjeta extra é opcional e vem depois, como um segundo pagamento.",
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
          foto: "cena-familia",
          posicao: "50% 40%",
          legenda: "Almoço de domingo: a fila aparece por ordem de chegada.",
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
        foto: "kitchen",
        posicao: "50% 40%",
        tabletKds: true,
      },
      {
        t: "Cozinha e bar",
        d: "Cada setor vê só o que é seu.",
        foto: "cena-bartender",
        posicao: "50% 35%",
        tabletKds: true,
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
      tablet: "kds",
      altTela: "Tela da cozinha da Tipe com os pedidos em preparo por mesa e o tempo de cada um",
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
        foto: "gestor",
        posicao: "40% 55%",
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
      tablet: "salao",
      altTela: "Tela real do Salão no painel da Tipe: cada mesa com o valor pago e o que falta",
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
      foto: "ai",
      posicao: "55% 40%",
      alt: "Gerente apoiada no balcão perguntando à Lebre pelo celular antes de abrir o restaurante",
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
        t: "Lê foto e PDF",
        d: "Mande a foto de um comprovante ou o PDF do cardápio. A Lebre lê só o que aparece nele e responde, ou propõe a ação certa para você confirmar.",
        painel: "lebre-anexo",
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
      { v: "Só o seu", t: "restaurante: cada um vê apenas os próprios dados" },
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
    resumo: "Reserva, lista de espera e volta do cliente, no mesmo app da conta",
    status: "em-breve",
    icone: Heart,
    foto: "casal",
    posicao: "50% 45%",
    altFoto:
      "Casal num restaurante à luz de vela; ela confere a conta no celular, com o QR Code da Tipe na mesa",
    topo: {
      foto: "cena-casal",
      posicao: "50% 35%",
      alt: "Casal à mesa de um restaurante conferindo a reserva no celular",
    },
    heroTelas: ["guest-descobrir", "guest-horarios", "guest-confirmada"],
    cenario: {
      titulo: "Da reserva à próxima visita, sem fila na porta.",
      texto:
        "O cliente reserva no horário livre, chega e a conta abre na mesa. Pagou, agradece quem atendeu e salva o restaurante para voltar.",
      itens: [
        {
          foto: "cena-amigos",
          posicao: "50% 40%",
          legenda: "A mesa reservada já espera o grupo chegar.",
        },
        {
          foto: "cena-garconete",
          posicao: "50% 40%",
          legenda: "A equipe vê a reserva no painel e marca a chegada.",
        },
      ],
    },
    rotulo: "Tipe Guest",
    titulo: "Reserve, chegue e volte.",
    texto:
      "O app do cliente para descobrir restaurantes, reservar o horário livre, entrar na lista de espera e voltar depois. Tudo ligado à conta da mesa da Tipe. Em desenvolvimento, com restaurantes fictícios no simulador.",
    cartao: {
      titulo: "Reserva · Maré Alta",
      linhas: [
        ["Amanhã", "12:00 · 2 pessoas"],
        ["Status", "Confirmada"],
      ],
      rodape: "Simulação",
    },
    beneficios: [
      {
        t: "Reserva no horário livre",
        d: "O cliente escolhe o dia, quantas pessoas e um horário que existe de verdade. O horário fica seguro por 5 minutos enquanto ele confirma. Sem cartão.",
        foto: "cena-casal",
        posicao: "50% 35%",
        telaReal: "guest-horarios",
      },
      {
        t: "Lista de espera que avisa",
        d: "Horário lotado? O cliente entra na fila. Quando uma mesa libera, o app avisa e ele tem 15 minutos para confirmar.",
        foto: "cena-amigos",
        posicao: "50% 40%",
        telaReal: "guest-espera",
      },
      {
        t: "Paga, agradece e volta",
        d: "Na mesa, a conta abre no mesmo app. Depois de pagar, o cliente pode deixar uma gorjeta extra para quem atendeu, avaliar e salvar o restaurante nos favoritos.",
        foto: "cena-familia",
        posicao: "50% 40%",
        telaReal: "guest-gorjeta",
      },
    ],
    banda: {
      titulo: "A reserva confirmada vira uma mesa pronta.",
      texto:
        "O cliente recebe a confirmação com o código da reserva. No painel, o restaurante vê quem vem, em que horário e marca a chegada do grupo.",
      telaReal: "guest-confirmada",
      altTela:
        "Tela de reserva confirmada para amanhã às 12:00, 2 pessoas, no restaurante fictício Maré Alta",
    },
    fatos: [
      { v: "5 min", t: "de horário seguro enquanto o cliente confirma" },
      { v: "15 min", t: "para confirmar quando a mesa da fila libera" },
      { v: "Sem cartão", t: "para reservar" },
      { v: "1 app", t: "da reserva à conta paga" },
    ],
    fluxoReal: {
      titulo: "Da fome ao até a próxima.",
      texto:
        "Quatro toques entre escolher onde comer e sair com a conta paga. Os restaurantes são fictícios: explore à vontade, nada é cobrado.",
      telas: [
        {
          tela: "guest-descobrir",
          t: "Onde vamos comer?",
          d: "Restaurantes com os próximos horários livres.",
          alt: "Lista de restaurantes fictícios em Fortaleza com horários livres para amanhã",
        },
        {
          tela: "guest-hold",
          t: "Confirme sua reserva",
          d: "O horário fica seguro por 5 minutos.",
          alt: "Tela Confirme sua reserva, amanhã às 12:00 para 2 pessoas, com o horário seguro por 5 minutos",
        },
        {
          tela: "guest-pagar",
          t: "A conta na mesa",
          d: "Pix, Apple Pay, Google Pay ou no estabelecimento.",
          alt: "Conta da Mesa 1 no Maré Alta com os itens e as formas de pagamento",
        },
        {
          tela: "guest-fim",
          t: "Até a próxima",
          d: "Salvar nos favoritos e reservar de novo.",
          alt: "Tela Até a próxima, com Salvar nos favoritos e Reservar de novo",
        },
      ],
    },
    recursos: [
      {
        icone: Clock,
        t: "Reservas",
        d: "Horários livres saem do motor de reservas, sem overbooking.",
      },
      { icone: Users, t: "Lista de espera", d: "Avisa o cliente quando a mesa libera." },
      {
        icone: LayoutGrid,
        t: "Painel do restaurante",
        d: "Reservas do dia, da semana e a fila num lugar só.",
      },
      { icone: Star, t: "Avaliações", d: "Depois do pagamento, ligadas a quem atendeu." },
      { icone: Heart, t: "Favoritos", d: "O cliente salva o restaurante para voltar." },
      {
        icone: UserRound,
        t: "Nome lembrado",
        d: "Na próxima visita, a conta abre com o nome do cliente.",
      },
    ],
    faq: [
      [
        "O Tipe Guest já está disponível?",
        "Ainda não. Está em desenvolvimento; dá para experimentar no simulador, com restaurantes fictícios.",
      ],
      ["O cliente paga para reservar?", "Não. A reserva é grátis e não pede cartão."],
      [
        "E se o horário estiver lotado?",
        "O cliente entra na lista de espera. Quando uma mesa libera, o app avisa e ele tem 15 minutos para confirmar.",
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
    status: "disponivel",
    d: "Saipos, Consumer, Linx, TOTVS Chef e outros, a partir da sua chave ou do seu arquivo.",
  },
  {
    nome: "Baixa automática no PDV",
    tipo: "PDV",
    status: "disponivel",
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
