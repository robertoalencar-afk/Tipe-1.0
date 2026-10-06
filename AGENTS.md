<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Persist identity per restaurant/table. Why: QR rereads resume without asking the name.
- Activity shows bill payments, not tips. Why: tips are separate.
- Pagamentos digitais concluídos são registrados como aprovados; somente pagamentos no estabelecimento aguardam confirmação manual.
- A identificação inicial solicita nome e sobrenome; os mascotes oficiais aparecem contextualizados nas telas de espera e agradecimento.
- Na conta, não oferecer cartão direto; destacar pagamento no estabelecimento com dinheiro ou maquininha. Mascotes aparecem apenas em momentos contextuais.
- O fluxo do cliente é sempre itens escolhidos → meio de pagamento → pagamento; pedidos não identificam a pessoa, mas pagamentos exibem cliente, itens, valor e horário.
- Ao reabrir o QR da mesma mesa, recuperar a identificação antes de renderizar a etapa; quando não houver itens disponíveis nem pagamentos pendentes, mostrar a mesa encerrada.

- Roles live in public.user_roles; payment confirmation only uses resolve_table_payment RPC.
- Table reopen archives payments to archived_payments instead of deleting — keeps full history.
- Restaurant area: /$restaurante; customer table: /$restaurante/$mesa with optional QR token.
- PDV items enter through protected RPCs or /api/public/pos/$slug; operational mutations use SECURITY DEFINER RPCs.
- Public simulator `/simulador` uses browser-local demo state and fixed Mesa 12 data; it must never read or mutate restaurant PDV data. Why: the sales demo must remain repeatable and isolated from restaurant operations.
- QR tokens only open tables; payment/reopen uses a rotating session_token.
- Server code using supabaseAdmin must authorize via src/lib/tipe/security.server.ts (verifyTableSession, enforceRate, logSecurityEvent). Why: admin client bypasses RLS.
- register_table_payment requires p_idempotency_key (unique per restaurant) and is service_role-only. Why: retries/double-clicks never duplicate payments.
- Shared item payments use decimal portions with row locking; integer quantity columns remain compatibility shadows. Why: diners can split one item safely without overselling it.
- Restaurant self-signup goes through the signup_restaurant SECURITY DEFINER RPC (CNPJ, address, no table cap in trial) and restaurant_subscriptions; new restaurants start with restaurants.onboarding_step = "pos", which gates the panel behind OnboardingPdv until finish_onboarding. Why: owners create their own restaurant and connect their PDV first.
- Legal docs are versioned in src/lib/tipe/legal.ts; acceptances go to legal_acceptances with server-chosen version, and optional scripts must check hasConsent() from src/lib/tipe/consent.ts. Why: provable acceptance and no tracker before consent.
- Payments go through Pagar.me v5 (src/lib/tipe/pagarme.server.ts): bill items reserved via register_table_payment before charging, settled only by provider_settle_payment (service_role) after re-fetching the order. Without a key everything runs in simulation. Why: money never moves on client-provided status.
- Waiter area lives at /_authenticated/garcom; waiters log in via owner invite (pdv_waiters.user_id), tips link to table_payment_requests.waiter_id, balances/withdrawals only via waiter_balance/waiter_request_withdrawal (service_role) with fortnightly cycles (1–15, 16–end); founder marks Pix paid. Why: waiters never compute or move their own balance.
- Lebre AI uses separate public and authenticated server functions; restaurant data is scoped by membership, and every mutation is an explicit typed proposal confirmed by the user and reauthorized at execution. Why: free text must never execute privileged database changes directly.
- In-person bill payments store cash versus card-terminal details, including server-validated cash received and change due. Why: staff need the correct change before confirming receipt.
- Restaurant bill payments charge the restaurant's own Pagar.me account (key AES-GCM encrypted in restaurant_pagarme_accounts, service_role only; per-restaurant webhook /api/public/pagarme/restaurante/$slug re-fetches the order). Why: TIPE never holds restaurant bank data or money.
- Founder access is limited to TIPE backoffice aggregates; private restaurant operations require an explicit restaurant-scoped role. Why: support cannot impersonate clients.
- Customer theme is CSS-scoped via the customer-theme marker and device preference, including portalled UI through body inheritance. Why: real and simulated bills share a flash-free palette without changing restaurant or landing themes.
- Use the reusable HareOutline icon for the public assistant empty state. Why: lightweight currentColor line art preserves TIPE identity without replacing the official mascot.
- Lebre audio is transcribed server-side into the editable composer (never auto-sent); attachments are images/PDF only, max 3 x 5 MB, validated on the server. Why: users review what was understood before anything runs.

- Isolate landing motion and preview tokens from operational state. Why: animations must not change bills.
