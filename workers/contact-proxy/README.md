# contact-proxy

Cloudflare Worker that receives form submissions from every brand site, validates them, and forwards the lead via Emailit. One worker → all brands → one operator inbox.

```
[brand site form] ─POST→ [contact-proxy worker] ─→ [Emailit API] ─→ [Cloudflare Email Routing on gomks.com] ─→ [operator Gmail]
                                  │
                                  └─ validates required fields,
                                     resolves brand routing from brands.json,
                                     sends email or returns dry-run result
```

## Endpoint

`https://contact-proxy.anthony-abc.workers.dev` (POST `multipart/form-data`)

## Brand model

All brand routing lives in [`brands.json`](./brands.json). The worker (`src/index.ts`) and the smoke test (`scripts/smoke.mjs`) both import this file — single source of truth, no drift.

Each brand has:
- `from` — the From header on outbound mail. **Must use a domain verified on Emailit** or the send fails with `422 Domain not verified`.
- `to` — the recipient address (where leads land).
- `origin` — the brand's public URL (logged in the email footer for routing context).
- `notify?` — optional list of additional recipients for every submission for this brand.

## Required form fields

The worker rejects with `400` if any of these are missing/empty:

- `name` — submitter's name
- `email` — used as `Reply-To` so you can reply directly
- `message` — the lead body (checkout forms compose this from plan + custom fields in JS before submit)
- `terms` — confirmation the submitter accepted T&Cs (any non-empty value works)

Plus the brand discriminator:

- `brand` — must match a key in `brands.json`. Unknown brand → falls back to `gomks`.

Optional metadata fields:

- `_subject` — overrides the default subject line
- `_gotcha` — honeypot. If non-empty, worker silently returns `200` without sending (anti-bot)
- `_dry_run` — set to `'1'` to validate routing without calling Emailit (smoke test default)
- `form_source` — free-text tag for distinguishing form types (e.g., `pricing-checkout`, `smoke-test`)

## Brand routing convention (parent-child)

`gomks.com` is the parent — it's the only domain currently verified on Emailit (DKIM/SPF set up). Child brands (`landscape.systems`, future re-brands) don't have their own Emailit verification:

- **From:** `'<Brand Name> via GoMKS <hello@gomks.com>'` — uses parent's verified domain so DKIM signs cleanly
- **To:** `'leads@gomks.com'` — centralized inbox; Cloudflare Email Routing on gomks.com forwards to operator's Gmail

This means **adding a new child brand requires zero DNS/email setup** — just an entry in `brands.json` and a worker redeploy. No per-brand mailbox, no per-brand DKIM. See [memory/emailit_domain_verification.md](../../memory/emailit_domain_verification.md) for the full reasoning.

If a child brand later wants its own-domain branding (`from: hello@theirdomain.com`), the operator must add Emailit's DKIM/SPF records to that brand's DNS and verify in Emailit's dashboard. Until then, keep the via-GoMKS pattern.

## Adding a new brand

1. Edit [`brands.json`](./brands.json), add an entry. Use the via-GoMKS convention by default:
   ```json
   "new-brand-id": {
     "from": "New Brand via GoMKS <hello@gomks.com>",
     "to": "leads@gomks.com",
     "origin": "https://newbrand.com"
   }
   ```
2. `npm run deploy`
3. (Optional) `npm run smoke -- --brand=new-brand-id` to verify

That's it. The smoke test picks it up automatically. No mailbox setup, no DNS records.

## Smoke test

End-to-end health check that posts a synthetic submission to the worker for each brand and asserts `200 ok:true`. Two modes:

```bash
npm run smoke              # dry-run (default) — 0 Emailit calls, fast
npm run smoke -- --real    # real-send — actually sends test emails (uses Emailit quota)
```

**Dry-run mode** sends `_dry_run=1`, the worker validates the full path (CORS, brand resolution, required fields, recipient computation) but skips the Emailit call. Returns the resolved routing in the response so smoke can assert it matches expectations. Use this for high-cadence health checks — costs nothing.

**Real mode** actually sends emails, tagged `[SMOKE]` in the subject. Use weekly or after Emailit/DNS changes to prove end-to-end delivery. Each receiving inbox should have a Gmail filter to auto-archive `subject:[SMOKE]`.

Other flags:
- `--brand=<id>` — test one brand
- `--concurrency=<n>` — parallelism (default 10). At 500 brands, increase to ~50 for sub-second wall time.
- `ENDPOINT=...` — override worker URL (e.g., `http://localhost:8787` against `wrangler dev`)

Exit code: `0` = all passed, `1` = any failed, `2` = bad arguments.

### What smoke catches

| Failure | Caught by dry-run | Caught by --real |
|---|---|---|
| Worker code regression / deploy broke something | ✅ | ✅ |
| Brand misconfig (typo in `from`, missing `to`) | ✅ | ✅ |
| Required field validation drift | ✅ | ✅ |
| Fallback brand resolution | ✅ | ✅ |
| Emailit `Domain not verified` (422) | ❌ | ✅ |
| Emailit DKIM key rotation breaking signing | ❌ | ✅ |
| Emailit upstream errors (502 from worker) | ❌ | ✅ |
| Cloudflare Email Routing rules dropping forward | ❌ | ❌ (would need CF Email Routing API check — Tier 2) |
| Final inbox spam-bucketing | ❌ | ❌ (would need Gmail API check — Tier 2) |

Cadence rule of thumb: dry-run every 6h via cron, real-send manually after any DNS/Emailit/worker change.

## Scheduled monitoring (Cloudflare Cron Triggers)

The worker has two cron triggers configured in [`wrangler.toml`](./wrangler.toml):

| Schedule (UTC) | Cron | Mode | Purpose |
|---|---|---|---|
| Every 6h (00, 06, 12, 18) | `0 */6 * * *` | dry-run | Catches worker / brand-config / validation breakage cheaply (no Emailit calls). |
| Mondays 13:00 (≈ 9 AM EDT / 6 AM PDT) | `0 13 * * 1` | real-send | Proves end-to-end Emailit + DKIM + delivery still works. ~N emails/week (1 per brand). |

The `scheduled()` handler in [`src/index.ts`](./src/index.ts) iterates through every brand in `brands.json`, posts a synthetic submission via `handleRequest` (same code path as a real form post), and collects results. On any failure it:

1. Logs `[cron-smoke <cadence>] FAILURES: ...` to `wrangler tail` (always).
2. Sends an `[ALERT]` email via Emailit to `leads@gomks.com` with the failed brands, error details, and recovery commands (best effort — won't deliver if Emailit itself is the broken thing).

**Set up a Gmail filter for `subject:[ALERT]`** — never send to spam, mark important, optionally pipe to a phone notification. Silence = healthy.

### Manual cron test

Trigger the scheduled handler locally without waiting for the cron:

```bash
npx wrangler dev --test-scheduled
# then in another terminal:
curl "http://localhost:8787/__scheduled?cron=0+*/6+*+*+*"   # dry-run path
curl "http://localhost:8787/__scheduled?cron=0+13+*+*+1"    # real-send path
```

### View scheduled invocations

`wrangler tail` shows scheduled events alongside fetch events. Filter by the `[cron-smoke ...]` log prefix.

## Operations

### Deploy

```bash
npm run deploy
```

Requires `wrangler login` once (cached at `~/.wrangler/`). No `CLOUDFLARE_API_TOKEN` needed for OAuth-based deploys.

### Tail live logs

```bash
npm run tail
# or filter:
npx wrangler tail --format pretty
```

The worker logs `console.log('emailit ok ...', body)` on every successful Emailit send (truncated to 500 chars), and `console.error('emailit error ...')` on failure with the full Emailit response body. Use this to debug "form submitted but no email arrived" reports.

### Local dev

```bash
npm run dev
```

Spins up `wrangler dev` on `http://localhost:8787`. Test via:

```bash
ENDPOINT=http://localhost:8787 npm run smoke
```

## Troubleshooting playbook

### "Couldn't send. Upstream email delivery failed." (form shows this to the user)

Worker returned `502`. Emailit rejected the send. Common causes:

1. **`Domain not verified`** — the `from` domain isn't verified on Emailit. Check Emailit's dashboard. Workaround: change the brand's `from` to use a verified domain like `gomks.com`.
2. **`From == To`** — Emailit rejects sends where the from-address equals any to-address (loop protection). Check `brands.json` for collisions.
3. **Rate limit / quota** — Emailit has plan-based monthly limits. Check the dashboard for usage.

`npm run tail` will show the exact Emailit response body in the worker logs.

### Form submission succeeds (200) but no email arrives

The worker accepted, Emailit accepted, but the email didn't reach the operator's inbox. Investigate in this order:

1. **Cloudflare Email Routing Activity Log** for the destination domain (e.g., gomks.com). Confirms whether the recipient address has a forwarding rule and what status the forward got.
2. **Spam folder** of the final destination Gmail. Cross-domain forwarded mail is a frequent spam-bucket victim.
3. **DKIM status in Cloudflare's Activity Log entry**. If `neutral` or `fail`, Emailit's signing isn't working — compare the public key in Emailit's dashboard against the published TXT record at `<selector>._domainkey.<domain>`.

### "Domain not verified" but Emailit dashboard says verified

The DKIM TXT record was never actually published, OR Emailit rotated keys and the published record is stale. Check with:

```powershell
Resolve-DnsName -Name "emailit._domainkey.gomks.com" -Type TXT
```

Compare the `p=` value to what Emailit's dashboard currently shows for that domain.

## File layout

```
workers/contact-proxy/
├── README.md                 ← this file
├── brands.json               ← source of truth for brand routing
├── package.json              ← scripts: dev / deploy / tail / smoke
├── tsconfig.json
├── wrangler.toml             ← worker config (account, name, main entry)
├── src/
│   └── index.ts              ← worker handler (fetch + validation + Emailit)
└── scripts/
    └── smoke.mjs             ← end-to-end smoke test (dry-run + real modes)
```

## Secrets

- `EMAILIT_API_KEY` — set via `npx wrangler secret put EMAILIT_API_KEY`. Never committed to the repo.
