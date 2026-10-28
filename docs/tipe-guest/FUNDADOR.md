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

## Regras comerciais

O código nasce com tudo vazio (`defaultFoundingPartnerRules`, linha única de `founding_partner_rules`) e, sem regra aprovada, **nenhum benefício pode ser concedido**: o motor recusa e o banco recusa (gatilho). Um benefício só pode ter o texto exato de uma vantagem aprovada.

### Regras definidas em 28/10/2026

O Roberto delegou a definição ao time ("defina para mim", thread Tipe Guest, 28/10/2026 10:05), dentro das regras do prompt: sem preço, desconto, destaque pago, contagem regressiva nem escassez artificial. Estão em `FOUNDING_PARTNER_APPROVED_RULES` (`src/lib/tipe/crm/founding-partner.ts`) e já valem na demonstração do CRM.

| Regra | Valor | Observação |
|---|---|---|
| Vagas | 30 restaurantes participando ao mesmo tempo | Limite interno de operação (a equipe acompanha cada implantação). **Nunca** aparece em texto público. |
| Inscrição | 28/10/2026 a 31/03/2027 (America/Fortaleza) | Fora do período, o convite é recusado. |
| Vantagens | ver lista abaixo | Nenhuma é econômica. |
| Aprovação | Roberto Alencar, 28/10/2026 | `approval_ref` = "Roberto Alencar, thread Tipe Guest, 28/10/2026". |

Vantagens aprovadas (texto exato, usado ao conceder):

1. Selo Restaurante Fundador para o salão e as redes
2. Canal direto com a equipe Tipe durante a implantação
3. Convite para o piloto do Tipe Guest antes da abertura ao público
4. Encontros trimestrais de feedback sobre o produto
5. Identificação como Restaurante Fundador no perfil do Tipe Guest, quando lançado

**Fora desta definição:** vantagem econômica (mensalidade, taxa, cashback). Não existe tabela de preços aprovada no repositório; qualquer vantagem desse tipo entra depois, como nova versão das regras, com valor aprovado pelo Roberto.

**Em produção:** a linha de regras é gravada pela equipe Tipe no CRM (`founding.rules`) quando o CRM sair do modo demonstração; até lá estes valores ficam só no código e neste documento.

### Termos: versão `fundador-v1` (rascunho, pendente de revisão jurídica)

A versão dos termos é separada da aprovação comercial. A demonstração continua com o texto fictício `demo-0.1`. Ninguém vira participante em produção com `fundador-v1` antes da revisão jurídica.

> **Termos de participação no programa Restaurante Fundador · versão fundador-v1**
>
> 1. **O programa.** O Restaurante Fundador reúne os primeiros restaurantes que usam a Tipe e ajudam a construir os próximos produtos da Tipe. A participação é gratuita, voluntária e não substitui o contrato de uso da Tipe.
> 2. **Quem participa.** Restaurantes com conta ativa ou em implantação na Tipe, convidados pela equipe Tipe, durante o período de inscrição.
> 3. **Vantagens.** As vantagens são as listadas nas regras do programa na data do aceite. Elas não têm valor em dinheiro, não se convertem em desconto e não são transferíveis.
> 4. **Uso do selo.** O restaurante pode usar o selo Restaurante Fundador no salão, no cardápio e nas redes enquanto participar, sem alterar cores ou proporções. Ao sair do programa, deixa de usar o selo.
> 5. **Feedback.** O restaurante pode participar dos encontros de feedback. A Tipe pode usar as sugestões para melhorar os produtos, sem obrigação de implementá-las.
> 6. **Dados.** A Tipe trata os dados do restaurante e dos contatos indicados só para operar o programa, conforme a Política de Privacidade da Tipe e a LGPD.
> 7. **Piloto do Tipe Guest.** O convite para o piloto depende de disponibilidade técnica e da escolha da equipe Tipe. Participar do programa não garante vaga no piloto.
> 8. **Saída.** O restaurante pode sair a qualquer momento, avisando a Tipe. A Tipe pode suspender ou encerrar a participação em caso de uso indevido do selo, conta cancelada ou descumprimento destes termos, informando o motivo.
> 9. **Mudanças.** Mudanças nos termos geram nova versão, e a permanência no programa depende de novo aceite.

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

**Escolhido: A · Broto** (Roberto, 28/10/2026). Arquivos `public/interno/selo-fundador/a-broto-*.svg` (ícone e assinatura completa, em claro, escuro, branco e preto). As propostas B · Encontro e C · Alicerce ficam só como registro em `public/interno/selo-fundador.html`. Usam só o símbolo oficial (`src/assets/marca/tipe-simbolo.svg`), turquesa `#0FC9BD` e azul-marinho `#021E34`, em fundo claro, escuro e uma cor, de 24 a 512 px. Gerador: `docs/tipe-guest/selo/gerar-selo.py`. Antes de produção, converter o texto da escolhida em curvas.

## Migração

`drizzle/migrations/0041_founding_partner_program.sql` (bloco do Guest 0040–0049; a Fase 2 usa 0040). **Não aplicada** em nenhum Supabase. O `_journal.json` não foi alterado porque esta branch termina em 0022; ao juntar, registrar 0041 depois de 0023–0040.

## Próximos passos (fora desta fase)

- Server functions (`createServerFn`) com guard de founder + 2FA chamando as funções do banco, e troca do modo demonstração pelo adaptador.
- CTA da landing (outra thread) gravando em `restaurant_leads` com origem própria; o lead convertido vira conta e pode ser convidado aqui.
- Revisão jurídica de `fundador-v1`.
- Converter o texto do selo A em curvas antes de produção.
