# CRM da Tipe (`/crm`)

> **Revisão de 27/10/2026:** o CRM agora liga três camadas: **A. Comercial** (vender a Tipe), **B. Conta do restaurante** (implantação, módulos, uso, saúde e suporte) e **C. Clientes do restaurante** (quem paga a conta, frequência, gorjetas, avaliações e campanhas). Mapa do processo, arquitetura e o que funciona ou depende de módulo externo: [`ecossistema.md`](./ecossistema.md).

Back office comercial multiempresa: contatos, empresas, leads, funil de vendas, tarefas, atendimento por WhatsApp, suporte interno, equipe e permissões, gamificação, relatórios, planos e financeiro. Roda hoje em **modo demonstração**: os dados são fictícios e ficam no navegador de quem acessa.

Este documento descreve só o que foi entregue e testado nesta etapa.

## O que já existia

- `/backoffice` (Central de Operações do fundador): métricas agregadas de restaurantes, operação e finanças, com acesso protegido por MFA.
- `/admin/leads`: lista de espera da landing (`restaurant_leads`), com pontuação de interesse (`src/lib/tipe/leads-score.ts`) e status de contato. Era o "mini-CRM" interno.
- Backend em Supabase (Lovable Cloud) com papéis `founder`, `owner`, `cashier` e `waiter` para os restaurantes.

## O que foi preservado e o que mudou

- `/backoffice` e `/admin/leads` continuam como estavam. Os dois ganharam só um link para o CRM ("Abrir CRM comercial" e "CRM comercial").
- A pontuação de leads da lista de espera é a mesma função `leadScore`. O perfil do lead no CRM usa os mesmos campos de `restaurant_leads` (mesas, fila no pico, tempo para fechar a conta, PDV, Pagar.me, cidade, quem é o contato, origem).
- Nenhuma tabela do Supabase foi alterada. A estrutura proposta para produção está em [`supabase-crm.sql`](./supabase-crm.sql), fora de `supabase/migrations` para não ser aplicada pela sincronização automática.
- Nenhuma dependência nova foi adicionada. Usa o que o projeto já tinha: TanStack Start, React 19, Tailwind 4, componentes shadcn/Radix, Recharts, lucide-react, sonner, zod e Vitest.

## O que foi implementado

**Base multiempresa** (`src/lib/tipe/crm/`)
- `engine.ts`: motor de comandos. É o único ponto que grava dados. Cada comando confere sessão, participação na organização, permissão do papel, isolamento por organização, limites do plano e validações, e registra atividade, auditoria (inclusive tentativas negadas), notificações e pontos no mesmo passo.
- `permissions.ts`: papéis Proprietário, Administrador, Gestor, Vendedor, Atendente e Somente leitura, com a matriz de ações. A tela esconde o que o papel não pode fazer e o motor recusa mesmo assim se alguém tentar.
- `metrics.ts`: todos os números do dashboard, relatórios, metas e ranking são calculados das entidades (oportunidades, leads, contatos, tarefas, conversas, pontos).
- `seed.ts`: dados fictícios coerentes para duas organizações (Tipe Comercial, em Fortaleza, e Lebre Parceiros Recife), com histórico de seis meses.
- `store.ts`: persistência no `localStorage` com sincronização entre abas (BroadcastChannel). Em produção esta camada é trocada pelo Supabase.
- `whatsapp.ts`: integração preparada com a API oficial do WhatsApp Business (Cloud API da Meta): verificação do webhook, assinatura HMAC `X-Hub-Signature-256` em tempo constante, leitura de mensagens e status de entrega, envio de texto e de modelo aprovado.

**Telas** (`src/routes/crm*.tsx`, componentes em `src/components/tipe/crm/`)
- Layout: menu lateral recolhível com ícones, nomes e dicas; cabeçalho com organização atual, busca global (Ctrl+K), ações rápidas, notificações, indicador de atividade e menu do usuário; menu em gaveta no celular.
- Dashboard: 12 indicadores com variação contra o período anterior, evolução das vendas, metas, funil de conversão, distribuição por etapa, ranking, desempenho da equipe, evolução da meta e atividades recentes, com filtro por pessoa ou equipe e por período.
- Contatos (lista e ficha com linha do tempo, conversas, oportunidades, tarefas, anotações e histórico de alterações), Empresas, Leads (criar, qualificar, atribuir, converter, descartar, histórico), Oportunidades em Kanban com arrastar e soltar persistido, Funis com etapas configuráveis.
- Tarefas com "Meu dia" e Calendário mensal (agenda em lista no celular).
- Atendimento: caixa de entrada compartilhada com WhatsApp simulado, atribuição e transferência, notas internas, respostas rápidas com "/", etiquetas, criação de lead ou oportunidade a partir da conversa, encerramento. WhatsApp: números, modelos de mensagem e registro de eventos. Suporte interno com chamados.
- Equipe (convites, papéis, equipes, departamentos, remoção com confirmação), Organizações (criar e trocar), Gamificação, Relatórios (com exportação CSV), Planos, Financeiro, Configurações, Perfil e Administração global da plataforma.

**Gamificação sem trapaça**
- Pontos só por fatos reais: lead qualificado, tarefa concluída, reunião realizada, oportunidade ganha, meta atingida e desafio concluído.
- Cada fato pontua uma vez (livro-razão por referência). Desfazer o fato (reabrir uma venda, excluir uma meta) estorna os pontos.
- No máximo N tarefas pontuam por dia por pessoa (padrão 12, ajustável). Tarefa criada e concluída em menos de 5 minutos pela mesma pessoa, sem contato ou oportunidade, não pontua.
- Níveis, conquistas, desafios com prazo, ranking com subida e queda em relação ao período anterior e evolução mensal.

**Planos e cobrança simulada**
- Starter (R$ 149, 3 usuários, 500 contatos, 1 funil, 1 número), Professional (R$ 449, 15, 10.000, 5, 3) e Enterprise (R$ 1.290, 100, 200.000, 50, 20).
- Os limites valem na hora para convites, contatos, funis e números de WhatsApp. Só o proprietário muda o plano. A contratação gera uma fatura fictícia paga; nenhum dado de cartão é pedido e nenhum valor é cobrado.

## Rotas

| Rota | Conteúdo |
| --- | --- |
| `/crm/entrar` | Entrada com as contas de demonstração |
| `/crm` | Painel: saúde da carteira, lista de espera do site, agenda, mapa por bairro, jornada, semana e pulso da operação |
| `/crm/jornada` | Jornada integrada: mapa das três camadas com contagens ao vivo e rastro de cada conta |
| `/crm/comercial` | Painel comercial (camada A), o antigo dashboard |
| `/crm/contas`, `/crm/contas?visao=implantacao` | Carteira de restaurantes e fila de implantação (camada B) |
| `/crm/contas/$id` | Conta do restaurante: visão geral, implantação, módulos e integrações, clientes, suporte e jornada |
| `/crm/clientes`, `/crm/clientes?conta=…` | Clientes dos restaurantes, segmentos, campanhas e hábitos (camada C) |
| `/crm/contatos`, `/crm/contatos/$id` | Contatos e ficha do contato |
| `/crm/empresas` | Empresas |
| `/crm/leads` | Leads |
| `/crm/oportunidades` | Funil em Kanban |
| `/crm/funis` | Funis e etapas |
| `/crm/tarefas`, `/crm/tarefas?visao=meu-dia` | Tarefas e Meu dia |
| `/crm/calendario` | Calendário |
| `/crm/atendimento` | Caixa de entrada |
| `/crm/whatsapp` | Números, modelos e eventos do WhatsApp |
| `/crm/suporte` | Chamados dos restaurantes e internos |
| `/crm/equipe` | Pessoas, papéis, convites, equipes |
| `/crm/organizacoes` | Organizações |
| `/crm/gamificacao` | Metas, desafios, ranking, conquistas |
| `/crm/relatorios` | Relatórios |
| `/crm/planos`, `/crm/financeiro` | Assinatura e faturas |
| `/crm/configuracoes`, `/crm/perfil` | Configurações e perfil |
| `/crm/admin` | Administração da plataforma (só equipe Tipe) |
| `/api/public/whatsapp/webhook` | Webhook oficial do WhatsApp (GET verificação, POST eventos) |

## Como rodar

```sh
bun install
bun run dev        # ou: npx vite dev --port 5173
```

Abra `http://localhost:5173/crm` (a porta pode variar; o terminal mostra a certa).

Contas fictícias, todas com a senha `demo1234`:

| E-mail | Papel |
| --- | --- |
| `helena@tipe.demo` | Proprietária da Tipe Comercial, administradora em Recife e equipe da plataforma (vê a Administração) |
| `marina@tipe.demo` | Gestora |
| `thiago@tipe.demo` | Vendedor |
| `davi@tipe.demo` | Atendente |
| `lia@tipe.demo` | Somente leitura |
| `otavio@parceiro.demo` | Proprietário da Lebre Parceiros Recife |

"Restaurar dados de demonstração" (menu do usuário ou Configurações) volta ao cenário inicial.

## Testes

```sh
npx vitest run src/lib/tipe/crm      # motor, regras e WhatsApp
node tests/e2e/crm.e2e.mjs           # ponta a ponta, com o servidor de desenvolvimento rodando
npx tsc --noEmit                     # tipagem estrita do projeto
```

Resultado em 27/10/2026, depois da revisão das três camadas:
- Vitest: 25 de 25 testes passando (os 14 abaixo mais 11 do ecossistema: negócio ganho vira conta com tarefas e responsável, reabrir desfaz, implantação completa e ativação na primeira conta paga, regras de módulos e plano, campanhas só com consentimento e negadas ao vendedor, isolamento, distribuição dos leads do site e adaptadores do Supabase).
- Playwright: 22 de 22 passos passando e nenhum erro de console, incluindo a conta criada pelo negócio ganho até a ativação, o cadastro simulado no site, segmentos e campanha de clientes e chamado ligado a um restaurante.

Resultado anterior, da primeira entrega:
- Vitest: 14 de 14 testes passando (consistência dos dados, fluxo comercial com pontos uma única vez, motivo obrigatório na perda, recusa e auditoria para quem não tem permissão, vendedor sem acesso a oportunidade alheia, isolamento entre organizações, fluxo de organização com convite, limite e troca de plano, proteção do último proprietário, fluxo de atendimento, anti-abuso de tarefas, webhook e assinatura do WhatsApp).
- Playwright: 18 de 18 passos passando e nenhum erro de console. Cobre entrada e senha errada, dashboard, as 19 páginas do menu, links internos, busca global, o fluxo comercial completo (lead, qualificação, conversão, ganho e pontos), atendimento (mensagem simulada, atribuição, resposta, oportunidade e encerramento), tarefa no Meu dia, organização (criar, convidar, papel, limite do plano, dados isolados), troca de plano com fatura fictícia, permissões de Somente leitura e Vendedor, isolamento entre organizações e celular (390 px, sem rolagem horizontal).
- TypeScript: zero erros com a configuração estrita do projeto. ESLint: sem erros nos arquivos do CRM.

## Limitações reais

- **Os dados não vão para o servidor.** Ficam no `localStorage` do navegador. Outra pessoa, outro navegador ou outro aparelho vê o cenário inicial, não o que você criou. É uma demonstração navegável, não um sistema em produção.
- **As permissões do modo demonstração rodam no navegador.** O motor recusa ações proibidas e registra a tentativa, mas quem controla o navegador pode alterar o `localStorage`. A segurança real depende da estrutura com RLS e funções do servidor descrita em `supabase-crm.sql`.
- **WhatsApp:** nenhuma mensagem real é enviada ou recebida. O webhook responde e valida a assinatura, mas ainda não grava as mensagens (não há banco do CRM no servidor). Não usa nenhum mecanismo não oficial.
- **Cobrança:** faturas e pagamentos são fictícios. Não há gateway conectado.
- **Convites:** nenhum e-mail é enviado; o aceite é simulado na tela de Equipe. A senha e o e-mail do usuário não mudam no modo demonstração.
- O arrastar e soltar do Kanban usa o recurso nativo do navegador; no celular, a mudança de etapa é pelo menu "Mover para" de cada cartão.

## Integrações preparadas, ainda não conectadas

- **WhatsApp Business Platform (Cloud API):** `src/lib/tipe/crm/whatsapp.ts` e `src/routes/api/public/whatsapp.webhook.ts`. Para ligar: criar o app na Meta, cadastrar o número, configurar `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET` e o token de acesso como segredos do servidor (nunca no `.env` versionado), apontar o webhook para `/api/public/whatsapp/webhook` e gravar os eventos em `crm_messages` (o campo `wa_message_id` único evita duplicidade).
- **Supabase:** `docs/crm/supabase-crm.sql` cria 31 tabelas `crm_*` (inclui contas de restaurante, clientes, visitas e campanhas, e a view `crm_account_usage_daily` sobre `table_payment_requests`), as funções `crm_role_in`, `crm_is_member` e `crm_can` e 60 políticas de RLS. Foi validado num Postgres 16 local com esquema `auth` simulado. Inclui a carga opcional da lista de espera (`restaurant_leads`) como leads.
- **Gateway de cobrança:** o modelo de assinatura e faturas está pronto para receber um provedor; hoje tudo é simulado.

## Recomendações para produção

1. Aplicar `supabase-crm.sql` no projeto Supabase de destino da migração para Cloudflare + Supabase, depois de revisão.
2. Trocar `store.ts` por chamadas a funções do servidor que repetem `engine.ts` (o motor é puro e testado, então pode ser reaproveitado no servidor), com o Supabase Auth no lugar das contas de demonstração.
3. Gravar os eventos do webhook do WhatsApp e enviar respostas pela Cloud API, com fila e nova tentativa para erros temporários.
4. Conectar um gateway para as assinaturas e emitir nota fiscal fora do CRM.
5. Mover a Administração global para uma rota protegida pelo papel `founder` com MFA, como o `/backoffice` atual.

## Programa Restaurante Fundador (camada B)

Revisão de 28/10/2026, Tipe Guest Fase 3. Detalhes em [`docs/tipe-guest/FUNDADOR.md`](../tipe-guest/FUNDADOR.md).

- Tela `/crm/fundador` (menu Restaurantes, só na organização da Tipe) e card "Restaurante Fundador" na página de cada conta (`/crm/contas/$id`).
- Domínio puro em `src/lib/tipe/crm/founding-partner.ts` (estados, transições, bloqueios); comandos `fp*` no motor; permissões `founding.view`, `founding.manage` e `founding.rules`; adaptador `foundingPartnerFromRows()` em `adapters.ts`.
- Proposta SQL: [`drizzle/migrations/0041_founding_partner_program.sql`](../../drizzle/migrations/0041_founding_partner_program.sql), **não aplicada**. Ela liga a adesão a `restaurants.id` e guarda `crm_account_id` para `crm_restaurant_accounts` (desta proposta) sem FK até este SQL existir no banco.
- Prefixo `founding_partner_*` de propósito: `founder` é o papel da equipe Tipe.
