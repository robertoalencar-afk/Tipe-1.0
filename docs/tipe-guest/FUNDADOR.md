# Programa Restaurante Fundador

Tipe Guest · Fase 3 · branch `guest/fase-3-fundador` (base `crm/backoffice-saas`, PR #29 do CRM).

O Restaurante Fundador é a estratégia de aquisição da **Tipe 1.0**: uma parceria com os primeiros restaurantes que usam a Tipe. Ele não depende da disponibilidade do Guest e **não promete nada** que não tenha sido aprovado comercialmente.

## Nome

- Banco e código: prefixo `founding_partner_*` (e `fp*` nos comandos do motor). **Nunca** `founder`: no código, `founder` é o papel da equipe Tipe (super-admin com 2FA, rota `/fundador`, migrações 0010 e 0020).
- Interface: "Restaurante Fundador".

## Estados e transições

| De | Para | Regras |
|---|---|---|
| (novo) | `convidado` | Convite registrado (canal, observação). Conta cancelada não é convidada. Fora do período de inscrição, quando definido, é recusado. |
| `convidado` | `interessado`, `encerrado` | |
| `interessado` | `elegivel`, `encerrado` | |
| `elegivel` | `participante`, `interessado`, `encerrado` | Participar exige **aceite dos termos na versão vigente** e conta ativa ou em implantação. Voltar para interessado pede motivo. Vagas, quando aprovadas, são respeitadas. |
| `participante` | `selecionado_piloto`, `suspenso`, `encerrado` | Piloto exige elegibilidade registrada (com justificativa) e conta ativa. |
| `selecionado_piloto` | `participante` (tirar do piloto), `suspenso`, `encerrado` | |
| `suspenso` | `participante` (reativar), `encerrado` | |
| `encerrado` | — | Estado final. Só um **novo convite** reabre a mesma adesão (histórico preservado). Encerrar revoga os benefícios concedidos. |

Suspender e encerrar sempre pedem motivo. A data de entrada (`joinedAt` / `joined_at`) é a primeira vez como participante.

A tabela está em três lugares que precisam concordar: `FP_TRANSITIONS` em `src/lib/tipe/crm/founding-partner.ts`, a função `founding_partner_transition_allowed` e o gatilho `founding_partner_enrollment_guard` na migração 0041.

## Dados

| Entidade (CRM) | Tabela (0041) | Conteúdo |
|---|---|---|
| `FoundingPartnerEnrollment` | `founding_partner_enrollments` | Uma adesão por restaurante. Ligada à conta do CRM (`accountId` / `crm_account_id`) e ao restaurante real (`restaurant_id`). Estado, datas, elegibilidade para piloto. |
| `terms` | `founding_partner_terms_acceptances` | Aceite com **versão**, quem aceitou pelo restaurante, quem registrou e quando. |
| `invites` | `founding_partner_invites` | Convites (canal, observação, quem enviou). No modo demonstração ficam marcados como simulados. |
| `benefits` | `founding_partner_benefits` | Benefícios **efetivamente concedidos**. Lista vazia por padrão. |
| `communications` | `founding_partner_communications` | Histórico de comunicações (canal, enviada/recebida, resumo). |
| `feedback` | `founding_partner_feedback` | Feedback do restaurante por assunto. |
| `history` | `founding_partner_events` | Trilha de auditoria imutável: cada mudança de estado, aceite, convite, elegibilidade e benefício, com ator e horário. |
| `FoundingPartnerRules` | `founding_partner_rules` (+ `_history`) | Regras comerciais. |

## Regras comerciais: vazias por padrão

Vagas, período de inscrição e vantagens nascem nulos/vazios e a interface mostra **"Pendente de aprovação comercial"**. Sem regra aprovada (data, responsável e referência da aprovação), **nenhum benefício pode ser concedido**: o motor recusa e o banco recusa (gatilho). Um benefício só pode ter o texto exato de uma vantagem aprovada.

Não há em código ou texto: preço, desconto, destaque, prioridade, contagem regressiva, "vagas limitadas" ou qualquer escassez artificial.

A versão dos termos é separada da aprovação comercial (é jurídica). Na demonstração existe a versão fictícia `demo-0.1`, identificada como "texto fictício, sem revisão jurídica". Em produção a versão nasce nula, e ninguém vira participante até ela existir.

## Permissões

| Ação | Quem (CRM) |
|---|---|
| Ver o programa (`founding.view`) | Proprietário, Administrador, Gestor, Atendente, Somente leitura |
| Convidar, mudar estado, registrar termos, piloto, benefício (`founding.manage`) | Proprietário, Administrador, Gestor |
| Registrar comunicação e feedback | quem tem `founding.view` e `accounts.manage` |
| Alterar regras comerciais (`founding.rules`) | Proprietário e Administrador, sempre com referência da aprovação |

O programa só existe na organização da própria Tipe (`Org.tipePlatform`). Organizações parceiras do CRM não veem nem operam.

No banco (0041): escrita **só pelo servidor** (`service_role`) por `founding_partner_invite` e `founding_partner_set_status`; nenhuma política de escrita para `authenticated`/`anon`. O restaurante lê só a própria adesão, os próprios termos e benefícios (`is_restaurant_member`). A equipe Tipe (`founder`) lê tudo **só com sessão 2FA** (`aal2`).

## Telas

- `/crm/fundador` (menu Restaurantes → Restaurante Fundador): regras comerciais, registro de convite, filtro por estado (chips e seletor, na URL: `?estado=`), busca, lista e ficha da adesão (`?conta=`), com termos, piloto, benefícios, convites, comunicações, feedback e trilha.
- Card "Restaurante Fundador" na visão geral de cada conta (`/crm/contas/$id`): estado, entrada, termos, piloto, benefícios e ações; conta fora do programa oferece o convite.
- Mudança de estado: diálogo com confirmação nomeada ("Encerrar participação de *Restaurante X*"), motivo obrigatório quando a regra pede, e o erro do motor mostrado no diálogo.
- Estados vazio (sem adesões / filtro sem resultado), carregando (esqueleto do CRM) e erro (sem permissão, organização errada, conta fora do programa).

## Selo

Três propostas em `public/interno/selo-fundador/` (A · Broto, B · Encontro, C · Alicerce), comparadas em `public/interno/selo-fundador.html`. Usam só o símbolo oficial (`src/assets/marca/tipe-simbolo.svg`), turquesa `#0FC9BD` e azul-marinho `#021E34`, em fundo claro, escuro e uma cor, de 24 a 512 px. Gerador: `docs/tipe-guest/selo/gerar-selo.py`. Antes de produção, converter o texto da escolhida em curvas.

## Migração

`drizzle/migrations/0041_founding_partner_program.sql` (bloco do Guest 0040–0049; a Fase 2 usa 0040). **Não aplicada** em nenhum Supabase. O `_journal.json` não foi alterado porque esta branch termina em 0022; ao juntar, registrar 0041 depois de 0023–0040.

## Próximos passos (fora desta fase)

- Server functions (`createServerFn`) com guard de founder + 2FA chamando as funções do banco, e troca do modo demonstração pelo adaptador.
- CTA da landing (outra thread) gravando em `restaurant_leads` com origem própria; o lead convertido vira conta e pode ser convidado aqui.
- Texto dos termos (jurídico) e regras comerciais (Roberto).
