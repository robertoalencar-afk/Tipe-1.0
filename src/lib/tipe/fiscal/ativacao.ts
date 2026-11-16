// Passo a passo de ativação da NFC-e na Gestão. Cada passo é derivado do estado real
// (configuração salva, perfis, nota autorizada em homologação), nunca marcado à mão.

type Config = { enabled?: boolean | null } | null;
export type PassoAtivacao = {
  id: string;
  titulo: string;
  texto: string;
  feito: boolean;
  aba?: string;
  ambiente?: "homologacao" | "producao";
  acao?: string;
  link?: { href: string; rotulo: string };
};

export const chaveTesteImpressao = (slug: string) => `tipe:fiscal-printer-test:v1:${slug}`;

export function passosAtivacaoFiscal(s: {
  homologacao: Config;
  producao: Config;
  perfis: number;
  notaHomologacaoAutorizada: boolean;
  impressaoTestada: boolean;
}): PassoAtivacao[] {
  const configurado = Boolean(s.homologacao);
  return [
    {
      id: "documentos",
      titulo: "Certificado A1 e CSC",
      texto:
        "Tenha o e-CNPJ A1 (arquivo .pfx e senha) e o credenciamento de NFC-e na SEFAZ do seu estado, com o CSC e o ID do CSC de homologação e de produção. O contador pode gerar o CSC.",
      feito: configurado,
    },
    {
      id: "emissor",
      titulo: "Conta no Focus NFe",
      texto:
        "Crie a conta, cadastre o CNPJ, envie o certificado A1 e informe o CSC no painel do Focus. Copie o token de homologação. O certificado e o CSC ficam só no Focus.",
      feito: configurado,
      link: { href: "https://focusnfe.com.br/", rotulo: "Abrir o Focus NFe" },
    },
    {
      id: "emitente",
      titulo: "Emitente e conexão",
      texto:
        "Preencha os dados do CNPJ, o regime tributário e cole o token de homologação. O token é guardado cifrado.",
      feito: configurado,
      aba: "configuracao",
      ambiente: "homologacao",
      acao: "Preencher emitente",
    },
    {
      id: "tributos",
      titulo: "Tributos dos produtos",
      texto:
        "Com o contador, defina NCM, CFOP e a tributação de cada item do cardápio. Simples Nacional e MEI não precisam informar IBS/CBS em 2026.",
      feito: s.perfis > 0,
      aba: "produtos",
      ambiente: "homologacao",
      acao: "Definir tributos",
    },
    {
      id: "homologacao",
      titulo: "Habilitar homologação",
      texto: "Ligue a emissão de testes, sem valor fiscal.",
      feito: Boolean(s.homologacao?.enabled),
      aba: "configuracao",
      ambiente: "homologacao",
      acao: "Habilitar testes",
    },
    {
      id: "nota-teste",
      titulo: "Emitir uma nota de teste",
      texto:
        "Encerre uma venda de teste e emita a NFC-e em homologação. Ela precisa voltar autorizada.",
      feito: s.notaHomologacaoAutorizada,
      aba: "emissao",
      ambiente: "homologacao",
      acao: "Emitir nota de teste",
    },
    {
      id: "impressora",
      titulo: "Testar a impressora",
      texto:
        "Conecte a térmica de 80 mm ao caixa e imprima a página de teste. É a mesma impressão usada pela cozinha e pela pré-conta.",
      feito: s.impressaoTestada,
      aba: "impressao",
      acao: "Testar impressão",
    },
    {
      id: "producao",
      titulo: "Ligar a produção",
      texto:
        "Repita o emitente com o token de produção e habilite usando a nota de teste autorizada. A partir daí as notas têm valor fiscal.",
      feito: Boolean(s.producao?.enabled),
      aba: "configuracao",
      ambiente: "producao",
      acao: "Ligar produção",
    },
  ];
}
