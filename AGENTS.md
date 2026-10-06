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

- Preserve a identificação do cliente localmente por restaurante e mesa, para que novas leituras do mesmo QR retomem a conta sem perguntar o nome novamente.
- A atividade da mesa mostra somente pagamentos da conta; gorjetas extras ficam fora desse histórico por não integrarem a conta do restaurante.
- Pagamentos digitais concluídos são registrados como aprovados; somente pagamentos no estabelecimento aguardam confirmação manual.
- A identificação inicial solicita nome e sobrenome; os mascotes oficiais aparecem contextualizados nas telas de espera e agradecimento.
- Na conta, não oferecer cartão direto; destacar pagamento no estabelecimento com dinheiro ou maquininha. Mascotes aparecem apenas em momentos contextuais.
- O fluxo do cliente é sempre itens escolhidos → meio de pagamento → pagamento; pedidos não identificam a pessoa, mas pagamentos exibem cliente, itens, valor e horário.
- Ao reabrir o QR da mesma mesa, recuperar a identificação antes de renderizar a etapa; quando não houver itens disponíveis nem pagamentos pendentes, mostrar a mesa encerrada.

- Staff access: roles in public.user_roles (founder/owner/cashier/waiter, per restaurant); payment confirmation only via resolve_table_payment RPC — prevents privilege escalation.
- Table reopen archives payments to archived_payments instead of deleting — keeps full history.
- Restaurant area lives at /$restaurante (client-only, login required); customer table at /$restaurante/$mesa (code like mesa12, optional ?t= QR token). Why: each restaurant has its own address and table tokens.
- Bill items come from the PDV TIPE (pdv_launch_order RPC) or from an external PDV via /api/public/pos/$slug (x-tipe-key, SHA-256 hash in pos_integrations); both write table_bill_items. Why: restaurants can use our PDV or keep any market PDV.
- Restaurant area sections live in RestaurantPanel (shell/salão/PDV/cardápio) and AdminSections (início, cozinha, caixa, relatórios, integrações, config); cash/KDS/void/transfer changes only via SECURITY DEFINER RPCs. Why: role checks stay in the database.
- Public simulator `/simulador` uses browser-local demo state and fixed Mesa 12 data; it must never read or mutate restaurant PDV data. Why: the sales demo must remain repeatable and isolated from restaurant operations.
- Customer table access: QR token (?t=) only opens the table; payments/reopen require restaurant_tables.session_token, rotated by archive_and_reopen_table. Why: an old session never authorizes a new bill.
- Server code using supabaseAdmin must authorize via src/lib/tipe/security.server.ts (verifyTableSession, enforceRate, logSecurityEvent). Why: admin client bypasses RLS.
- register_table_payment requires p_idempotency_key (unique per restaurant) and is service_role-only. Why: retries/double-clicks never duplicate payments.
- Shared item payments use decimal portions with row locking; integer quantity columns remain compatibility shadows. Why: diners can split one item safely without overselling it.
- Restaurant self-signup goes through the signup_restaurant SECURITY DEFINER RPC (CNPJ, address, no table cap in trial) and restaurant_subscriptions; new restaurants start with restaurants.onboarding_step = "pos", which gates the panel behind OnboardingPdv until finish_onboarding. Why: owners create their own restaurant and connect their PDV first.
- Legal docs are versioned in src/lib/tipe/legal.ts; acceptances go to legal_acceptances with server-chosen version, and optional scripts must check hasConsent() from src/lib/tipe/consent.ts. Why: provable acceptance and no tracker before consent.
- Payments go through Pagar.me v5 (src/lib/tipe/pagarme.server.ts): bill items reserved via register_table_payment before charging, settled only by provider_settle_payment (service_role) after re-fetching the order; restaurant payouts use Pagar.me recipients stored in restaurant_payout_accounts (no client grants). Without PAGARME_SECRET_KEY everything runs in simulation. Why: money never moves on client-provided status.
- Waiter area lives at /_authenticated/garcom; waiters log in via owner invite (pdv_waiters.user_id), tips link to table_payment_requests.waiter_id, balances/withdrawals only via waiter_balance/waiter_request_withdrawal (service_role) with fortnightly cycles (1–15, 16–end); founder marks Pix paid. Why: waiters never compute or move their own balance.
- Lebre AI uses separate public and authenticated server functions; restaurant data is scoped by membership, and every mutation is an explicit typed proposal confirmed by the user and reauthorized at execution. Why: free text must never execute privileged database changes directly.
