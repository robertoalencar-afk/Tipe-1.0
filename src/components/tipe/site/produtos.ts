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
  /** Abas logo abaixo do topo: cada uma troca a foto e a tela da demonstração. */
  beneficios: { t: string; d: string; foto: NomeFoto; posicao?: string; tela?: Tela }[];
  /** Faixa na cor da marca com o celular. */
  banda: { titulo: string; texto: string; tela: Tela; altTela: string };
  /** Fatos verdadeiros do produto (sem números de mercado inventados). */
  fatos: { v: string; t: string }[];
  passos?: { tela: Tela; t: string; d: string; alt: string }[];
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
      { t: "Sem aplicativo", d: "Abre direto na câmera do celular, no navegador." , foto: "scan", posicao: "50% 50%", tela: "conta" },
      { t: "Cada um paga o seu", d: "Por item, em partes iguais, por valor ou porcentagem." , foto: "dividir", posicao: "50% 45%", tela: "selecao" },
      { t: "Pague como preferir", d: "Pix, Apple Pay, Google Pay ou no estabelecimento." , foto: "pix-mao", posicao: "50% 50%", tela: "pagamento" },
      { t: "Gorjeta para a equipe", d: "O cliente agradece quem atendeu, se quiser." , foto: "gorjeta-mao", posicao: "50% 50%", tela: "gorjeta" },
    ],
    banda: {
      titulo: "Aponte a câmera. A conta está ali.",
      texto:
        "Cada mesa tem o seu QR Code no suporte da Tipe. Os pedidos lançados aparecem na conta em tempo real e os itens pagos saem na hora para todo mundo.",
      tela: "aprovado",
      altTela: "Conta da Mesa 12 aberta no celular pela Tipe",
    },
    fatos: [
      { v: "0", t: "aplicativos para baixar" },
      { v: "4", t: "formas de pagar na mesa" },
      { v: "R$ 0", t: "de taxa para quem paga a conta" },
      { v: "70%", t: "da gorjeta extra vai para quem atendeu" },
    ],
    passos: [
      {
        tela: "selecao",
        t: "Escolhe o que consumiu",
        d: "Por item ou dividindo um prato com quem quiser.",
        alt: "Conta da Mesa 12 na Tipe, com a moqueca selecionada para pagar",
      },
      {
        tela: "pagamento",
        t: "Paga como preferir",
        d: "Pix, Apple Pay, Google Pay ou no estabelecimento.",
        alt: "Escolha da forma de pagamento na Tipe, com Apple Pay selecionado",
      },
      {
        tela: "aprovado",
        t: "Aprovado na hora",
        d: "A conta da mesa se atualiza para todo mundo.",
        alt: "Tela de pagamento confirmado da Tipe",
      },
      {
        tela: "gorjeta",
        t: "E agradece, se quiser",
        d: "Gorjeta extra direto para quem atendeu.",
        alt: "Tela de gorjeta extra da Tipe",
      },
    ],
    recursos: [
      { icone: Smartphone, t: "Pix, Apple Pay e Google Pay", d: "Processados pelo Pagar.me, com o dinheiro direto na conta do restaurante." },
      { icone: Wallet, t: "Pagar no estabelecimento", d: "Dinheiro ou maquininha no caixa, com confirmação da equipe." },
      { icone: Users, t: "Divisão sem conta de cabeça", d: "A tela mostra quanto falta para fechar a mesa." },
      { icone: ShieldCheck, t: "Sem pagamento em dobro", d: "O valor é conferido antes de aprovar e cada ação fica registrada." },
      { icone: Star, t: "Avaliação depois de pagar", d: "Nota e comentário ligados ao garçom da mesa." },
      { icone: UserRound, t: "O celular lembra o cliente", d: "Na próxima visita à mesma mesa, a conta já abre com o nome dele." },
    ],
    faq: [
      ["Preciso de maquininha na mesa?", "Não. O pagamento digital acontece no celular do cliente. Quem preferir pagar em dinheiro ou cartão faz isso no caixa, e a equipe confirma no painel."],
      ["O cliente paga alguma taxa?", "Não. Quem está na mesa não paga nada a mais pela Tipe."],
      ["E se o cliente quiser dividir um prato?", "Ele escolhe o item e divide com quem quiser; cada pessoa paga a sua fração."],
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
      { t: "Cardápio com fotos", d: "Sempre atualizado, sem reimprimir nada." , foto: "order", posicao: "50% 50%" },
      { t: "Pedido direto na cozinha", d: "Sem papel e sem passar pelo garçom." , foto: "kitchen", posicao: "50% 40%" },
      { t: "Entra na conta sozinho", d: "O que foi pedido já aparece para pagar." , foto: "hamburgueria", posicao: "50% 45%", tela: "conta" },
    ],
    banda: {
      titulo: "Um QR Code para pedir e pagar.",
      texto:
        "O suporte da mesa é a porta de entrada para tudo: cardápio, pedido, conta e pagamento, na mesma tela que o cliente já conhece.",
      tela: "totem",
      altTela: "Suporte de mesa da Tipe com o QR Code",
    },
    fatos: [
      { v: "1", t: "QR Code para pedir e pagar" },
      { v: "0", t: "aplicativos para baixar" },
      { v: "Ao vivo", t: "o pedido aparece na conta da mesa" },
    ],
    recursos: [
      { icone: ClipboardList, t: "Cardápio do restaurante", d: "Categorias, fotos e observações por item." },
      { icone: ChefHat, t: "Integrado à cozinha", d: "Cada pedido vira um ticket no Tipe Kitchen." },
      { icone: ReceiptText, t: "Conta sempre certa", d: "O que foi pedido entra na conta da mesa, sem digitação." },
    ],
    faq: [
      ["Quando o Tipe Order fica disponível?", "Está em fase final de implantação. Quem entrar no teste grátis recebe a novidade primeiro."],
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
      { t: "Gorjeta extra no saldo", d: "70% do valor vai para o garçom da mesa." , foto: "gorjeta-mao", posicao: "50% 50%" },
      { t: "Saque por Pix", d: "Ciclos quinzenais, com histórico completo." , foto: "staff", posicao: "55% 35%" },
      { t: "Avaliações", d: "Cada nota chega ligada a quem atendeu." , foto: "equipe", posicao: "50% 40%" },
    ],
    banda: {
      titulo: "A gorjeta chega com o nome de quem atendeu.",
      texto:
        "Depois de pagar, o cliente pode deixar uma gorjeta extra para o garçom da mesa. O valor entra no saldo dele, separado da conta do restaurante.",
      tela: "gorjeta",
      altTela: "Tela de gorjeta extra no celular do cliente",
    },
    fatos: [
      { v: "70%", t: "da gorjeta extra para o garçom da mesa" },
      { v: "2×", t: "por mês: saque nos ciclos 1–15 e 16–fim" },
      { v: "Pix", t: "para receber o saldo" },
    ],
    recursos: [
      { icone: Bell, t: "Mesas pagas na tela", d: "O garçom vê quem já pagou sem precisar perguntar." },
      { icone: Wallet, t: "Saldo e histórico", d: "Cada gorjeta com mesa, data e valor." },
      { icone: Star, t: "Avaliações", d: "Nota e comentário dos clientes atendidos." },
      { icone: ShieldCheck, t: "Acesso por convite", d: "O dono convida a equipe; ninguém mexe no próprio saldo." },
    ],
    faq: [
      ["Como o garçom entra?", "O dono do restaurante envia um convite e o garçom cria o acesso dele."],
      ["Quem paga o saque?", "A Tipe separa 70% da gorjeta extra para o garçom e paga por Pix ao fim de cada ciclo quinzenal."],
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
      { t: "Por ordem de chegada", d: "Cada pedido com o tempo que está esperando." , foto: "kitchen", posicao: "50% 40%" },
      { t: "Cozinha e bar", d: "Cada setor vê só o que é seu." , foto: "japones", posicao: "50% 45%" },
      { t: "Pronto para servir", d: "Um toque avisa que o prato saiu." , foto: "equipe", posicao: "50% 40%" },
    ],
    banda: {
      titulo: "Do salão para a cozinha sem papel.",
      texto:
        "O pedido lançado no salão vai direto para a tela do setor certo. Quando fica pronto, o salão sabe.",
      tela: "conta",
      altTela: "Conta da mesa com os itens lançados",
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
      ["Preciso de equipamento especial?", "Qualquer tela com navegador serve: TV com computador, tablet ou monitor."],
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
      { t: "Salão ao vivo", d: "Livre, ocupada, aguardando ou encerrada." , foto: "restaurant", posicao: "45% 45%" },
      { t: "Caixa", d: "Abertura, sangria e fechamento do dia." , foto: "integracoes", posicao: "60% 50%" },
      { t: "Relatórios", d: "Vendas, mais vendidos e gorjetas por garçom." , foto: "fechamento", posicao: "50% 45%" },
      { t: "Tudo registrado", d: "Cada ação com data e responsável." , foto: "restaurant", posicao: "30% 60%" },
    ],
    banda: {
      titulo: "Saiba quem pagou sem atravessar o salão.",
      texto:
        "Os pagamentos digitais aparecem aprovados na hora. Os presenciais ficam esperando a confirmação do caixa, com nome, itens, valor e horário.",
      tela: "aprovado",
      altTela: "Pagamento aprovado na tela do cliente",
    },
    fatos: [
      { v: "Ao vivo", t: "mesas e pagamentos no painel" },
      { v: "R$ 0", t: "de tarifa da Tipe por transação nas contas" },
      { v: "3", t: "papéis de acesso: dono, caixa e garçom" },
    ],
    recursos: [
      { icone: LayoutGrid, t: "Mapa do salão", d: "Todas as mesas e o status de cada uma." },
      { icone: Wallet, t: "Controle de caixa", d: "Pagamentos presenciais confirmados pela equipe." },
      { icone: BarChart3, t: "Fechamento do dia", d: "Vendas, formas de pagamento e gorjetas." },
      { icone: History, t: "Histórico completo", d: "Reaberturas e cancelamentos ficam guardados." },
      { icone: ReceiptText, t: "Lançamento TIPE", d: "Lance os pedidos no próprio painel, se não tiver PDV." },
      { icone: QrCode, t: "QR Codes e suportes", d: "Gerados por mesa, com troca segura do código." },
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
    resumo: "A Lebre responde sobre o seu restaurante",
    status: "disponivel",
    icone: Bot,
    foto: "ai",
    posicao: "55% 40%",
    altFoto: "Gerente apoiada no balcão fazendo uma pergunta no celular antes de abrir o restaurante",
    rotulo: "Tipe AI",
    titulo: "Você cuida do salão. A Lebre cuida das respostas.",
    texto:
      "Pergunte em português como foi o dia, qual prato mais saiu ou quanto entrou de gorjeta. A Lebre lê os dados do seu restaurante e responde.",
    cartao: {
      titulo: "Lebre",
      linhas: [
        ["Você", "Qual prato mais saiu ontem?"],
        ["Lebre", "A moqueca, com 23 pedidos."],
      ],
      rodape: "Demonstração com dados fictícios",
    },
    beneficios: [
      { t: "Em português", d: "Sem filtro, planilha ou relatório para montar." , foto: "ai", posicao: "55% 40%" },
      { t: "Com os seus dados", d: "Responde sobre o seu restaurante, não sobre um exemplo." , foto: "fechamento", posicao: "50% 45%" },
      { t: "Com limite de uso", d: "Um teto diário mantém o custo previsível." , foto: "restaurant", posicao: "45% 45%" },
    ],
    banda: {
      titulo: "Pergunte como pergunta para o gerente.",
      texto:
        "A Lebre está no painel do restaurante e também no site da Tipe, para tirar dúvidas de quem ainda está conhecendo.",
      tela: "conta",
      altTela: "Tela da Tipe no celular",
    },
    fatos: [
      { v: "24h", t: "disponível no painel" },
      { v: "PT-BR", t: "pergunta e resposta" },
      { v: "Diário", t: "limite de uso por restaurante" },
    ],
    recursos: [
      { icone: MessageSquareText, t: "Perguntas livres", d: "Vendas, pratos, gorjetas e avaliações." },
      { icone: Sparkles, t: "Respostas curtas", d: "Direto ao ponto, com os números do período." },
      { icone: ShieldCheck, t: "Só o seu restaurante", d: "Cada restaurante vê apenas os próprios dados." },
    ],
    faq: [
      ["A Lebre toma decisões sozinha?", "Não. Ela responde perguntas; quem decide e age é a equipe do restaurante."],
    ],
  },
  {
    slug: "guest",
    grupo: "Na mesa",
    nome: "Tipe Guest",
    resumo: "Clientes que voltam: avaliações e relacionamento",
    status: "em-breve",
    icone: Heart,
    foto: "bistro",
    posicao: "50% 45%",
    altFoto: "Garçom servindo vinho para dois clientes num bistrô à luz de velas",
    rotulo: "Tipe Guest",
    titulo: "Quem paga bem, volta.",
    texto:
      "Cada pagamento é uma chance de conhecer o cliente. Hoje a Tipe já lembra quem voltou à mesma mesa e recolhe avaliações; o programa de relacionamento vem a seguir.",
    cartao: {
      titulo: "Avaliação · Mesa 9",
      linhas: [
        ["Nota", "5 estrelas"],
        ["Comentário", "Atendimento nota dez"],
      ],
      rodape: "Garçom: Caio",
    },
    beneficios: [
      { t: "Avaliações hoje", d: "Depois do pagamento, com nota e comentário." , foto: "bistro", posicao: "50% 45%", tela: "aprovado" },
      { t: "Cliente lembrado", d: "O celular guarda o nome para a próxima visita." , foto: "cafe", posicao: "50% 45%", tela: "conta" },
      { t: "Relacionamento em breve", d: "Campanhas e fidelidade estão a caminho." , foto: "pizzaria", posicao: "50% 50%" },
    ],
    banda: {
      titulo: "Um obrigado vira uma visita de volta.",
      texto:
        "A avaliação aparece logo depois do pagamento, quando a experiência ainda está fresca, e chega para o restaurante e para o garçom.",
      tela: "aprovado",
      altTela: "Tela de agradecimento depois do pagamento",
    },
    fatos: [
      { v: "1 toque", t: "para avaliar depois de pagar" },
      { v: "Por garçom", t: "cada avaliação ligada a quem atendeu" },
    ],
    recursos: [
      { icone: Star, t: "Avaliações", d: "Disponível hoje." },
      { icone: UserRound, t: "Identidade lembrada", d: "Disponível hoje, no celular do cliente." },
      { icone: Clock, t: "Fidelidade e campanhas", d: "Em breve." },
    ],
    faq: [
      ["O programa de fidelidade já existe?", "Ainda não. Avaliações e identidade lembrada já funcionam; fidelidade e campanhas estão em desenvolvimento."],
    ],
  },
];

export const produtoPorSlug = (slug: string) => PRODUTOS.find((p) => p.slug === slug);

/** Integrações reais hoje e as que estão a caminho. */
export const INTEGRACOES: { nome: string; tipo: string; status: Status; d: string }[] = [
  { nome: "Pix", tipo: "Pagamento", status: "disponivel", d: "Pelo Pagar.me, com o dinheiro direto na conta do restaurante." },
  { nome: "Apple Pay", tipo: "Pagamento", status: "disponivel", d: "Pagamento em um toque no iPhone." },
  { nome: "Google Pay", tipo: "Pagamento", status: "disponivel", d: "Pagamento em um toque no Android." },
  { nome: "Pagar.me", tipo: "Processamento", status: "disponivel", d: "Processa os pagamentos digitais das contas." },
  { nome: "Lançamento TIPE", tipo: "PDV", status: "disponivel", d: "Lance os pedidos no próprio painel, sem outro sistema." },
  { nome: "API TIPE", tipo: "PDV", status: "disponivel", d: "Envie mesas e itens do seu sistema para a Tipe." },
  { nome: "Conectores de PDV", tipo: "PDV", status: "em-breve", d: "Integração assistida com os PDVs mais usados no Brasil." },
  { nome: "Baixa automática no PDV", tipo: "PDV", status: "em-breve", d: "O pagamento fecha o item no seu sistema." },
];
