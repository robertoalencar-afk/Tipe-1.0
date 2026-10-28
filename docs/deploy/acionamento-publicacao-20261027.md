# Acionamento de publicação — 27/10/2026

Esta entrada documental aciona o workflow GitHub Actions `Publicar` na branch `main`.
A implantação só é permitida pelo próprio workflow quando a variável de repositório
`TIPE_PRODUCTION_READY=true` estiver ativa.

Release principal: PR #41, commit `fa89b10cb86f2016a81c49cdbed1d70a9bc05632`.
Validações anteriores: TypeScript, Vitest e build aprovados na branch `main`.
Supabase de produção: `bnggnbwmihqexvihrqvy`.

Importante: esta entrada não altera o código, não contém segredos, e não substitui
testes posteriores de autenticação, pagamentos, webhook, Worker, domínio e rollback.
