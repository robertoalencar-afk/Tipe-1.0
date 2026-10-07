import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, type LegalSection } from "@/components/tipe/LegalPage";
import { COMPANY, LEGAL, PAYMENT_PROVIDER } from "@/lib/tipe/legal";

export const Route = createFileRoute("/termos-parceiros")({
  head: () => ({
    meta: [
      { title: "Termos para Parceiros (Restaurantes) — TIPE" },
      { name: "description", content: "Condições de uso da plataforma TIPE por restaurantes: cadastro, PDV, pagamentos, assinatura e dados." },
      { property: "og:title", content: "Termos para Parceiros — TIPE" },
      { property: "og:description", content: "Regras da relação entre o restaurante e o TIPE." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://tipe.digital/termos-parceiros" }],
  }),
  component: () => <LegalPage title="Termos para Parceiros" version={LEGAL.partner_terms.version} effective={LEGAL.partner_terms.effective} intro={`Estes termos regem a relação entre o restaurante (Parceiro) e o TIPE, operado por ${COMPANY.legalName}, inscrita no CNPJ ${COMPANY.cnpj}, com sede em ${COMPANY.city}.`} sections={sections} />,
});

const sections: LegalSection[] = [
  { title: "1. Contratação e cadastro", paragraphs: ["O Parceiro se cadastra informando dados verdadeiros do estabelecimento (nome, CNPJ, endereço e telefone) e do responsável. O teste gratuito dura 30 dias, sem cartão. Após o teste, a continuidade depende da assinatura de um plano mensal, sem fidelidade."] },
  { title: "2. Usuários autorizados e credenciais", paragraphs: ["O Parceiro define quem acessa o painel e com qual cargo (dono, caixa, garçom). Cada usuário é responsável por manter sua senha em sigilo. O Parceiro deve remover acessos de quem deixar a equipe."] },
  { title: "3. PDV e integrações", paragraphs: ["O Parceiro conecta o PDV que já utiliza pela chave de integração. A chave é exibida uma única vez e deve ser guardada com segurança. Integrações dependem também do fornecedor do PDV, que não é controlado pelo TIPE."] },
  { title: "4. Cardápio, preços e conta", paragraphs: ["O Parceiro é responsável pela exatidão dos itens, preços, taxa de serviço e lançamentos da conta, bem como pela confirmação dos pagamentos recebidos no estabelecimento."] },
  { title: "5. Pagamentos, gorjetas e taxas", paragraphs: [`Provedor de pagamento digital: ${PAYMENT_PROVIDER}, processando cada cobrança da conta diretamente na conta de pagamento do restaurante. Taxas e prazos seguem o contrato do Parceiro com o provedor. A gorjeta extra é recebida pela TIPE e dividida posteriormente: 70% para a equipe do restaurante e 30% como taxa da plataforma. A taxa de serviço habitual integra a conta do restaurante.`] },
  { title: "6. Planos e cobrança", paragraphs: ["Os valores serão divulgados no lançamento. Os planos mensais não têm fidelidade; os planos anuais incluem os totens com QR Code. Condições específicas constarão da proposta comercial."] },
  { title: "7. Disponibilidade e suporte", paragraphs: ["Empregamos esforços razoáveis para manter a plataforma disponível. O suporte é prestado pelo WhatsApp oficial e pelo e-mail contato@tipe.digital."] },
  { title: "8. Dados pessoais (LGPD)", paragraphs: [
    "Para os dados dos clientes da mesa, pedidos e pagamentos, o Parceiro é controlador e o TIPE é operador, tratando os dados conforme as instruções do Parceiro e esta plataforma. Para cadastro, assinatura, segurança e prevenção a fraudes, o TIPE é controlador.",
    "O Parceiro deve informar seus clientes e colaboradores sobre o uso do TIPE e tratar os dados acessados no painel apenas para a operação do restaurante. As partes colaborarão no atendimento de direitos dos titulares e na comunicação de incidentes.",
  ] },
  { title: "9. Propriedade intelectual", paragraphs: ["O software, a marca e os mascotes do TIPE pertencem ao TIPE. O Parceiro mantém a titularidade sobre seus dados, cardápio e marca."] },
  { title: "10. Suspensão e encerramento", paragraphs: ["A TIPE pode suspender acessos em caso de fraude, uso indevido ou risco à segurança. O Parceiro pode encerrar a assinatura a qualquer momento, observadas as condições do plano contratado. Os prazos de exportação e retenção constarão da versão jurídica aprovada antes do lançamento."] },
  { title: "11. Responsabilidades", paragraphs: ["Cada parte responde pelos danos que causar, nos limites da lei. Nada nestes termos exclui responsabilidades que a legislação não permite afastar."] },
  { title: "12. Alterações e legislação", paragraphs: [`Alterações relevantes geram nova versão e poderão exigir novo aceite. Aplica-se a legislação brasileira. Fica eleito o foro da ${COMPANY.forum}.`] },
];
