# Tipe Guest · Arquitetura proposta (Fase 1)

Proposta para validar, baseada em `AUDITORIA.md` e `OPENTABLE-BENCHMARK.md`. Nada aqui foi implementado ainda. Princípio: o Guest cresce **ao lado** da Tipe 1.0, sem tocar pagamento, sem reorganizar o repositório e sem depender da Lovable.

## 1. Onde cada peça mora

```
src/lib/tipe/guest/            domínio puro (sem React, sem Supabase)
  types.ts                     Reservation, Hold, AvailabilityRule, Exception, TableUnit, WaitlistEntry, Alert, Experience…
  states.ts                    máquina de estados da reserva + transições permitidas por papel
  availability.ts              geração de horários a partir de regras, exceções, duração, intervalo e antecedência
  capacity.ts                  escolha de mesa/combinação para N pessoas
  policy.ts                    política de cancelamento (dentro/fora do prazo)
  schemas.ts                   zod: entradas das server functions e do app
  time.ts                      fuso America/Fortaleza, faixas tstzrange
  *.test.ts                    vitest
src/lib/tipe/guest/*.functions.ts   server functions (createServerFn), validação no servidor, flags
src/lib/tipe/guest/*.server.ts      acesso ao Supabase com supabaseAdmin quando necessário
drizzle/migrations/0040…0049   SQL aditivo (avaliações, Fundador, reservas), RLS, RPCs SECURITY DEFINER
tests/db/guest-*.sql           testes de banco (concorrência, RLS, holds, idempotência)
src/components/tipe/painel/reservas/   módulo do painel (Fase 5), plugado no RestaurantPanel existente
src/lib/tipe/demo/             papel "guest" no engine do /demo (Fase 6)
apps/guest/                    app Expo (Fase 7), package.json próprio
docs/tipe-guest/               documentação
```

**Por que o domínio é puro:** o mesmo código roda no servidor (TanStack/Cloudflare), no `/demo` (navegador, sem backend) e no app Expo. As regras de disponibilidade e estados não podem divergir entre os três.

**Como o app Expo consome o domínio sem virar workspace:** `apps/guest/` tem `package.json` e lock próprios e importa `../../src/lib/tipe/guest` por alias de caminho (`tsconfig` `paths` + `babel-plugin-module-resolver`/Metro `watchFolders`). A raiz **não** vira workspace e o `bun.lock` da raiz não muda. Se um dia virar pacote (`packages/guest-domain`), isso é decidido depois, com justificativa.

## 2. Backend e dados

- **Mesmo Supabase.** Nada de projeto novo. Com a saída da Lovable (#34/#36), as migrações do Guest vão para o Supabase próprio pelo mesmo caminho das demais.
- **Tudo aditivo.** Tabelas novas com prefixo `guest_` (consumidor e reservas) e `founding_partner_` (programa). Colunas novas em `restaurant_tables` só nulas e com padrão neutro (`seats_min`, `seats_max`, `area_id`, `reservable boolean default false`).
- **Nenhuma `service_role` no app nem no bundle web.** O app fala com server functions (ou RPCs com RLS) usando o JWT do consumidor.
- **Escrita sensível por RPC SECURITY DEFINER** (criar hold, confirmar reserva, check-in), como o projeto já faz com pagamentos.

### Esboço do modelo (Fase 4, sujeito a revisão)

| Tabela | Papel |
|---|---|
| `guest_profiles` | consumidor (1:1 com `auth.users`), nome de exibição, telefone opcional, preferências, aceite de termos com versão, `deleted_at` para exclusão de conta |
| `guest_restaurant_profiles` | vitrine pública: bairro, cidade, culinária, faixa de preço, fotos (Storage), descrição, horários estruturados, `published boolean` |
| `guest_areas` | áreas do salão (interno, varanda, bar) |
| `guest_availability_rules` | turnos, duração, intervalo entre ocupações, antecedência mín./máx., tamanho de grupo |
| `guest_availability_exceptions` | feriados, eventos privados, bloqueios |
| `guest_table_combinations` | mesas que podem ser unidas |
| `guest_holds` | reserva temporária com `expires_at` |
| `guest_reservations` | reserva, estado, `party_size`, `slot tstzrange`, `idempotency_key`, canal |
| `guest_reservation_tables` | atribuição mesa ↔ reserva com `EXCLUDE USING gist (table_id WITH =, slot WITH &&)` |
| `guest_reservation_events` | trilha de auditoria de cada mudança |
| `guest_waitlist_entries`, `guest_availability_alerts` | lista de espera e alertas, com unicidade para não duplicar |
| `guest_experiences` | menu degustação, eventos; `prepay_enabled boolean default false` sem uso |
| `guest_favorites`, `guest_lists` | salvos e listas |
| `guest_push_tokens` | tokens do Expo Push |
| `guest_feature_flags` | flags por ambiente, restaurante e grupo |
| `guest_reviews` (Fase 2, 0040) | avaliação nova com pagamento, consentimento, moderação e elegibilidade |
| `founding_partner_*` (Fase 3, 0041) | adesão, estados, termos, convites, benefícios concedidos, comunicações, auditoria |

**Concorrência:** a garantia contra overbooking fica no Postgres (`btree_gist` + `EXCLUDE`), não no código. Holds expiram por `expires_at` e são ignorados pela checagem; a confirmação usa `idempotency_key` única. Rate limit reaproveita `rate_limit_buckets`/`enforceRate` que já existem.

**Estados da reserva:** `pendente → confirmada → chegou → sentada → concluida`, mais `cancelada_cliente`, `cancelada_restaurante`, `nao_compareceu`. Transições validadas em `states.ts` e de novo na RPC.

**Check-in → mesa:** ao marcar "sentada", a operação (recepção/garçom autenticado) escolhe a mesa; o vínculo vai para `guest_reservation_tables`. O pagamento continua lendo só a sessão da mesa; a reserva nunca decide cobrança.

## 3. Identidade do consumidor e isolamento

- Consumidor = `auth.users` com linha em `guest_profiles` e **sem** `user_roles`. Não se acrescenta valor ao enum `app_role`.
- Guard novo para as rotas do Guest; e as rotas de painel/garçom continuam exigindo papel no servidor. Antes da Fase 7 é preciso verificar o que `/painel` faz para um usuário autenticado sem restaurante (hoje leva ao onboarding de restaurante) e bloquear isso para quem tem `guest_profiles`.
- **Não unificar identidades.** Pagadores anônimos do QR não são ligados a perfis por nome ou mesa. A ligação só existe quando a própria pessoa, logada no Guest, faz a reserva que depois é paga.
- Restaurante vê de cada cliente só o que veio de interação com ele (reserva, visita, avaliação), nunca dados de outros restaurantes.

## 4. Flags e ambientes

`guest_feature_flags(scope: 'env' | 'restaurant' | 'group', key, enabled)` lida no servidor. Chaves iniciais: `guest.reviews_v2`, `guest.reservations`, `guest.demo`, `guest.pilot`, `guest.public`. **Padrão desligado em produção.** Server functions do Guest recusam quando a flag está desligada (teste obrigatório nº 8).

Ambientes: produção Tipe 1.0 (sem dependência do Guest) · desenvolvimento · demonstração (`/demo`, só navegador) · piloto (restaurantes selecionados) · público (decisão do Roberto).

## 5. Navegação do app (5 abas)

Proposta original: **Explorar, Buscar, Reservas, Salvos, Perfil**. Validação contra o benchmark em `OPENTABLE-BENCHMARK.md` §4. Recomendação: manter as 5 abas, com Buscar abrindo direto na lista com alternância lista/mapa e filtros, e Reservas reunindo futuras, histórico, lista de espera e alertas (o consumidor pensa em "meus compromissos", não em quatro telas).

## 6. Mapas

MapLibre GL com tiles livres de provedor que permita uso em produção dentro da cota gratuita (ex.: MapTiler free ou OpenFreeMap; confirmar política antes de usar). **Não** usar tiles de `tile.openstreetmap.org` em produção. Google Maps/Places e Mapbox pago só com custo mostrado e autorização. Geocodificação de endereço: começar manual (bairro/cidade no perfil), sem API paga.

## 7. Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| Colisão de numeração de migrações (Order, Infra, Guest em paralelo) | alto | Guest usa 0040–0049 (0031–0033 já usadas por #45/release e caixa); reservas a partir de 0042; checar todas as branches antes de criar; reordenar `_journal.json` ao mesclar |
| Conflito de nome `founder` | médio | prefixo `founding_partner_*` no banco e "Restaurante Fundador" na interface; teste que `/fundador` continua só da equipe Tipe |
| LGPD das avaliações | alto | avaliações antigas ficam internas; nova coleta com consentimento separado, desmarcado, versão do texto, moderação; `AVALIACOES-LGPD.md` como rascunho para revisão jurídica |
| Avaliação sem prova de pagamento | médio | marcar "verificada" só quando ligada a `table_payment_requests` aprovado pelo webhook |
| Conflito de arquivo com o Order (`$restaurante.$mesa.tsx`) | médio | Fase 2 parte da base do Order e isola o consentimento em componente próprio |
| QR fixo (foto do QR abre a conta) | alto para o Order, médio para o Guest | check-in pela operação; o Guest não cria nenhum caminho novo baseado em token público |
| Consumidor autenticado cair no fluxo de restaurante | médio | guard por `guest_profiles` e checagem de papel no servidor |
| Custos de mapas | médio | MapLibre + tiles gratuitos com política conferida; nada pago sem ok |
| Custos de lojas (Apple US$ 99/ano, Google US$ 25) e EAS | médio | só documentar (Fase 9); builds locais/Expo Go até autorização |
| Dependências da Lovable | médio | Guest não usa `@lovable.dev/*`, gateway de IA nem `/__l5e`; segue o caminho de #34 |
| Overbooking por corrida | alto | `EXCLUDE USING gist` + idempotência + testes de concorrência no banco local |
| Promessas não aprovadas (Fundador, lançamento) | alto | regras comerciais vazias por padrão; "Em breve" via estado de lançamento (#33) |
