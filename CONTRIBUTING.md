# Contribuindo com a Tipe

Convenção de commits, branches e pull requests. Vale para todo o time.

## Commits e títulos de PR

Formato [Conventional Commits](https://www.conventionalcommits.org/pt-br/), em português:

```
<tipo>(<escopo>): <resumo no imperativo ou nominal, minúsculo, sem ponto final>
```

- Até ~72 caracteres. Técnico e específico; sem emojis, sem gírias, sem "parte 2 de 5".
- O título do PR segue o mesmo formato (no squash merge ele vira o commit do `main`).
- Mudança incompatível: `feat(pay)!: ...` e um parágrafo `BREAKING CHANGE:` no corpo.

### Tipos

| Tipo | Uso |
|---|---|
| `feat` | funcionalidade nova para usuário |
| `fix` | correção de bug |
| `refactor` | mudança interna sem alterar comportamento |
| `perf` | desempenho |
| `docs` | documentação, textos e conteúdo |
| `test` | testes |
| `ci` | workflows e pipeline de deploy |
| `chore` | manutenção, dependências, releases, ferramentas |

### Escopos

Produto: `pay`, `order`, `cozinha`, `equipe`, `gestao`, `reserva`, `central`, `crm`, `lebre`, `cardapio`, `caixa`, `fiscal`.
Site: `landing`, `hero`, `simulador`, `demo`, `site`.
Plataforma: `auth`, `seguranca`, `db`, `deploy`, `email`, `infra`, `planos`, `nfc`, `analytics`, `legal`.

### Exemplos

```
feat(order): impressão de tickets de cozinha/bar e pré-conta
fix(auth): 2FA travando no limite de tentativas
chore(db): migração 0056 de chamados da mesa
```

## Branches

`<tipo>/<descricao-curta>`, ex.: `feat/order-impressao`, `fix/auth-2fa`. Nada experimental vai para `main` (deploy automático em produção).

## Pull requests

Use o template (`.github/pull_request_template.md`): **Contexto**, **Mudanças**, **Testes**, **Riscos e rollback**. Descreva o que muda e como foi verificado; liste migrações pelo número.
