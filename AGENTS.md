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
- Block failed PDV cancellation of paid items and show it in the restaurant panel/history.
- Waitlist leads are written only server-side (no anon access) and read/edited only by founders at /admin/leads. Why: lead data is private commercial information.
- Public simulator `/simulador` uses browser-local demo state and fixed Mesa 12 data; it must never read or mutate restaurant PDV data. Why: the sales demo must remain repeatable and isolated from restaurant operations.
- QR tokens only open tables; payment/reopen uses a rotating session_token.
- Restaurant self-signup goes through the signup_restaurant SECURITY DEFINER RPC (CNPJ, address, no table cap in trial) and restaurant_subscriptions; new restaurants start with restaurants.onboarding_step = "pos", which gates the panel behind OnboardingPdv until finish_onboarding. Why: owners create their own restaurant and connect their PDV first.
- Waiter area lives at /_authenticated/garcom; waiters log in via owner invite (pdv_waiters.user_id), tips link to table_payment_requests.waiter_id, balances/withdrawals only via waiter_balance/waiter_request_withdrawal (service_role) with fortnightly cycles (1–15, 16–end); founder marks Pix paid. Why: waiters never compute or move their own balance.
- Founder access is limited to TIPE backoffice aggregates; private restaurant operations require an explicit restaurant-scoped role. Why: support cannot impersonate clients.
- Central Jurídica lives at /legal; book text is content data in src/content/legal (Markdown with metadata) parsed by src/lib/tipe/legal-content.ts, and LEGAL versions in legal.ts must match it; old legal URLs 301-redirect and archived versions render read-only. Why: one source of truth for index, search, SSR text and versioned acceptance.
