# TIPE

**Pague. Sem esperar.**

A TIPE é uma plataforma brasileira de pagamento de conta na mesa para restaurantes, bares e cafés. O cliente lê o QR Code da mesa, vê os itens consumidos, escolhe o que vai pagar e conclui o pagamento pelo celular, sem baixar aplicativo e sem criar senha.

Site: [tipe.digital](https://tipe.digital) · Instagram: [@tipe.digital](https://instagram.com/tipe.digital)

---

## Sumário

1. [Visão geral](#visão-geral)
2. [Como funciona](#como-funciona)
3. [Funcionalidades](#funcionalidades)
4. [Arquitetura](#arquitetura)
5. [Segurança](#segurança)
6. [Pagamentos](#pagamentos)
7. [Privacidade e LGPD](#privacidade-e-lgpd)
8. [Estrutura do repositório](#estrutura-do-repositório)
9. [Desenvolvimento local](#desenvolvimento-local)
10. [Informações legais](#informações-legais)

---

## Visão geral

Restaurantes perdem tempo e giro de mesa no momento do fechamento da conta. A TIPE resolve isso conectando o PDV do estabelecimento a uma conta digital por mesa:

- **Para o cliente:** paga apenas o que consumiu, divide itens com quem está na mesa e acompanha a atividade em tempo real.
- **Para o restaurante:** menos espera, mais rotatividade, conciliação automática e visão completa do salão.
- **Para o garçom:** gorjetas registradas e repassadas com transparência.

## Como funciona

```text
PDV do restaurante ──► TIPE (conta da mesa) ──► QR Code na mesa
                                                    │
        Cliente: itens escolhidos → meio de pagamento → pagamento
                                                    │
        Digital (Pix, Apple Pay, Google Pay) → aprovado automaticamente
        No estabelecimento (dinheiro ou maquininha) → confirmação do caixa
```

1. Os itens lançados no PDV entram na conta da mesa.
2. O cliente lê o QR Code e se identifica apenas com nome e sobrenome. A identificação fica salva no próprio aparelho, então uma nova leitura retoma a conta.
3. O cliente seleciona itens inteiros ou frações compartilhadas.
4. Paga por carteira digital ou solicita pagamento no estabelecimento.
5. Quando todos os itens estão quitados, a mesa é encerrada e uma nova conta é aberta automaticamente.

## Funcionalidades

### Cliente
- Conta por mesa com atualização em tempo real
- Divisão de itens em partes, com proteção contra pagamento duplicado
- Pix, Apple Pay e Google Pay
- Pagamento no estabelecimento em dinheiro (com cálculo de troco) ou maquininha
- Gorjeta extra opcional, separada da conta do restaurante
- Histórico de atividade da mesa com cliente, itens, valor e horário

### Restaurante
- Painel do salão com status, total, valor pago e progresso de cada mesa
- Confirmação de pagamentos presenciais
- Escolha dos meios de pagamento aceitos
- Gestão de garçons por convite
- Estúdio de totens e adesivos com QR Code
- Conexão com o PDV por API
- Assistente com inteligência artificial (Lebre), que só executa ações após confirmação explícita

### Garçom
- Área própria com gorjetas recebidas
- Ciclos de repasse quinzenais e solicitação de saque via Pix

### Administração TIPE
- Backoffice com métricas agregadas de operação e finanças, sem acesso às contas privadas dos restaurantes
- CRM comercial em `/crm` (modo demonstração): contatos, leads, funil, atendimento por WhatsApp, equipe e permissões, gamificação, planos e relatórios. Detalhes, contas de teste e limitações em [docs/crm/README.md](docs/crm/README.md)

### Simulador
- Demonstração pública e isolada da experiência do cliente, executada inteiramente no navegador

## Arquitetura

| Camada | Tecnologia |
| --- | --- |
| Interface | React 19, TypeScript, Tailwind CSS v4, Radix UI |
| Framework | TanStack Start (SSR e funções de servidor), TanStack Router e Query |
| Execução | Edge runtime |
| Banco de dados | PostgreSQL com Row Level Security |
| Autenticação | E-mail e senha, com papéis em tabela dedicada |
| Pagamentos | Pagar.me API v5 |
| Validação | Zod em todas as entradas do servidor |

Princípios:
- Toda regra de negócio sensível roda no servidor ou em funções do banco com permissões controladas.
- O cliente nunca define o status de um pagamento; a liquidação acontece somente após consulta ao provedor.
- Integrações externas (PDV e provedor de pagamento) entram por endpoints públicos que verificam a origem da chamada.

## Segurança

- **Row Level Security** em todas as tabelas públicas.
- **Papéis separados** (`user_roles`) com verificação por função segura, evitando escalonamento de privilégio.
- **Tokens de mesa rotativos:** o QR Code apenas abre a mesa; pagamentos exigem um token de sessão que muda a cada nova conta.
- **Idempotência:** cada pagamento exige chave única, impedindo cobranças duplicadas em cliques repetidos ou novas tentativas.
- **Bloqueio de linhas** na divisão de itens para evitar venda acima do disponível.
- **Limite de requisições** e registro de eventos de segurança.
- **Credenciais de restaurantes criptografadas** com AES-GCM e acessíveis somente pelo servidor.
- **Histórico preservado:** reabertura de mesa arquiva pagamentos em vez de apagá-los.

## Pagamentos

- Cada restaurante recebe na **própria conta Pagar.me**. A TIPE não guarda dados bancários nem custodia valores do restaurante.
- Webhooks por restaurante revalidam o pedido diretamente no provedor antes de liquidar.
- Pagamentos digitais concluídos são registrados como aprovados; somente pagamentos no estabelecimento aguardam confirmação manual.
- Assinatura dos restaurantes cobrada de forma recorrente via Pagar.me, com período de teste gratuito.

## Privacidade e LGPD

- Termos de Uso, Termos para Parceiros, Política de Privacidade e Política de Cookies **versionados**, com registro de aceite e versão escolhida pelo servidor.
- Consentimento de cookies com bloqueio prévio: nenhuma tecnologia opcional é carregada sem escolha explícita.
- Canal para solicitações de titulares de dados.
- Minimização de dados: o cliente da mesa informa apenas nome e sobrenome.
- Encarregado pelo tratamento de dados (DPO): Roberto Augusto Freitas Alencar Filho · contato@tipe.digital

## Estrutura do repositório

```text
src/
├── components/     Componentes de interface e módulos da plataforma
├── hooks/          Hooks compartilhados
├── integrations/   Clientes do banco e autenticação
├── lib/tipe/       Regras de negócio, funções de servidor e integrações
├── routes/         Páginas e endpoints (roteamento por arquivos)
│   └── api/public/ Webhooks e integrações externas
└── styles.css      Tema e tokens de design
supabase/
└── migrations/     Esquema do banco, políticas e funções
public/             Arquivos estáticos
```

## Desenvolvimento local

Requisitos: Node.js 20+ ou Bun.

```sh
git clone https://github.com/<organizacao>/tipe.git
cd tipe
bun install
bun run dev
```

Scripts:

| Comando | Descrição |
| --- | --- |
| `bun run dev` | Servidor de desenvolvimento |
| `bun run build` | Build de produção |
| `bun run lint` | Análise estática |
| `bun run format` | Formatação do código |

Variáveis de ambiente públicas ficam no arquivo `.env`. Chaves privadas (provedor de pagamento, criptografia) são configuradas apenas no ambiente do servidor e nunca devem ser versionadas. Sem a chave do provedor, os pagamentos digitais rodam em modo de simulação.

## Informações legais

**Tipe Tecnologia de Integração para Pagamento Eletrônico LTDA**
Nome fantasia: TIPE
CNPJ: 69.486.521/0001-05
Fortaleza, Ceará, Brasil
Contato: contato@tipe.digital

© 2026 TIPE. Todos os direitos reservados. Este código é proprietário e confidencial. É proibida a cópia, distribuição ou uso sem autorização expressa.
