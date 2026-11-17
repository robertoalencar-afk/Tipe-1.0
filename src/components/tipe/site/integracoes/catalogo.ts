/**
 * Catálogo de sistemas que a Tipe conecta (03/11, pedido do Roberto: tudo pronto para receber
 * a chave de API ou o arquivo de cada sistema, com o passo a passo de acordo com a escolha).
 * O mesmo catálogo serve a página /integracoes e o painel do restaurante
 * (Configurar › Integrações), onde o dono envia a chave ou o arquivo.
 *
 * Como funciona a ativação: o dono escolhe o sistema e o jeito de conectar, envia a chave
 * (guardada criptografada) ou o arquivo, e a equipe Tipe confere com ele e liga a
 * sincronização. Enquanto isso, a operação segue pelo Lançamento TIPE.
 */

export type CategoriaId = "pdv" | "delivery" | "erp" | "fiscal" | "pagamentos" | "cardapio";
export type MetodoId = "api" | "autorizacao" | "arquivo" | "certificado" | "webhook";

export const CATEGORIAS: { id: CategoriaId; titulo: string; sub: string }[] = [
  { id: "pdv", titulo: "PDV e gestão do salão", sub: "Mesas, cardápio e pedidos" },
  { id: "delivery", titulo: "Delivery", sub: "Pedidos dos apps" },
  { id: "erp", titulo: "ERP e contabilidade", sub: "Fechamento e recebimentos" },
  { id: "fiscal", titulo: "Nota fiscal", sub: "NFC-e pelo Focus NFe, ativação guiada" },
  { id: "pagamentos", titulo: "Pagamentos", sub: "Conciliação das maquininhas" },
  { id: "cardapio", titulo: "Cardápio e planilhas", sub: "Importe sem digitar" },
];

export const METODOS: Record<MetodoId, { titulo: string; sub: string }> = {
  api: { titulo: "Chave de API", sub: "Token de acesso do sistema" },
  autorizacao: { titulo: "Autorização da conta", sub: "Código de vínculo do portal do parceiro" },
  arquivo: { titulo: "Arquivo", sub: "CSV, Excel, XML, PDF ou foto" },
  certificado: { titulo: "Certificado e token", sub: "Certificado A1, CSC e token do emissor" },
  webhook: { titulo: "API TIPE", sub: "Seu sistema envia para a Tipe" },
};

export type Sistema = {
  id: string;
  nome: string;
  cat: CategoriaId;
  metodos: MetodoId[];
  /** Chave em LOGOS (logos.ts), quando há o desenho da marca. */
  logo?: string;
  /** Já funciona sem ativação (ex.: Pagar.me, planilha CSV). */
  nativo?: boolean;
};

const s = (
  id: string,
  nome: string,
  cat: CategoriaId,
  metodos: MetodoId[],
  extra: Partial<Sistema> = {},
): Sistema => ({
  id,
  nome,
  cat,
  metodos,
  ...extra,
});

export const SISTEMAS: Sistema[] = [
  // PDV e gestão do salão
  s("saipos", "Saipos", "pdv", ["api", "arquivo"]),
  s("consumer", "Consumer", "pdv", ["api", "arquivo"]),
  s("linx-degust", "Linx Degust", "pdv", ["api", "arquivo"]),
  s("totvs-chef", "TOTVS Chef", "pdv", ["api", "arquivo"], { logo: "totvs" }),
  s("colibri", "Colibri", "pdv", ["api", "arquivo"]),
  s("goomer", "Goomer", "pdv", ["api", "arquivo"]),
  s("anota-ai", "Anota AI", "pdv", ["api", "arquivo"]),
  s("cardapio-web", "Cardápio Web", "pdv", ["api", "arquivo"]),
  s("takeat", "Takeat", "pdv", ["api", "arquivo"]),
  s("sischef", "Sischef", "pdv", ["api", "arquivo"]),
  s("menew", "Menew", "pdv", ["api", "arquivo"]),
  s("outro-pdv", "Outro sistema", "pdv", ["webhook", "arquivo"]),
  // Delivery
  s("ifood", "iFood", "delivery", ["autorizacao", "arquivo"], { logo: "ifood" }),
  s("rappi", "Rappi", "delivery", ["autorizacao", "arquivo"]),
  s("99food", "99Food", "delivery", ["autorizacao", "arquivo"]),
  s("keeta", "Keeta", "delivery", ["autorizacao", "arquivo"]),
  s("aiqfome", "aiqfome", "delivery", ["autorizacao", "arquivo"], { logo: "aiqfome" }),
  s("delivery-much", "Delivery Much", "delivery", ["autorizacao", "arquivo"]),
  // ERP e contabilidade
  s("omie", "Omie", "erp", ["api", "arquivo"]),
  s("bling", "Bling", "erp", ["api", "arquivo"]),
  s("conta-azul", "Conta Azul", "erp", ["api", "arquivo"]),
  s("olist-erp", "Olist ERP (Tiny)", "erp", ["api", "arquivo"]),
  s("totvs-protheus", "TOTVS Protheus", "erp", ["api", "arquivo"], { logo: "totvs" }),
  s("sap-b1", "SAP Business One", "erp", ["api", "arquivo"], { logo: "sap" }),
  s("nibo", "Nibo", "erp", ["api", "arquivo"]),
  // Nota fiscal
  s("focus-nfe", "Focus NFe", "fiscal", ["certificado"]),
  s("plugnotas", "PlugNotas", "fiscal", ["certificado"]),
  s("enotas", "eNotas", "fiscal", ["certificado"]),
  s("nfe-io", "NFE.io", "fiscal", ["certificado"]),
  s("nuvem-fiscal", "Nuvem Fiscal", "fiscal", ["certificado"]),
  // Pagamentos
  s("pagarme", "Pagar.me", "pagamentos", ["api"], { nativo: true }),
  s("stone", "Stone", "pagamentos", ["api", "arquivo"]),
  s("cielo", "Cielo", "pagamentos", ["api", "arquivo"]),
  s("rede", "Rede", "pagamentos", ["api", "arquivo"]),
  s("pagseguro", "PagBank", "pagamentos", ["api", "arquivo"], { logo: "pagseguro" }),
  s("mercado-pago", "Mercado Pago", "pagamentos", ["api", "arquivo"], { logo: "mercadopago" }),
  s("getnet", "Getnet", "pagamentos", ["api", "arquivo"]),
  // Cardápio e planilhas
  s("planilha", "Planilha CSV ou Excel", "cardapio", ["arquivo"], { nativo: true }),
  s("google-planilhas", "Google Planilhas", "cardapio", ["arquivo"], { logo: "googlesheets" }),
  s("foto-pdf", "Foto ou PDF do cardápio", "cardapio", ["arquivo"]),
];

export type Passo = { titulo: string; texto: string };

const SINCRONIZA: Record<CategoriaId, string> = {
  pdv: "mesas, cardápio e pedidos; quando a conta é paga na Tipe, a baixa volta para o sistema",
  delivery: "pedidos do app, com ativação assistida pela equipe",
  erp: "o fechamento do dia, os recebimentos por forma de pagamento e as gorjetas",
  fiscal: "a NFC-e da venda encerrada, emitida com o CNPJ, o certificado e o CSC do restaurante",
  pagamentos: "as vendas da maquininha, conciliadas com as contas pagas na mesa",
  cardapio: "categorias, itens, preços e fotos do cardápio",
};

const ARQUIVO_DE: Record<CategoriaId, string> = {
  pdv: "o cardápio (e, se quiser, a lista de mesas)",
  delivery: "o cardápio da loja no app",
  erp: "o plano de contas ou o modelo de importação",
  fiscal: "os dados fiscais dos produtos (NCM e CFOP)",
  pagamentos: "o extrato de vendas",
  cardapio: "o cardápio",
};

/** Passo a passo de acordo com o sistema e o jeito de conectar escolhidos. */
export function passosPara(sis: Sistema, metodo: MetodoId): Passo[] {
  const n = sis.nome;
  const ativar: Passo = {
    titulo: "A Tipe confere e liga",
    texto: `A equipe Tipe testa a conexão com você e liga a sincronização de ${SINCRONIZA[sis.cat]}. Até lá, tudo segue pelo Lançamento TIPE, sem parar o salão.`,
  };
  const painel = (o_que: string): Passo => ({
    titulo: "Envie no painel da Tipe",
    texto: `No painel, abra Configurar › Integrações, escolha ${n} e ${o_que}. Chaves e senhas ficam guardadas criptografadas e ninguém da equipe as vê em texto.`,
  });
  switch (metodo) {
    case "api":
      if (sis.nativo)
        return [
          {
            titulo: "Crie a conta no Pagar.me",
            texto:
              "Se ainda não tem, abra a conta do restaurante no Pagar.me. O dinheiro cai direto nela.",
          },
          {
            titulo: "Copie a chave secreta",
            texto:
              "No painel do Pagar.me, em Desenvolvimento › Chaves, copie a chave que começa com sk_.",
          },
          painel("cole a chave em Recebimentos"),
          {
            titulo: "Pronto para receber",
            texto:
              "Pix, Apple Pay e Google Pay passam a cair na conta do restaurante, com a gorjeta separada para a equipe.",
          },
        ];
      return [
        {
          titulo: `Peça o token ao ${n}`,
          texto: `No ${n}, procure a área de Integrações ou API e gere um token de acesso para a Tipe. Se não achar, peça ao suporte do ${n} "o token de integração para um parceiro".`,
        },
        painel("cole o token"),
        {
          titulo: "Escolha o que sincronizar",
          texto: `Marque o que deve passar entre os dois: ${SINCRONIZA[sis.cat]}.`,
        },
        ativar,
      ];
    case "autorizacao":
      return [
        {
          titulo: `Entre no portal do parceiro ${n}`,
          texto: `Use a conta do restaurante no portal de lojas do ${n}, a mesma em que você muda o cardápio e os horários.`,
        },
        {
          titulo: "Autorize a Tipe",
          texto: `Na área de aplicativos ou integrações, adicione a Tipe e gere o código de vínculo. Se a opção não aparecer, o suporte do ${n} libera para a sua loja.`,
        },
        painel("cole o código de vínculo e o ID da loja"),
        ativar,
      ];
    case "arquivo":
      if (sis.id === "foto-pdf")
        return [
          {
            titulo: "Tire a foto ou pegue o PDF",
            texto: "Uma foto nítida de cada página do cardápio, ou o PDF que você já usa.",
          },
          painel("envie as fotos ou o PDF"),
          {
            titulo: "A Lebre monta o cardápio",
            texto:
              "A Lebre lê categorias, itens e preços e monta o cardápio. Você revisa antes de publicar.",
          },
          {
            titulo: "Publique",
            texto: "Com um toque o cardápio vai para a conta da mesa e para o Tipe Order.",
          },
        ];
      return [
        {
          titulo: sis.cat === "cardapio" ? "Prepare a planilha" : `Exporte do ${n}`,
          texto:
            sis.cat === "cardapio"
              ? "Uma linha por item, com categoria, nome, preço e, se quiser, descrição. Baixe o modelo no painel para começar mais rápido."
              : `No ${n}, exporte ${ARQUIVO_DE[sis.cat]} em CSV, Excel (XLSX) ou XML. Costuma ficar em Relatórios ou Exportar.`,
        },
        painel("envie o arquivo"),
        {
          titulo: "Revise antes de valer",
          texto:
            "CSV e Excel entram na hora para você revisar. Outros formatos a Lebre lê e organiza; nada muda no salão até você confirmar.",
        },
        {
          titulo: "Pronto",
          texto: `Quando quiser atualizar, envie um arquivo novo. Para ficar automático, conecte por ${sis.metodos.includes("api") ? "chave de API" : "autorização da conta"}.`,
        },
      ];
    case "certificado":
      if (sis.id === "focus-nfe")
        return [
          {
            titulo: "Separe o certificado A1 e o CSC",
            texto:
              "O arquivo .pfx do e-CNPJ A1 com a senha, e o CSC com o ID dele, gerado no credenciamento de NFC-e da SEFAZ do seu estado. O contador costuma ajudar.",
          },
          {
            titulo: "Cadastre o CNPJ no Focus NFe",
            texto:
              "Na sua conta do Focus NFe, cadastre a empresa, envie o certificado e informe o CSC. Copie o token de homologação e o de produção.",
          },
          {
            titulo: "Siga o passo a passo na Gestão",
            texto:
              "Em Gestão › Fiscal › Ativar NFC-e: emitente e token, tributos dos produtos (com o contador), nota de teste em homologação e teste da impressora. O token fica guardado criptografado.",
          },
          {
            titulo: "Ligue a produção",
            texto:
              "Com a nota de teste autorizada, habilite a produção. A partir daí, cada venda encerrada pode sair com NFC-e, impressa na térmica do caixa.",
          },
        ];
      return [
        {
          titulo: "Separe o certificado A1",
          texto:
            "O arquivo .pfx do certificado digital do CNPJ e a senha dele. O contador costuma ter.",
        },
        {
          titulo: "Pegue o CSC na SEFAZ",
          texto:
            "O Código de Segurança do Contribuinte (CSC) e o ID dele, no site da SEFAZ do seu estado. É ele que autoriza a NFC-e.",
        },
        { titulo: `Token do ${n}`, texto: `Na conta do emissor ${n}, gere o token de API.` },
        painel("envie o certificado, o CSC e o token"),
        ativar,
      ];
    case "webhook":
      return [
        {
          titulo: "Ligue a API TIPE",
          texto:
            "No painel, em Configurar › Integrações, escolha Outro sistema › API TIPE. A Tipe gera um endereço e um segredo só seus.",
        },
        {
          titulo: "Passe para quem cuida do seu sistema",
          texto:
            "Com o endereço e o segredo, o seu sistema envia mesas e itens para a Tipe sempre que algo muda. A documentação vai junto.",
        },
        {
          titulo: "A baixa volta sozinha",
          texto:
            "Quando a conta é paga na Tipe, o seu sistema recebe o aviso para dar baixa, com novas tentativas se ele estiver fora do ar.",
        },
        ativar,
      ];
  }
}

export function sistemasDa(cat: CategoriaId) {
  return SISTEMAS.filter((x) => x.cat === cat);
}
