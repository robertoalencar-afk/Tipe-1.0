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

- Keep the Lovable-connected Git branch in a working state and never rewrite published history.

- Preserve customer identity locally per restaurant/table so repeat QR scans resume the account.
- Table activity shows bill payments only; extra tips stay outside restaurant bill history.
- Completed digital payments are approved; only in-person payments await manual confirmation.
- Initial identification asks first and last name; mascots appear contextually while waiting and thanking.
- Do not offer direct card entry on the bill; emphasize cash or card terminal at the venue.
- Customer flow is selected items → payment method → payment; payments show customer, items, amount and time.
- Restore identity before rendering a reopened QR; show table closed when nothing is available or pending.

- Roles live in public.user_roles; payment confirmation only uses resolve_table_payment RPC.
- Table reopen archives payments to archived_payments instead of deleting — keeps full history.
- Restaurant area: /$restaurante; customer table: /$restaurante/$mesa with optional QR token.
- PDV items enter through adapters in src/lib/tipe/pdv (registry.server.ts) that call pdv_ingest_event with idempotent external event ids; legacy /api/public/pos/$slug stays compatible and UI never shows third-party PDV names. Why: new PDVs plug in without touching the payment flow.
- Block failed PDV cancellation of paid items and show it in the restaurant panel/history.
- Waitlist leads are written only server-side (no anon access) and read/edited only by founders at /admin/leads. Why: lead data is private commercial information.
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
- Central Jurídica lives at /legal; book text is content data in src/content/legal (Markdown with metadata) parsed by src/lib/tipe/legal-content.ts, and LEGAL versions in legal.ts must match it; old legal URLs 301-redirect and archived versions render read-only. Why: one source of truth for index, search, SSR text and versioned acceptance.
- Founder checks go through src/lib/tipe/founder-guard.ts (role founder AND session aal2); founder pages wrap FounderMfaGate. Why: founder access requires TOTP 2FA.
- New waiter Pix keys are written to pending_* columns and activate only via promote_pending_pix (48h or owner approval); withdrawals are blocked while pending. Why: stops payout hijacking through a swapped key.
- Payout CPF/Pix/bank data are stored AES-GCM encrypted in *_enc columns; plaintext columns hold only masked values, and full reveals are logged. Why: sensitive data never sits readable in the database.
- Security alerts are sent from logSecurityEvent via sendSecurityAlert (security_alert_state throttles to one email per type every 15 min). Why: one place to raise and group alerts.
- The service fee rate comes only from restaurants.service_rate (0 to 20%) and is recomputed on the server; any fee choice sent by the browser is rejected. Why: the restaurant sets the fee, not the customer.
