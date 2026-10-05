import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, type LegalSection } from "@/components/tipe/LegalPage";
import { LEGAL, PENDING, PRIVACY_EMAIL } from "@/lib/tipe/legal";

export const Route = createFileRoute("/privacidade/")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — TIPE" },
      { name: "description", content: "Como o TIPE trata dados de clientes, restaurantes e equipes, com base na LGPD." },
      { property: "og:title", content: "Política de Privacidade — TIPE" },
      { property: "og:description", content: "Quais dados o TIPE trata, para quê, com quem compartilha e como exercer seus direitos." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://tipe.digital/privacidade" }],
  }),
  component: () => <LegalPage title="Política de Privacidade" version={LEGAL.privacy_policy.version} effective={LEGAL.privacy_policy.effective} intro="Esta política explica, de forma direta, como o TIPE trata dados pessoais de acordo com a Lei Geral de Proteção de Dados (Lei 13.709/2018)." sections={sections} />,
});

const sections: LegalSection[] = [
  { title: "1. Quem somos", paragraphs: [
    `TIPE, plataforma de pagamento na mesa e gestão para restaurantes, com sede em Fortaleza, CE. Razão social: ${PENDING}. CNPJ: ${PENDING}. Endereço: ${PENDING}.`,
  ] },
  { title: "2. Escopo e papéis", paragraphs: [
    "Esta política vale para o site tipe.digital, a página da mesa acessada por QR Code, o simulador e a área do restaurante.",
    "Quando tratamos dados da conta da mesa, dos pedidos e dos pagamentos em nome do restaurante, o restaurante é o controlador e o TIPE atua como operador. Quando tratamos dados para nossas próprias finalidades — cadastro e assinatura do restaurante, segurança da plataforma, prevenção a fraudes, contatos comerciais e solicitações de privacidade — o TIPE é controlador.",
  ] },
  { title: "3. Clientes na mesa", bullets: [
    "Nome e sobrenome informados na identificação: ficam guardados apenas no seu aparelho para retomar a conta. O nome é enviado ao servidor somente quando você registra um pagamento, para identificar quem pagou.",
    "Pagamentos: nome informado, itens pagos, valor, meio escolhido, status, data e horário.",
    "Não pedimos CPF, telefone, e-mail, endereço ou criação de conta para usar a mesa.",
    "A gorjeta extra opcional não aparece no histórico da conta do restaurante.",
  ] },
  { title: "4. Restaurantes e responsáveis", bullets: [
    "Nome do responsável, e-mail e senha (armazenada de forma criptografada pelo serviço de autenticação) ou login com Google (nome, e-mail e foto de perfil básicos).",
    "Dados do restaurante: nome, CNPJ, endereço, telefone, horário, mesas, cardápio, plano e status da assinatura.",
    "Registros operacionais: pedidos, cancelamentos, caixa e confirmações de pagamento, com o usuário que executou a ação.",
    "Contato comercial pelo site: nome do restaurante, seu nome, e-mail, WhatsApp e mensagem.",
  ] },
  { title: "5. Garçons e colaboradores", bullets: [
    "Usuários da equipe: nome de exibição, e-mail e cargo no restaurante.",
    "Garçons cadastrados no PDV: código e nome, vinculados aos pedidos e mesas.",
    "Ações no sistema ficam registradas para auditoria e segurança.",
  ] },
  { title: "6. Dados técnicos", paragraphs: [
    "Para segurança, registramos eventos como tentativas negadas e excesso de requisições, incluindo o endereço IP. Contadores temporários por IP são usados para limitar abusos. Não usamos ferramentas de analytics, publicidade ou gravação de sessão.",
  ] },
  { title: "7. Finalidades e bases legais", bullets: [
    "Exibir a conta, registrar pagamentos e operar o PDV — execução de contrato e procedimentos relacionados (art. 7º, V).",
    "Registros financeiros, fiscais e de auditoria — cumprimento de obrigação legal e exercício regular de direitos (art. 7º, II e VI).",
    "Segurança, prevenção a fraudes e limitação de abusos — legítimo interesse (art. 7º, IX).",
    "Responder contatos comerciais — procedimentos preliminares a contrato, a pedido do titular (art. 7º, V).",
    "Consentimento é usado somente quando necessário (por exemplo, futuras tecnologias opcionais de cookies), podendo ser revogado a qualquer momento.",
  ] },
  { title: "8. Compartilhamento e prestadores de serviço", paragraphs: [
    "Não vendemos dados. Compartilhamos apenas o necessário com:",
  ], bullets: [
    "O restaurante em que você está (pagamentos da mesa).",
    "Provedor de infraestrutura em nuvem (banco de dados, autenticação e hospedagem), que pode processar dados fora do Brasil.",
    "Google, quando você escolhe entrar com Google; e Google Fonts, que recebe o endereço IP ao carregar as fontes do site.",
    "Provedor de inteligência artificial, apenas com o texto que você digita para sugerir a divisão de um item (sem seu nome).",
    "Provedores de pagamento, quando integrados (ver item 9).",
    "Autoridades, quando exigido por lei ou ordem judicial.",
  ] },
  { title: "9. Pagamentos", paragraphs: [
    `Os pagamentos digitais serão processados por provedores de pagamento autorizados. Provedor em definição: ${PENDING}. O TIPE não armazena dados de cartão; guarda apenas valor, itens, meio escolhido e status. Pagamentos no estabelecimento (dinheiro ou maquininha) ficam pendentes até a confirmação do restaurante.`,
  ] },
  { title: "10. Integração com PDVs", paragraphs: [
    "Os itens da conta podem vir do PDV TIPE ou do PDV que o restaurante já usa. Quando o restaurante conecta um PDV externo, recebemos itens, quantidades, preços e mesa — não pedimos dados pessoais de clientes ao PDV.",
  ] },
  { title: "11. Segurança", paragraphs: [
    "Usamos conexão criptografada (HTTPS), controle de acesso por restaurante e por cargo, chaves de integração armazenadas apenas como hash, sessões de mesa renovadas a cada reabertura, limites de requisições e trilhas de auditoria. Nenhum sistema é totalmente imune a incidentes; havendo incidente relevante, comunicaremos titulares e autoridade conforme a lei.",
  ] },
  { title: "12. Retenção", paragraphs: [
    "Mantemos os dados enquanto necessários às finalidades acima. Pagamentos de mesas reabertas são arquivados, não apagados, para histórico financeiro e auditoria. Os prazos de retenção por categoria estão em validação jurídica e contábil e serão publicados nesta política.",
    "A identificação local na mesa pode ser apagada por você a qualquer momento limpando os dados do site no navegador.",
  ] },
  { title: "13. Cookies e tecnologias semelhantes", paragraphs: ["Usamos apenas armazenamento estritamente necessário. Detalhes na Política de Cookies."] },
  { title: "14. Seus direitos", bullets: [
    "Confirmação da existência de tratamento e acesso aos dados.",
    "Correção de dados incompletos, inexatos ou desatualizados.",
    "Anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade.",
    "Portabilidade, quando cabível.",
    "Informação sobre compartilhamentos.",
    "Revogação do consentimento, quando ele for a base legal.",
    "Petição à Autoridade Nacional de Proteção de Dados (ANPD).",
  ], paragraphs: ["Alguns dados podem ser mantidos mesmo após pedido de exclusão, quando houver obrigação legal, fiscal, prevenção a fraude ou exercício regular de direitos. Para dados tratados em nome de um restaurante, poderemos encaminhar o pedido a ele."] },
  { title: "15. Transferência internacional", paragraphs: ["Alguns prestadores (infraestrutura, Google e inteligência artificial) podem processar dados fora do Brasil. As salvaguardas aplicáveis estão em validação jurídica."] },
  { title: "16. Crianças e adolescentes", paragraphs: ["O TIPE não é direcionado a crianças e não coleta intencionalmente dados delas. A área do restaurante é destinada a maiores de 18 anos."] },
  { title: "17. Alterações", paragraphs: ["Mudanças relevantes geram nova versão desta política, com data de vigência. Quando necessário, pediremos novo aceite."] },
  { title: "18. Canal de privacidade", paragraphs: [
    `Encarregado (DPO): ${PENDING}. Contato: ${PRIVACY_EMAIL} ou pela página de solicitação de privacidade.`,
  ] },
];
