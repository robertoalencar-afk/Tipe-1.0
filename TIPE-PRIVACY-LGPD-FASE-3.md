# TIPE — Fase 3: Privacy, LGPD & Legal Compliance

## 1. Resumo
Inventário real feito antes de qualquer texto. O TIPE usa apenas armazenamento estritamente necessário; não há analytics, pixels ou session replay. Por isso **não** foi criado banner de cookies; há Política de Cookies e "Preferências de privacidade" permanente no rodapé, com bloqueio prévio pronto (`hasConsent()`).

## 2. Inventário de dados
| Titular | Dado | Origem | Finalidade | Local | Compartilhamento | Obrig. | Base legal (aparente) |
|---|---|---|---|---|---|---|---|
| A. Consumidor | Nome e sobrenome | Digitado na mesa | Identificar quem pagou | localStorage; `table_payment_requests.customer_name`, `archived_payments` | Restaurante | Sim p/ pagar | Execução de contrato |
| A | Itens, valor, meio, status, horário | App | Conta/pagamento | `table_payment_requests`, `table_bill_items`, `archived_payments`, `payment_audit_log` | Restaurante | Sim | Contrato / obrigação legal |
| A | Texto da divisão por IA | Digitado | Sugerir divisão | Não armazenado; enviado ao AI Gateway | Provedor de IA | Opcional | Contrato (a pedido) |
| A/todos | IP | Requisição | Rate limit, segurança | `rate_limit_buckets` (chave), `security_events.detail` | — | Sim | Legítimo interesse |
| B. Garçom (PDV) | Código, nome | Restaurante | Operação | `pdv_waiters` | Restaurante | Sim | Contrato (restaurante controlador) |
| B/C. Equipe | Nome, e-mail, cargo, ações | Cadastro/convite | Acesso e auditoria | `auth.users`, `staff_members`, `user_roles`, logs | — | Sim | Contrato / legítimo interesse |
| C. Restaurante | Responsável, e-mail, senha (hash), CNPJ, endereço, telefone, plano | `/cadastro` | Conta e assinatura | `auth.users`, `restaurants`, `restaurant_subscriptions` | Infra; pagamento (futuro) | Sim | Contrato / obrigação legal |
| C | Aceite legal | `/cadastro` | Prova de aceite | `legal_acceptances` (novo) | — | Sim | Exercício regular de direitos |
| Leads | Restaurante, nome, e-mail, WhatsApp, msg | Landing | Contato comercial | `restaurant_leads` | — | Opcional | Procedimentos preliminares |
| Todos | Pedido LGPD | `/privacidade/solicitacao` | Atender direitos | `privacy_requests` (novo, leitura só fundador) | — | — | Obrigação legal |
| D. Admin TIPE | E-mail, cargo founder | Auth | Administração | `user_roles` | — | Sim | Contrato |

Retenção existente: nenhuma rotina de expiração; mesas reabertas arquivam pagamentos. Exclusão/anonimização: manual, ainda sem rotina.

## 3–5. Cookie/Storage audit
| Nome | Provedor | Finalidade | Tipo | Duração | Categoria | Consentimento? |
|---|---|---|---|---|---|---|
| `sb-*-auth-token` | Auth da nuvem | Sessão do painel | localStorage | Até logout/expiração | Necessário | Não |
| Nome da mesa (`customerStorageKey`) | TIPE | Retomar conta | localStorage | Até reabrir/limpar | Necessário | Não |
| `tipe:cadastro-pendente` | TIPE | Concluir cadastro pós-e-mail | localStorage | Até concluir | Necessário | Não |
| Estado do simulador | TIPE | Demo | localStorage | Reset 2 min | Necessário | Não |
| `tipe:privacy-consent` | TIPE | Preferências | localStorage | Até alterar | Necessário | Não |
| Login Google | Google | OAuth (opt-in do usuário) | Cookies Google | Google | Necessário | Não |
| Google Fonts | Google | Fontes (recebe IP, sem cookie) | Requisição externa | — | Necessário* | Não* |

*REQUIRES LEGAL REVIEW: avaliar auto-hospedar as fontes para eliminar envio de IP ao Google.
Sem sessionStorage/IndexedDB próprios. Sem analytics/marketing.

## 6–11. Consentimento
- Banner: NOT APPLICABLE (só necessários). Preferências acessíveis no rodapé e em `/cookies`: Aceitar todos / Rejeitar não essenciais / Salvar, com igual destaque.
- Registro: localStorage com `consent_version`, `policy_version`, `timestamp`, categorias; sem fingerprint. Revogação = mesma tela. Futuro script deve checar `hasConsent()` e ouvir o evento `tipe:consent`.
- DNT/GPC: documentado para o futuro.

## Documentos criados (versão 1.0 salvo indicado, vigência 05/10/2026)
- `/privacidade` (nova), `/cookies` (nova), `/termos` (v2.0, consumidor; privacidade separada; erros/estornos; CDC), `/termos-parceiros` (nova), `/privacidade/solicitacao` (nova). Versões em `src/lib/tipe/legal.ts`.

## 13. Papéis LGPD
- Restaurante controlador / TIPE operador: conta da mesa, pedidos, pagamentos, garçons do PDV.
- TIPE controlador: cadastro/assinatura do restaurante, segurança, logs, leads, pedidos LGPD, aceites.

## 14–15. Direitos
`/privacidade/solicitacao` registra o pedido (rate limit 3/h por IP, auditado), não exibe dados, não pede documento; verificação por e-mail a ser feita manualmente. Sem botão de exclusão imediata.

## 16. Retenção — [RETENTION PERIOD REQUIRES LEGAL VALIDATION]
Contas, pagamentos, registros financeiros, logs de segurança, usuários, restaurantes, garçons, sessões QR, consentimentos, solicitações LGPD, leads: todos pendentes.

## 21–24. Aceite
`/cadastro` exige checkbox não pré-marcado (Termos para Parceiros + Privacidade) e grava em `legal_acceptances` (user_id, document, version definida no servidor, accepted_at). Nova versão em `legal.ts` permite exigir novo aceite (comparação ainda não aplicada no painel — REQUIRES BUSINESS DECISION). Marketing: não existe; nenhum opt-in criado.
Mesa: o checkbox existente de responsabilidade no pagamento presencial foi mantido; não há conta de consumidor.

## 26. Google Auth
Login gerenciado com escopos padrão (openid, e-mail, perfil). Nenhum escopo extra.

## Subprocessadores
| Serviço | Finalidade | Dados | Local |
|---|---|---|---|
| Infra em nuvem (banco/auth/hosting) | Plataforma | Todos | Possivelmente fora do Brasil — verificar |
| Edge hosting | Servir o app | IP, requisições | Global |
| Google (OAuth, Fonts) | Login opcional, fontes | E-mail/perfil; IP | EUA/global |
| AI Gateway (modelo de IA) | Sugestão de divisão | Texto digitado | Fora do Brasil |
| Provedor de pagamento | [PAYMENT PROVIDER PENDING] | — | — |
| Provedor de e-mail de autenticação | E-mails de confirmação/senha | E-mail | Verificar |

## Testes
- T1/T2/T3/T5 (bloqueio de scripts): NOT APPLICABLE — não há scripts opcionais; arquitetura `hasConsent` padrão = false.
- T4 preferências alteráveis: PASS (UI).
- T6 QR sem conta: PASS (fluxo não alterado).
- T7 mobile: PARTIAL (layout responsivo, não testado em aparelho físico).
- T8 cadastro registra versão: PARTIAL (código pronto; cadastro completo não executado).
- T9 nova versão: PARTIAL.
- T10 dados em URL: PASS (nenhum nome/e-mail/CPF em URLs; `?t=` é token de mesa).

## Regressão de segurança
Nenhuma policy, RPC, grant, rate limit ou header existente foi alterado. Novas tabelas com RLS: aceites só do próprio usuário; pedidos LGPD só leitura por founder, inserção via servidor.

## Arquivos
`src/lib/tipe/legal.ts`, `consent.ts`, `legal.functions.ts`, `src/components/tipe/LegalPage.tsx`, `PrivacyPreferences.tsx`, rotas `privacidade.index.tsx`, `privacidade.solicitacao.tsx`, `cookies.tsx`, `termos-parceiros.tsx`, `termos.tsx`, `index.tsx` (rodapé/contato), `cadastro.tsx`. Migration `0003_lgpd_phase3.sql`.

## Configuração manual / informação pendente (MISSING INFORMATION)
Razão social, CNPJ, endereço do TIPE, encarregado (DPO) e e-mail de privacidade dedicado, foro, provedor de pagamento, taxas/repasses/gorjeta, reajuste/inadimplência, SLA/suporte, exportação e retenção pós-encerramento, prazos de retenção. Painel interno para tratar `privacy_requests` ainda não existe.

## REQUIRES LEGAL REVIEW
Bases legais por finalidade; papéis controlador/operador; transferência internacional e salvaguardas; cláusulas de responsabilidade dos termos; Google Fonts; documento específico para garçons (REQUIRES BUSINESS/LEGAL DEFINITION, sobretudo se houver dados bancários para gorjetas).

## Riscos remanescentes
- HIGH: ausência de prazos e rotina de retenção/anonimização.
- MEDIUM: pedidos LGPD sem fluxo operacional de verificação/resposta; dados empresariais pendentes nos documentos.
- MEDIUM: transferência internacional não formalizada.
- LOW: IP enviado ao Google Fonts; ausência de re-aceite automático.

## Checklist
Privacy Policy: REQUIRES LEGAL REVIEW · Cookie Policy: PASS · Consumer Terms: REQUIRES LEGAL REVIEW · Partner Terms: REQUIRES LEGAL REVIEW · Cookie Inventory: PASS · Consent: NOT APPLICABLE (preparado) · Consent Revocation: PASS · Data Minimization: PASS · Rights Requests: PARTIAL · Retention: FAIL (pendente) · Subprocessors: PARTIAL · International Transfers: REQUIRES LEGAL REVIEW · Versioning: PASS · Acceptance Evidence: PASS · Mobile UX: PARTIAL · Accessibility: PARTIAL · Security Regression: PASS.

O TIPE não está declarado 100% em conformidade; a conformidade depende de processos e revisão jurídica humana.

FASE 3 CONCLUÍDA — PRIVACY & COMPLIANCE IMPLEMENTADOS, SUJEITOS ÀS PENDÊNCIAS EXPRESSAMENTE IDENTIFICADAS NO RELATÓRIO.
