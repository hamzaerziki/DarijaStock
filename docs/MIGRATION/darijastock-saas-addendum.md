# DarijaStock SaaS — Decisions Addendum (v2)

> Read together with `darijastock-saas-architecture.md`.
> **Where this file and the architecture file disagree, THIS FILE WINS.**
> Superseded parts of the architecture file: section 3 (URL + store login rows), 7.2 (store login), 12.1 (store UX), 13 (hosting/reliability, expanded here), 15 (roadmap), 16 (decisions).

---

## 0. Decisions locked

| # | Topic | Decision |
|---|-------|----------|
| 1 | Store login | **Phone number + one-time code (OTP) is the main login.** The personal link is only a shortcut. A lost link is no longer a problem. |
| 2 | One store, several dealers | **Allowed. Dealers must never be able to know.** Implementation: **no shared store identity across tenants in v1.** |
| 3 | URL style | **Subdomain per dealer:** `{slug}.darijastock.ma` (domain name is a placeholder). |
| 4 | Store approval | **Not required by default.** Per-dealer setting, discussed later. Dealer still confirms every order. |
| 5 | Hosting & backups | **We own it.** Operations plan in section 5. |
| 6 | Credit / balance | **Yes, in v1.** Ledger-based module in section 6. |

Still open: OTP channel and cost (SMS vs WhatsApp), your pricing model, hosting location, cheque rules, whether stores can see their balance (section 8).

---

## 1. Lost link problem → phone + OTP, PWA, dealer resend

Many store owners are not comfortable with technology, so the design assumes **they will lose every link**. Four layers, from easiest to last resort:

1. **Stay logged in.** After the first login, the session cookie lasts 180 days (sliding: each visit extends it). Most stores never log in again.
2. **Install on the home screen (PWA).** Each dealer subdomain serves a web app manifest with the dealer's own name and logo, so the store gets an icon "Alami Distribution" on its phone. The icon is the new "link". Show a friendly 3-step guide with pictures after the first successful order ("زيد الأيقونة فالشاشة ديالك").
3. **Forgot link? Just type your phone.** The root page `https://{slug}.darijastock.ma` always shows: *"ادخل رقم الهاتف ديالك"* → code by SMS/WhatsApp → logged in. This is stable and printable (on invoices, delivery notes, stickers, QR codes). No personal link needed.
4. **Dealer resend.** In the dealer dashboard each client has "إعادة إرسال الرابط" (one tap → WhatsApp). The dealer's sales rep can also create a one-time login for a store standing next to them.

The personal magic link stays as a shortcut: dealer sends it, the store taps it, and the first OTP is skipped.

### 1.1 OTP rules (security + cost)

- 6 digits, expires in 5 minutes, max 5 attempts per code, then the code is dead.
- Resend cooldown 60 s. Limits: 5 codes/hour/phone, 20/hour/IP, daily cap per tenant (cost control).
- Store only `sha256(code + salt)`, never the code. Table `otp_challenges(id, tenant_id, phone, code_hash, expires_at, attempts, consumed_at, channel, created_at)`.
- **Generic response always:** "إلا كان الرقم مسجل غادي توصلك رسالة". Never reveal whether a phone is registered.
- Only phones of **active customers of that tenant** receive a code. Unknown phone → (a) generic response, nothing sent, or (b) if the dealer enabled open registration, the new-store form (section 4).
- Delivery goes through an abstraction `MessageChannel` with two implementations (`sms`, `whatsapp`) so the provider can change without touching business code. Log every send (`message_log`) for cost tracking per tenant.
- Sensitive actions are not needed for stores (they only order and read their own data), so no step-up auth in v1.
- Dealer can **revoke all sessions** of a store (lost or stolen phone).

### 1.2 Session model
- Table `customer_sessions(id, tenant_id, customer_id, token_hash, user_agent, last_seen_at, expires_at, revoked_at)`.
- Cookie: `HttpOnly; Secure; SameSite=Lax; Path=/`, **host-only** (no `Domain=` attribute), so a session on `alami.` can never be sent to `bennani.`.

---

## 2. One store buying from several dealers, with dealer privacy

**Rule:** dealer A must never learn that a store also buys from dealer B.

**Design (simplest and safest):**
- `customers` rows are per tenant and independent. The same phone can exist in many tenants.
- **No global "store" table, no cross-tenant phone lookup, no shared session.** Each dealer subdomain is its own world. The store simply logs in separately on each dealer's site.
- OTP challenges are scoped by `(tenant_id, phone)`.

**Leak checklist (must be tested):**
- Never run a uniqueness check on phone across tenants (`UNIQUE (tenant_id, phone)` only).
- Error messages and response timing identical for "phone exists in another dealer" and "phone exists nowhere".
- Platform admin screens show **aggregates by tenant only**; looking at a specific customer requires impersonation, which is audited.
- Exports, logs, analytics and error reports never include phone numbers from several tenants together.
- Terms of service state clearly that dealers' customer data is separated and that DarijaStock acts as a processor of each dealer's data.

**Future option (not v1):** an optional "store app" where the store explicitly consents to link its dealers. Design it later; v1 stays isolated.

---

## 3. Subdomain routing (replaces the `/d/{slug}` URLs)

| Host | Purpose |
|------|---------|
| `{slug}.darijastock.ma` | Store ordering site (root) and dealer dashboard (`/app`) for that dealer |
| `admin.darijastock.ma` | Platform admin |
| `www.darijastock.ma` | Marketing / sign-up |
| `api.darijastock.ma` *(optional)* | API, or keep `/api/v1` on each host |

Implementation:
- **DNS:** wildcard `*.darijastock.ma` → load balancer. **TLS:** wildcard certificate (Let's Encrypt DNS-01 or your DNS provider's wildcard cert), auto-renewed and monitored.
- **Nginx:** `server_name ~^(?<tenant>[a-z0-9-]+)\.darijastock\.ma$;` and pass `Host` and `X-Tenant-Slug` to the API.
- **Tenant resolution (API):** read the slug from the `Host` header (trust it only from the proxy), look up `slug → tenant_id` in Redis (TTL 60 s), 404 for unknown or `cancelled` tenants, "unavailable" page for `suspended`.
- **Reserved slugs:** `www, app, api, admin, platform, static, cdn, mail, support, status, docs`. Slug rules: `^[a-z0-9-]{3,40}$`, cannot start or end with `-`, unique, **immutable after creation** (changing it breaks printed QR codes and installed icons; allow only via platform admin with redirects).
- **Staff auth consistency:** the JWT `tid` **must equal** the tenant resolved from the host. Mismatch → 403 and an audit entry. A token for dealer A is useless on dealer B's host.
- **Cookies:** host-only (see 1.2). CORS: allow only the exact host.
- **Local dev:** `*.localhost` (e.g. `alami.localhost:5173`), Vite proxy configured accordingly.
- **Branding:** `GET /public/tenant` on that host returns name, logo, `brand_color`, manifest data. The frontend applies them as CSS variables.
- **Custom domains** (`commande.alami.ma`) later: `tenant_domains` table + on-demand TLS. Not v1.

---

## 4. Store approval policy

Orders already pass through the dealer's confirmation step (`draft/new → confirmed`), so **a second approval of the store itself is mostly redundant.** Therefore:

- Per-tenant setting `store_signup_policy`:
  - `closed` **(default)** — only stores the dealer created or imported can log in.
  - `open_auto` — a new phone can register itself (name + phone + OTP) and is active immediately.
  - `open_review` — registers as `pending`; the dealer approves before the first order is accepted.
- New self-registered stores get a **"جديد" badge** on their orders and in the client list, so the dealer notices them. The dealer can block any store at any time (`customers.status = blocked` → login and ordering refused with a neutral message).
- Spam protection for open policies: OTP is mandatory, plus per-IP and per-tenant daily caps.
- We will decide later which policy to recommend to dealers. The code supports all three from the start.

---

## 5. Hosting & backups — our operations plan

You operate the platform, so reliability is part of the product.

**Environments:** production, staging (same setup, anonymised or fake data), local dev. Nobody tests on production.

**Database backups (non-negotiable):**
- Continuous WAL archiving + a daily base backup (pgBackRest or WAL-G, or the managed provider's point-in-time recovery).
- Stored **encrypted** and **off the server**, ideally with a different provider or region.
- Retention: 14 daily + 12 monthly (adjust to legal needs).
- **Restore test every month** on staging, with a written result. A backup never restored is not a backup.
- Targets (write them in the dealer terms): **RPO ≤ 15 minutes, RTO ≤ 4 hours.**
- Also back up object storage (images, PDFs) and Redis is treated as disposable.

**Infrastructure:**
- 2 API instances + 1 worker + PostgreSQL + Redis + reverse proxy, with health checks and rolling deploys.
- Start on one well-sized server or small managed setup (about 4 vCPU / 8 GB handles this load); separate DB onto its own machine/service as soon as the budget allows.
- Firewall: DB and Redis not exposed publicly. SSH keys only. Automatic security updates + monthly patch window.
- Secrets in a secret store or protected environment files, never in git. Rotate on staff change.

**Monitoring and incidents:**
- Uptime check on `{any-slug}.domain` and `/health`; alerts to your phone.
- Metrics: latency p95, error rate, DB connections, disk space (alert at 70%), queue length, certificate expiry (alert at 21 days), backup success.
- Error tracking (Sentry or equivalent), structured logs with `tenant_id` and `request_id`.
- A one-page **runbook**: "DB down", "disk full", "restore from backup", "certificate expired", "suspected data leak". Practice the restore and the leak scenario once.
- Simple public status page.

**Legal / commercial:** terms of service with SLA and RPO/RTO, a data-processing agreement with each dealer (they own their customer data), privacy policy, and a Morocco data-protection check (Law 09-08 / CNDP) and hosting-location decision with a lawyer before launch.

---

## 6. Credit & balance module (v1)

Wholesalers sell on credit, so the product must answer: **"How much does this store owe me, since when, and did they pay?"**

### 6.1 Concepts
- **Ledger** (`customer_ledger`): append-only list of money events per customer. Balance = sum of entries. **Never edit or delete; correct with a reversal entry.**
- **Debit** (customer owes more) is created when an **invoice is issued**, not when an order is placed.
- **Payment** reduces the balance (cash, cheque, transfer, other).
- **Credit limit** and **payment terms** (days) per customer, with tenant defaults.

### 6.2 Tables (all tenant-level, RLS, composite FKs)

```sql
ALTER TABLE customers
  ADD COLUMN credit_limit NUMERIC(12,2),            -- NULL = no limit
  ADD COLUMN payment_terms_days INT,                -- NULL = use tenant default
  ADD COLUMN balance NUMERIC(12,2) NOT NULL DEFAULT 0;  -- cached, updated in the same transaction as the ledger

ALTER TABLE invoices
  ADD COLUMN due_date DATE,
  ADD COLUMN paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0;
  -- payment_status derived: unpaid | partial | paid ; overdue = unpaid/partial AND due_date < today

CREATE TABLE customer_ledger (
  id            BIGSERIAL PRIMARY KEY,
  tenant_id     BIGINT NOT NULL REFERENCES tenants(id),
  customer_id   BIGINT NOT NULL,
  entry_type    TEXT NOT NULL CHECK (entry_type IN
                ('opening_balance','invoice','payment','credit_note','adjustment','reversal')),
  amount        NUMERIC(12,2) NOT NULL,   -- >0 customer owes more, <0 customer paid
  balance_after NUMERIC(12,2) NOT NULL,
  ref_type      TEXT, ref_id BIGINT,      -- invoice / payment / ...
  note          TEXT,
  created_by    BIGINT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (tenant_id, customer_id) REFERENCES customers (tenant_id, id)
);
CREATE INDEX ix_ledger_cust ON customer_ledger (tenant_id, customer_id, created_at DESC);
-- Append-only: REVOKE UPDATE, DELETE ON customer_ledger FROM darijastock_app; plus a trigger that raises on UPDATE/DELETE.

CREATE TABLE payments (
  id            BIGSERIAL PRIMARY KEY,
  tenant_id     BIGINT NOT NULL REFERENCES tenants(id),
  customer_id   BIGINT NOT NULL,
  amount        NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  method        TEXT NOT NULL CHECK (method IN ('cash','cheque','transfer','effet','other')),
  reference     TEXT,                      -- cheque number, transfer ref
  due_date      DATE,                      -- post-dated cheque / effet
  status        TEXT NOT NULL DEFAULT 'received'
                CHECK (status IN ('received','deposited','cleared','bounced','voided')),
  received_by   BIGINT,
  received_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  note          TEXT, void_reason TEXT,
  idempotency_key TEXT,
  UNIQUE (tenant_id, id), UNIQUE (tenant_id, idempotency_key),
  FOREIGN KEY (tenant_id, customer_id) REFERENCES customers (tenant_id, id)
);

CREATE TABLE payment_allocations (        -- which invoices a payment settles
  tenant_id BIGINT NOT NULL, payment_id BIGINT NOT NULL, invoice_id BIGINT NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  PRIMARY KEY (tenant_id, payment_id, invoice_id)
);
```

`tenant_settings` additions: `default_payment_terms_days`, `credit_policy ('off'|'warn'|'block')`, `cheque_counts_when ('received'|'cleared')`, `show_balance_to_store (bool)`.

### 6.3 Posting rules (one service: `LedgerService`)
1. Every posting runs in one transaction: `SELECT … FROM customers WHERE id = :id FOR UPDATE` (serialises postings per customer), read `balance`, insert the ledger row with `balance_after`, update `customers.balance`.
2. **Issue invoice** → ledger `invoice` (+total), set `due_date = issue_date + terms`.
3. **Record payment** → ledger `payment` (−amount) and allocations. Default allocation = oldest unpaid invoices first (FIFO); user can override. Over-payment stays as a negative balance (customer credit).
4. **Cheques:** per `cheque_counts_when`. With `cleared`, the payment is stored as `received`/`deposited` without touching the balance, and the ledger entry is posted when it becomes `cleared`. A `bounced` cheque posts a `reversal` (+amount) and flags the customer.
5. **Void a payment** or **cancel an invoice** → reversal entry, never deletion; requires permission and a reason.
6. **Opening balance** on import: a single `opening_balance` entry per customer so existing debts can be migrated from the dealer's notebook/Excel.
7. All money uses the integer-cents helper on the frontend and `NUMERIC` on the backend. Daily job verifies `customers.balance == SUM(ledger)` for every customer and alerts on mismatch.
8. Recording a payment requires an `Idempotency-Key` (no double entries on a double tap).

### 6.4 Credit limit checks
- Exposure = `customers.balance` + total of confirmed-but-not-yet-invoiced orders.
- On **confirm** (staff action): if `exposure + order.total > credit_limit` → by policy: `warn` (show banner, continue), `block` (needs `override_credit_limit` permission and a reason, audited).
- **The store is never blocked or shamed at submit time.** The order enters the dealer's queue with an **"فوق الحد"** flag and the dealer decides.
- Blocked customers (`status = blocked`) cannot log in.

### 6.5 Screens
- **Customer detail page** (replaces the dead "تفاصيل" button): header (name, phone, balance, limit, terms), tabs **Orders · Invoices · Payments · Statement**. Buttons: "تسجيل دفعة", "تعديل الحد", "إرسال الرابط".
- **Record payment dialog:** amount, method, reference, cheque date, note, allocation preview.
- **Statement (كشف الحساب):** ledger with running balance, date filter, **PDF export** (AR + FR labels) and "share on WhatsApp".
- **Receivables dashboard:** total outstanding, overdue amount, aging buckets (0–30, 31–60, 61–90, 90+ days), top 10 debtors, today's collections.
- **Cheques list:** upcoming due dates, status changes (deposited / cleared / bounced).
- **Orders & invoices lists:** payment status badge (unpaid / partial / paid / overdue) with text, not colour only.
- **Store side (if `show_balance_to_store`):** "الحساب ديالي": current balance, unpaid invoices, payments history. Read-only.
- **Invoices must become real pages:** invoice detail (currently "عرض" is not wired) + printable PDF with company legal info (ICE, RC, IF, address), because invoices now drive the ledger.

### 6.6 Permissions (added to the existing list)
`view_balances`, `record_payments`, `void_payments`, `manage_credit_limits`, `override_credit_limit`, `view_receivables_reports`.
New role: **`collector` (محصّل)**: record payments + view balances only. `admin` has all.

### 6.7 API (staff)
`GET /customers/{id}/account` · `GET /customers/{id}/ledger` · `POST /customers/{id}/payments` · `POST /payments/{id}/void` · `PATCH /payments/{id}/status` · `GET /reports/receivables` · `GET /customers/{id}/statement.pdf` · `PATCH /customers/{id}/credit` (limit, terms).

### 6.8 Tests (mandatory)
- Concurrent payments and invoices on the same customer → final balance correct (no lost update).
- Reversal restores the previous balance; ledger rows cannot be updated or deleted by the app role.
- FIFO allocation, partial payment, over-payment.
- Cheque `cleared` vs `received` policies; bounced cheque.
- Credit-limit warn / block / override with audit.
- Cross-tenant isolation on every new endpoint.
- `balance == SUM(ledger)` checker.

---

## 7. Updated roadmap

| Phase | Scope |
|-------|-------|
| 0 | Audit + confirm section 8 decisions (no code) |
| 1 | Tenancy core (as in the architecture file) |
| 2 | RLS + isolation test suite in CI |
| 3 | Catalog, units, price lists, groups, Excel/CSV import (products, clients, **opening balances**) |
| 4 | Subdomain routing, wildcard TLS, tenant branding, **phone + OTP login, sessions, PWA, personal link shortcut**, reorder, favorites, "my orders", idempotency |
| 5 | Dealer experience: today screen, new-order notifications, signup policy settings, onboarding wizard, link resend |
| 6 | **Invoices as real pages + PDF, ledger, payments, cheques, credit limits, receivables, statements, customer detail page** |
| 7 | Platform admin, plans/limits, impersonation with audit |
| 8 | Operations: backups + restore drill, monitoring, runbook, rate limits, load test, security review, legal docs |
| 9 | Pilot with 2–3 dealers, then roll out |

Phase 6 can run in parallel with phase 5 once phases 1–3 are done, but it must finish before the pilot because dealers will judge the product on credit tracking.

---

## 8. Still to decide (the next questions)

1. **OTP channel:** SMS (reliable, cost per message) or WhatsApp (familiar, needs Business API and templates)? Who pays: included in the plan with a monthly cap, or billed to the dealer?
2. **Pricing model for dealers:** flat monthly, or tiers by number of clients/orders?
3. **Hosting location and provider** (affects latency, price and legal review).
4. **Cheque rule default:** count a cheque when received, or only when cleared? (Recommended default: when cleared, because it is safer for the dealer.)
5. **Should stores see their balance** by default? (Recommended default: off; the dealer turns it on.)
6. **Store sign-up policy default** for new dealers: `closed` (recommended), `open_auto`, or `open_review`?
7. **Invoice legal fields and numbering rules** Moroccan dealers need (ICE, RC, IF, TVA rates, sequential numbering): confirm the exact list with one real dealer before Phase 6.

---

## 9. Execution notes for OpenCode

- Execute **one phase per task**. Start each task with: inspect → short audit → implement → test → report.
- Phase 4 prompt must include: subdomain tenant resolution from `Host`, JWT `tid` == host tenant check, host-only cookies, OTP rules from 1.1, PWA manifest per tenant, and the leak checklist from section 2.
- Phase 6 prompt must include: sections 6.1–6.8 verbatim, the invoice-detail page requirement, and "never edit or delete ledger rows".
- Every phase ends with: type check, lint, tests (including isolation tests), build, and a list of decisions that need the owner.
