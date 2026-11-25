- Hosting: Cloudflare Workers (worker "tipe", custom domain tipe.digital), deployed by .github/workflows/deploy.yml on every push to main; scheduled jobs live in cron-worker/. Database/auth: Supabase. No Lovable: do not reintroduce @lovable.dev packages, /__l5e asset URLs or LOVABLE_* env vars. Why: the project left Lovable on 2026-10-27. Setup steps in docs/deploy/README.md.
- Database changes: new SQL files in drizzle/migrations (next number), applied by scripts/db/aplicar-migracoes.sh (tracked in tipe_meta.migracoes). Never edit an applied migration.
- AI: Lebre and split suggestion call src/lib/tipe/ai.server.ts askAI, which tries Cloudflare Workers AI through the Worker's `AI` binding (wrangler.jsonc, read via globalThis.__env__; REST with CLOUDFLARE_AI_TOKEN only as fallback; free daily quota, capped by CLOUDFLARE_AI_DAILY_LIMIT via ai_provider_consume), then Groq (GROQ_API_KEY, free tier), then Claude only when LEBRE_CLAUDE_FALLBACK=true; audio uses Workers AI Whisper under the same cap. FAQ, clear panel commands and quick salon queries are answered without AI in src/lib/tipe/lebre-regras.ts before the daily Lebre quota is consumed. Why: Lebre must not cost tokens (decision 2026-10-27); on Workers Paid, Workers AI beyond the free 10k neurons/day is billed, so the cap matters.

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
- Restaurant self-signup goes through the signup_restaurant SECURITY DEFINER RPC (CNPJ, address; creates the subscription before tables so the plan limit applies) and restaurant_subscriptions; new restaurants start with restaurants.onboarding_step = "pos", which gates the panel behind OnboardingPdv until finish_onboarding. Why: owners create their own restaurant and connect their PDV first.
- Waiter area lives at /_authenticated/garcom; waiters log in via owner invite (pdv_waiters.user_id), tips link to table_payment_requests.waiter_id, balances/withdrawals only via waiter_balance/waiter_request_withdrawal (service_role) with fortnightly cycles (1–15, 16–end); founder marks Pix paid. Why: waiters never compute or move their own balance.
- Founder access is limited to TIPE backoffice aggregates; private restaurant operations require an explicit restaurant-scoped role. Why: support cannot impersonate clients.
- Central Jurídica lives at /legal; book text is content data in src/content/legal (Markdown with metadata) parsed by src/lib/tipe/legal-content.ts, and LEGAL versions in legal.ts must match it; old legal URLs 301-redirect and archived versions render read-only. Why: one source of truth for index, search, SSR text and versioned acceptance.
- Table limits per plan are enforced only in the database: trigger enforce_table_limit on restaurant_tables silently skips (returns NULL) inserts/reactivations over restaurant_table_limit(), logging to table_limit_blocks and security_events, under a row lock on restaurants; table_is_over_limit() blocks new bills on excess tables after downgrade. Plan catalog lives in plan_catalog (founder-only). Why: every path (panel, API, PDV, Lebre) obeys one rule and logs survive the block.
- Lebre daily caps live in lebre_limits/lebre_usage and are consumed atomically via lebre_consume (service_role only) before any model call. Why: hard cost ceiling per restaurant and for the public site.
- Service fee removal is per open bill: service_fee_waivers keyed by the table session_token, written only by waive_service_fee (owner/cashier, reason required); payments read it server-side. Why: waiver ends automatically when the table reopens and the browser can never change the fee.

- Commits, branches and PR titles follow CONTRIBUTING.md: Conventional Commits in PT-BR (`feat(order): ...`), concise technical PR bodies using .github/pull_request_template.md (Contexto, Mudanças, Testes, Riscos e rollback). Why: history reads as a professional team's (decision 2026-11-16).
- Every phone screen in images, simulators, videos and posts shows a realistic iPhone status bar (time, signal, Wi-Fi, battery level): use src/components/tipe/BarraStatusIOS.tsx in any phone frame. Why: Roberto rule 2026-11-25, screens must look like a real phone (docs/design-system.md).
