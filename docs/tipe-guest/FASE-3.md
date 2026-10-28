# Fase 3 · Programa Restaurante Fundador · relatório

Branch `guest/fase-3-fundador`, empilhada sobre `crm/backoffice-saas` (PR #29, CRM em modo demonstração). PR em rascunho contra `crm/backoffice-saas`. Data: 28/10/2026.

Documento do programa: [`FUNDADOR.md`](./FUNDADOR.md).

## O que foi feito

**Dados e regras (CRM em modo demonstração)**
- `src/lib/tipe/crm/types.ts`: `FoundingPartnerEnrollment` (adesão ligada à `RestaurantAccount`), estados, aceite de termos com versão, convites, benefícios concedidos, comunicações, feedback, trilha (`history`) e `FoundingPartnerRules`; `Org.tipePlatform`.
- `src/lib/tipe/crm/founding-partner.ts` (novo): tabela de transições, rótulos, bloqueios puros (`transitionBlocker`, `inviteBlocker`, `benefitBlocker`), regras padrão vazias.
- `src/lib/tipe/crm/engine.ts`: comandos `fpInvite`, `fpTransition`, `fpRecordTerms`, `fpSetPilotEligibility`, `fpLogCommunication`, `fpAddFeedback`, `fpGrantBenefit`, `fpSetRules`. Cada mudança grava evento na trilha da adesão, na auditoria geral e na atividade da conta; recusas por permissão entram na auditoria como "negado".
- `src/lib/tipe/crm/permissions.ts`: `founding.view`, `founding.manage`, `founding.rules`.
- `src/lib/tipe/crm/seed.ts` / `seed-ecosystem.ts`: 6 adesões de demonstração (uma em cada estado principal), nenhum benefício, regras comerciais vazias, termos com versão fictícia `demo-0.1`. `SEED_VERSION` 2 → 3 (a demonstração salva no navegador é recriada uma vez).
- `src/lib/tipe/crm/adapters.ts`: `foundingPartnerFromRows()` e `foundingPartnerRulesFromRow()` para as tabelas da 0041; novo ponto em `INTEGRATION_POINTS`.

**Interface**
- `src/routes/crm.fundador.tsx` (nova rota `/crm/fundador`, menu Restaurantes) e `src/components/tipe/crm/fundador.tsx`: regras comerciais ("Pendente de aprovação comercial"), convite, filtro por estado, busca, lista, ficha da adesão e diálogo de mudança de estado com confirmação nomeada e motivo.
- `src/routes/crm.contas.$id.tsx`: card "Restaurante Fundador" na visão geral da conta.
- `src/components/tipe/crm/Shell.tsx`: item de menu, só para a organização da Tipe.

**Selo**: `public/interno/selo-fundador/` (24 SVGs: 3 propostas × ícone/assinatura × claro/escuro/preto/branco), `public/interno/selo-fundador.html`, gerador `docs/tipe-guest/selo/gerar-selo.py`.

**Banco**: `drizzle/migrations/0041_founding_partner_program.sql`, `tests/db/founding_partner.sql` e um bloco em `tests/db/run.sh` que roda esse arquivo.

**Testes de interface**: `tests/e2e/fundador.e2e.mjs`.

**Docs**: `docs/tipe-guest/FUNDADOR.md`, este relatório, referência em `docs/crm/README.md` e `docs/crm/supabase-crm.sql`.

## Migração

- Arquivo: `drizzle/migrations/0041_founding_partner_program.sql`. Número do bloco do Guest **0040–0049** (0031–0033 acabaram usados por outras branches, PR #45 e release; a Fase 2 usa 0040), conforme orientação recebida em 28/10.
- **Não foi aplicada** em nenhum Supabase (nem produção, nem outro projeto). Só rodou no Postgres 16 local descartável (`/var/tmp/pg-fundador`, porta 5440).
- Aditiva: só cria tabelas, funções e gatilhos `founding_partner_*`. Idempotente (o `run.sh` reaplica a última migração e ela passou).
- `_journal.json` **não** foi alterado: esta branch termina em 0022. Ao juntar com as branches que trazem 0023–0040, registrar 0041 depois delas.

## Testes rodados (saída resumida)

```
npx tsc --noEmit                      → sem erros (exit 0)
npx vitest run                        → Test Files 12 passed (12) · Tests 128 passed (128)
  founding-partner.test.ts            → 22 passed (transições permitidas e negadas, auditoria,
                                         nenhum benefício por padrão, papéis, organização parceira,
                                         adaptador)
bun run build                         → exit 0 (✓ built, nitro gerou .output)
tests/db/run.sh (Postgres 16 local)   → TODOS OS CENÁRIOS DO BANCO PASSARAM
  78 linhas "ok", 21 do Fundador, entre elas:
  ok: Fundador: regras comerciais vazias por padrão (vagas, período, vantagens, termos)
  ok: Fundador: convidado → interessado auditado com estado anterior, novo e ator
  ok: Fundador: transição não permitida é recusada e não gera evento
  ok: Fundador: participar exige termos com versão aprovada
  ok: Fundador: nenhum benefício concedido por padrão
  ok: Fundador: benefício sem regra comercial aprovada é recusado pelo banco
  ok: Fundador: trilha de auditoria não pode ser apagada
  ok: Fundador: dono do restaurante A lê só a própria adesão (não vê a de B)
  ok: Fundador: dono do restaurante B não vê adesão nem termos de A
  ok: Fundador: só o servidor (service_role) muda estado
  ok: Fundador: equipe Tipe sem 2FA não lê adesões / com 2FA lê todas
node tests/e2e/fundador.e2e.mjs (Playwright, chromium, 1280 e 390 px) → 9/9 passos ok · Console sem erros
node tests/e2e/crm.e2e.mjs (regressão do CRM)                          → 22/22 passos ok
Página do selo (Playwright, 1280 e 390 px) → 56 imagens carregadas, sem rolagem horizontal, console sem erros
```

Os testes de pagamento existentes de `tests/db/payments.sql` continuaram passando na mesma execução (regressão do Tipe Pay no banco).

## Capturas (`docs/tipe-guest/capturas/fase-3/`)

`01-desktop-fundador-lista.png`, `02-desktop-filtro-participante.png`, `03-desktop-ficha-participante.png`, `04-desktop-confirmacao-nomeada.png`, `05-desktop-apos-transicao.png`, `06-desktop-card-conta.png`, `07-desktop-card-sem-adesao.png`, `08-mobile-fundador-lista.png`, `09-mobile-ficha.png`, `10-desktop-filtro-vazio.png`, `11-selo-desktop.png`, `12-selo-mobile.png`, `13-selo-proposta-a.png`, `13-selo-proposta-b.png`, `13-selo-proposta-c.png`.

## Situação

**Implementado e testado**
- Modelo, transições, auditoria, regras vazias e "nenhum benefício por padrão" no motor do CRM (vitest).
- Migração 0041 com RLS, escrita só por `service_role`, trilha imutável e gatilhos de transição e benefício (Postgres 16 local).
- Tela `/crm/fundador`, card na conta, confirmação nomeada, filtros, estados vazios, papéis (Playwright em 1280 e 390 px).
- Página interna do selo com as três propostas.

**Implementado sem validação**
- Adaptador `foundingPartnerFromRows()`: testado só com linhas montadas à mão; não há banco real com as tabelas.
- Legibilidade do selo a 24 px foi conferida só nas capturas da própria página (sem impressão nem teste em aparelho). Os SVGs usam a fonte Sora com alternativas do sistema; fora da página o texto pode cair na fonte do sistema.
- A regra "piloto só com conta ativa" existe no motor do CRM, não no banco (a 0041 não conhece o estado da conta do CRM).

**Pendente**
- Server functions com guard de founder + 2FA chamando `founding_partner_invite`/`founding_partner_set_status`, e troca do modo demonstração pelo Supabase.
- Funções de banco para termos, piloto, comunicações, feedback e benefícios (hoje inserção direta pelo `service_role`, protegida por gatilhos).
- FK `crm_account_id → crm_restaurant_accounts` quando a proposta do CRM for aplicada (instrução em `docs/crm/supabase-crm.sql`).
- Converter em curvas o texto do selo escolhido.

**Fora do escopo desta fase**
- Seção/página da landing para restaurantes e o CTA que grava lead (outra thread, branch da landing).
- Envio real de convites (e-mail/WhatsApp).
- Uso do selo no app ou no site.

## Decisões para o Roberto

1. **Escolher o selo**: A · Broto, B · Encontro ou C · Alicerce (`/interno/selo-fundador.html`).
2. **Regras comerciais**: quantidade de vagas (ou nenhuma), período de inscrição e vantagens, com o texto exato. Até lá ficam vazias e nenhum benefício pode ser concedido.
3. **Termos do programa**: texto e versão, com revisão jurídica.
4. **Aplicar a migração 0041** (depois de 0023–0040) no Supabase de destino.
5. **Merge** deste PR em `crm/backoffice-saas` (ou junto com o PR #29).
