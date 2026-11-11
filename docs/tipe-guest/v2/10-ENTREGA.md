# Tipe Reserva (ex-Guest) · Projeto 4 · entrega

Branch `guest/v2-opentable`, PR #114 em rascunho. O produto continua **"Em breve"**. Nada aqui
abre reserva real, cobra garantia, envia mensagem, aplica migração ou faz merge.

## Resumo

Experiência no modelo OpenTable com a identidade Tipe:

- **Cliente:** busca, coleções, filtros, lista e mapa, perfil do restaurante com painel fixo, reserva com pedidos e garantia, Minhas reservas, favoritos e Pergunte à Lebre.
- **Restaurante:** gestão de reservas com próximas chegadas, mapa do salão com conflito, perfil por papel e prévia da disponibilidade.
- **Base:** matriz de permissões no servidor e no banco, garantia testada, fuso IANA e mensagens preparadas.

## Funcionalidades

| Área | O que tem | Onde |
|---|---|---|
| Descoberta | Busca sem acento, coleções a partir dos dados (vazias somem), filtros (cozinha, preço, nota, Fundador), ordenação (a relevância não favorece o patrocinado), lista e mapa ilustrativo | `vitrine.ts`, `/guest-demo` |
| Destaque pago | "A Lebre recomenda" sempre com o selo "Patrocinado", fora da ordenação | `VitrineCliente.tsx` |
| Lebre concierge | Só devolve restaurantes da lista. Sem pista, admite que não sabe. Nunca inventa horário, preço ou avaliação | `perguntarLebre` |
| Perfil | Galeria, cardápio, avaliações verificadas com resposta do restaurante, experiências sem venda de ingresso, painel fixo no desktop e CTA no celular | `VitrineCliente.tsx` |
| Reserva | Horários pelo motor real; pedidos tratados como pedidos, não como garantia; política da garantia antes de confirmar; código na confirmação | idem |
| Minhas reservas | Próximas, Anteriores, Canceladas, Lista de espera e Favoritos; cancelar respeita o prazo (`guestCanChange`) | idem |
| Gestão de reservas | Próximas chegadas, mapa do salão (livre, reservada, ocupada, fechando conta, em limpeza, bloqueada), conflito igual ao do banco, troca de papel para ver o que cada um vê | `GuestManagerDemo.tsx` |
| Permissões | Matriz administrador/gerente/caixa/garçom, concessões "conforme autorização", dados do cliente por papel (garçom vê só o mínimo) | `permissoes.ts`, `reservas.functions.ts`, 0057 |
| Módulo contratado | As funções de reserva exigem `restaurant_has_module(rid,'guest')` além da flag | `reservas.functions.ts` |
| Fuso | IANA por restaurante, com horário de verão; sem `timeZone`, mantém o comportamento antigo | `reservas.ts` |
| Garantia | Desfechos e webhooks: idempotente, valor divergente e eventos fora de ordem não mudam o estado, fechar duas vezes não devolve duas vezes | `garantia.ts` |
| Mensagens | Confirmação, lembrete, cancelamento e mesa livre da espera, por e-mail e WhatsApp; **envio desligado** | `mensagens.ts` |
| Landing | `/produtos/guest` com 11 seções: topo, destaques, restaurantes, simulador, como reservar, gestão de reservas, Tipe Pay, avaliações e pontos, Fundador, dúvidas e o restante do Tipe. Selo "Em breve" mantido | `GuestSecoes.tsx` |

## Testes

**Rodados:**
- `vitest`: 381 de 381 passam, incluindo vitrine, Lebre, conflito de mesa, permissões, fuso, garantia, webhooks e mensagens.
- `tests/db/run.sh` em PG16 local: todos os cenários passam.
  - Inclui 13 cenários novos de permissões, com papel manager e concessões `reservas.*`.
  - Inclui o de duas reservas simultâneas, em que só uma passa.
  - A 0057 reaplica sem erro.
- `tsc --noEmit`: sem erros.
- `vite build`: ok.
- Capturas em desktop (1280) e celular (390) sem erros no console, em `/mnt/project-files/tipe-guest-v2/`.

**Não rodados:**
- App Expo em aparelho.
- Banco de produção (não acessível daqui).
- Lighthouse e acessibilidade automatizada.
- E2E com login real.

## Migração proposta (não aplicada)

`drizzle/migrations/0057_guest_staff_permissions.sql`:
- Adiciona `guest_staff_role`, `guest_staff_can`, `guest_staff_grant` e `guest_permission_name`.
- Depende da 0050 (papel manager) e da 0051 (`restaurant_permission_grants`).
- Não cria tabela nova.
- As funções ficam disponíveis só para `service_role`.

## Pendências e decisões do Roberto

1. **Aplicar a 0057:** depois da revisão.
2. **Fundador:** o prompt pede as etapas Interessado → Selecionado → Em implantação → Em testes → Piloto → Apto → Ativo. A 0041, que está em produção, usa convidado → interessado → elegível → participante → selecionado_piloto. Mudar exige uma migração nova; proponho mapear sem apagar dados.
3. **Fuso no servidor:** o servidor ainda não lê o `timezone` do restaurante (usa Fortaleza). Ligar é uma linha depois da revisão.
4. **Mensagens:** ligar o envio exige as chaves do Resend e da Meta, além de modelos de WhatsApp aprovados.
5. **Garantia:** as regras de retenção não são decisão jurídica final. O gateway segue "Em piloto".
6. **Central Tipe:** falta uma seção do Tipe Reserva, com parceiros, etapas e métricas agregadas sem dados pessoais. A Central nova (0052) já existe; fica para o próximo passo.
7. **Comparação com o design antigo:** o simulador antigo continua na landing, e a vitrine e a gestão de reservas são novas.

## Riscos

- O `/guest-demo` é público e não aparece no Google. Não reserva nada, mas fica acessível a quem tiver o link.
- Se a 0057 entrar antes da 0050/0051 numa base nova, as funções só falham ao ser chamadas (plpgsql). A ordem dos números já garante a sequência certa.
- A troca de nome Guest → Reserva vale só no texto visível. As rotas e chaves continuam `guest`.
