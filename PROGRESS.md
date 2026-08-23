# Nexora Web — Build Progress

Running log of completed batches (0 → 12), per `PROMPT.md`.

---

## ⚠ STANDING RULE — icons

`components.json` has `iconLibrary: "lucide"` (shadcn CLI default), but **`lucide-react` must NEVER
be imported anywhere in this codebase.** When shadcn components are added in Batch 2, every default
icon they ship with must be **rewired to Flowbite** (`flowbite-react-icons/outline` · `/solid`).
Grep for `lucide` before every batch gate — it must return zero hits in `src/`.

---

## Revision Batch A ✅ COMPLETE — Agreements, Financial Overview, Notifications

PM-feedback foundation batch. Commits: agreement data model → admin agreements module →
owner agreement page → remove wallet → financial overview → rewire commissions → notification
triggers.

- **A1 Data model.** `ManagementAgreement` (fixed_fee / revenue_sharing / hybrid) — the single
  source of truth for all commission/settlement math. Seeded for all 6 owners (Salim:
  revenue_sharing 15% monthly, active) + one expired historical. Helpers
  `getAgreementForOwner` / `isSettlementReady`; agreements API with commission math.
- **A2 Admin module** (`/admin/agreements`): list (filters/sort/states) + detail with a
  financial summary CALCULATED from real payments (Salim: 137.7M revenue → 20.7M @15% → 117M
  net) + event timeline; create/edit (conditional fields, active-agreement warning),
  terminate, delete — all via live engine. Nav after Owners for all admin roles.
- **A3 Owner** (`/owner/agreement`): read-only agreement card (no edit/terminate/delete) +
  no-agreement empty state. Nav after Financials.
- **A4a Wallet removed** entirely — route, nav, store slice, withdraw/send + bank CRUD,
  WalletTx/BankAccount/TxType/TxStatus, accessors; `Wallet` icon → `Landmark`.
  `grep -ri wallet src/` → ZERO; `/admin/wallet` → 404.
- **A4b Financial Overview** (`/admin/financial-overview`, wallet's slot): 4 KPI tiles
  (total revenue / settlements / pending / Nexora earnings), rent-vs-service chart,
  transaction history (filters + detail), Owner Settlements tab (agreement-driven; Process
  Settlement preview shows Salim 137.7M → 20.7M → 117M, Process disabled → Batch D). Records
  only — no proprietary wallet.
- **A5 Commission rewired** — every hardcoded 0.08 / FEE_RATE replaced with the owner's
  agreement: `admin.ts` getOwnerDetail (disbursements) + getOwnerFinancials (all fee calcs +
  agreementLabel), `builders.ts` statement PDF (agreement ref + explicit commission calc),
  owner-portal financials ("Revenue Sharing — 15%"). No hardcoded rates remain.
- **A6 Notifications** — booking create fires **3** (admin + owner + guest, verified bell
  +3); check-in/out/cancel → admin + owner (+ guest on cancel); service create → admin +
  client; assign → admin + staff; complete → admin + client. Single-audience mock, so all
  land in the active bell with audience-specific titles.

Gate: `next build` clean, lint + tsc clean.

---

## Revision Batch B ✅ COMPLETE — Onboarding, Password Gate, Property Wizard, Owner Lockdown, Staff

PM-feedback batch 2. Six commits: B1 onboarding → B2 password gate → B3 property wizard →
B4 owner restriction → B5 staff expansion. **85 pages build clean; lint + tsc clean.**

- **B1 Owner + Tenant onboarding.** "Convert to Owner/Tenant" lead dialogs
  (`convert-lead-dialog.tsx`) with personal / bank / agreement / account sections + an
  auto-generated temp password (regenerate). On submit: creates the Owner/Tenant record + a
  User account (`requiresPasswordChange: true`) + optional management agreement + bank on
  profile, marks the lead **Converted** (`convertedTo` link on detail), and fires TWO
  notifications (admin activation w/ credentials + simulated welcome email) + toast + audit.
  Verified: owner conversion bell +3 (incl. agreement), tenant +2.
- **B2 Forced password change.** `/change-password` (auth brand layout) — strength meter,
  zod (min 8 · uppercase · number · match · new≠current). Reached from 2FA when the account
  requires it, and guarded by the AppShell (any onboarded user is bounced here until done);
  clears the flag on success. Seed `newowner@test.com` / `TempPass-1234`.
- **B3 7-step property wizard** (`property-wizard.tsx`, replaces the old single-form dialog):
  Basic → Rental config → Structure (building repeater) → Pricing → Amenities (chips) →
  Media (images/videos/floor plans) → Documents + review. Step indicator, back/next with
  per-step validation, short/long-term conditional branches, annual = monthly ×12 auto-calc,
  units derived from buildings. Create + edit both via the live engine; old dialog deleted.
  Verified end-to-end (2 buildings → 8 units, edit pre-fill).
- **B4 Owner portal restriction.** Owner portal is read-only outside self-service: only the
  profile and notification-preferences pages mutate. Disbursement/bank changes now require a
  confirmation dialog before saving (money-sensitive; non-bank edits save directly). New
  `getOwnerSnapshot()` powers dashboard additions — occupied/vacant unit split, next pending
  vs paid settlement, and a merged rent-in / disbursement-out transaction feed (reconciles
  with `getOwnerDetail` + Financials).
- **B5 Staff module expansion.** Staff model gains phone / department / availability /
  `assignedJobs`. List: search + department/availability/status filters, Jobs column, and an
  availability chip that cycles (available → busy → off). New `/admin/staff/[id]` detail with
  Profile / Assignments / Performance tabs (assignments derive from tickets + service
  bookings by name; performance = totals, completion rate, monthly avg). Invite captures
  department + phone; deactivation warns when jobs are on record. Cross-module assignment
  (maintenance technician + service booking) pulls the live active-staff list and increments
  the assignee's job counter — verified Grace 2 → 3 after a maintenance assign.

Gate: `npm run build` clean (85 pages), lint + tsc clean. **STOP for review before Revision Batch C.**

---

## Revision Batch C ✅ COMPLETE — Lease Enhancements, Deposit Settlement, Move-Out, Tenant Actions

PM-feedback batch 3. Six commits: C1 lease statuses → C2 deposit statuses + termination →
C3 move-out wizard → C4 settlement PDF → C5 tenant lease page → C6 notification triggers.
**Build clean (exit 0), lint + tsc clean throughout.**

- **C1 Enhanced lease statuses + auto-computation.** New statuses `expiring_soon`,
  `renewal_requested`, `pending_renewal` (+ deposit statuses, see C2). `lib/lease.ts`
  `leaseView()` derives the DISPLAY status from the end date — Active → **Expiring Soon**
  within 30 days, **Expired** once past — without mutating the stored status, plus an
  urgency flag (≤14 days) that adds a pulsing dot via `LeaseStatusBadge`. Admin table:
  computed badge, Expiring-Soon filter + amber left-border row highlight, alert card listing
  "{tenant} — {unit} — expires in {X} days". Dashboard `getAlerts` shows the same countdown.
  Manage dialog: countdown + recommended-action banner (Initiate Renewal / Send Reminder).
  Seed guarantees 2 leases in-window: **Mubarak Aliyu A-407 @21d**, **Julius Namuli C-202
  @11d (urgent/pulsing)**. Verified live: badges, filter (2 rows), highlight, urgency dot,
  banner, reminder toast.
- **C2 Deposit status expansion + termination dialog.** Deposit lifecycle `held` /
  `refunded` / `partially_refunded` / `deducted` / `forfeited` with amounts + reasons on the
  lease. Termination dialog: 4-option deposit outcome (Fully Refund / Partially Refund /
  Deduct / Forfeit) with conditional fields (refund/deduction split + reason; full-deduct +
  optional additional-owed; forfeiture reason). On submit: deposit settled, a Finance expense
  booked for deductions (category `admin`, "Deposit Deduction — {reason}"), tenant + owner
  notified, full audit. Deposit outcome text shown on admin lease detail + tenant page.
  Verified live: partial-refund termination toast + conditional fields.
- **C3 Move-out & deposit settlement module.** `/admin/leases/[id]/move-out` 5-step wizard
  (Initiate → Inspection → Financial Assessment → Approve → Complete). Inspection = 8
  categories (condition / notes / repair cost / photo stub) with auto-summed damage; financial
  step computes deposit − damages − outstanding rent = refund / amount owed (colour-coded);
  Approve runs `settleMoveOut` through the live engine (lease terminated, unit vacated, deposit
  settled, per-category expenses booked, unpaid invoices cleared, tenant/owner/inspector
  notifications, toast, audit); Complete shows a success state + generates the settlement PDF.
  `initiateMoveOut` (step 1) notifies tenant + inspector and bumps the inspector's job count.
  Verified live through Step 2 (8 categories, initiate toast, inspector list from staff).
- **C4 Deposit settlement statement PDF.** New branded PDF type — header/logo, parties, lease
  summary, per-category inspection table, financial calculation (deposit − damages − rent =
  net), deposit outcome, signature block, branded footer.
- **C5 Tenant lease page.** Expiry countdown + lease-progress bar (amber <30d, red expired);
  Request Renewal dialog → `renewal_requested` + admin/tenant notifications, button becomes
  disabled "Renewal Requested — Pending Review"; dedicated Security Deposit status card with
  per-outcome copy; four hover-lift quick actions (payments, maintenance, WhatsApp, lease PDF).
- **C6 Notification triggers.** `pushNotify` helper (multi-party, single-audience mock). Wired:
  lease created → tenant + owner; renewal reminder → tenant; renewal requested → admin + tenant
  confirm; renewed → tenant + owner; terminated → tenant + owner (with deposit outcome);
  move-out initiated → tenant + inspector; move-out processed → tenant + owner + inspector.

Gate: `npm run build` clean, lint + tsc clean. **STOP for review before Revision Batch D.**

---

## Revision Batch D ✅ COMPLETE — Settlement Workflow, Owner Financials, Notifications, Zero Stubs

Final PM-feedback batch. Eight commits: D1 settlement workflow → settlement PDF → D2 owner
financials → D3 notifications → D4 CSV exports → integration modals → stub elimination →
D6 cleanup. **Lint + tsc clean throughout.**

- **D1 Owner settlement workflow.** Replaced the Batch-A placeholder with a 4-step flow
  (Select Period → Calculate → Review & Approve → Complete) on `/admin/financial-overview`.
  `computeOwnerSettlement` derives gross rent, agreement-driven management fee, expenses and
  deposit deductions for a date range; `processSettlement` writes a `SettlementRecord` ledger
  entry through the live engine (audit + owner/admin notifications, KPI + status updates,
  transaction-history row). Bank-detail validation gates processing. Confirmation screen
  generates the Settlement Statement PDF. Canonical net = gross − commission − expenses,
  reconciled across admin overview, admin agreements detail and owner portal.
- **D1b Settlement Statement PDF.** Branded doc: itemized rent, deductions (fee with math +
  itemized expenses), net payout, masked payout details + reference, processed status.
- **D2 Owner financials restructure.** `/owner/financials` → 5 sections: Revenue (3 tiles +
  revenue-by-property & revenue-over-time charts), Deductions (agreement-referenced fee +
  expenses + taxes placeholder), Net Payout (amount + settled/pending status + last/next
  dates), Settlement History (per-period statement PDFs), Reports (statement PDFs + occupancy/
  revenue CSVs). Date-range filter drives all sections. **Reconciliation verified live:**
  Salim gross **137.7M** → fee (15%) **20,651,250** → expenses **9,350,000** → net **107.7M**,
  identical on the admin settlement row and the owner portal; agreement rate pulled from the
  agreement, not hardcoded.
- **D3 Notification coverage.** Audited every action; existing coverage ~64 dispatch points.
  Added 11 triggers: rent-due (tenant), payment-confirmed (tenant) + revenue-generated (owner),
  maintenance submitted (tenant) + raised (owner), maintenance update (tenant), maintenance
  resolved (tenant + owner), urgent-ticket titling, move-out initiated (admin), staff
  availability-changed + account-deactivated (staff).
- **D4 CSV exports + integrations + zero stubs.** New `generateCSV` utility + `ExportCsvButton`
  wired to 14 lists. Settings → Integrations rebuilt with 6 per-service configuration modals
  (Flutterwave, Stripe, Resend, Africa's Talking, Cloudinary, AWS S3) → integrations store +
  toast + audit, "Connected" badge reflects state. Every "mocked in this build" toast replaced
  with real behavior (property Edit → wizard, Add unit/Assign tenant → links, Message → mailto,
  uploads → real file picker + audit, Renew lease → live engine).
- **D6 Cleanup.** grep verification: wallet **0**, groupe/m-zi **0**, lucide **0**, stub/
  placeholder/coming-soon/TODO/FIXME **0** actionable. `__styleguide` is a `_`-private route
  (not routed). README updated (modules, PDFs, CSV exports, demo logins incl. newowner).

Gate: stop dev server → ONE real `npm run build` (clean) → restart. **ALL revision batches
(A + B + C + D) complete — product reflects all PM discovery-workshop feedback.**

---

## Execution Batch E1 — Audit & Regression Repair (PM Feedback R2)

Audit-first batch. No new features; every change surgical.

### Phase 1 — Architecture audit

**Stores (Zustand):** `live` (revision counter — the re-fetch signal), `notifications`
(audience-scoped feed + bell), `audit` (trail), `session` (auth), `ui`, `theme`,
`integrations`. **Live engine:** `recordMutation()` (lib/api/actions.ts) → `useLive.bump()`
+ `useAudit.add()` + `useNotifications.pushSystem()`. `useAsync` subscribes to
`live.revision` and re-fetches on every bump. **Mock DB:** `lib/mock/db.ts` — exported
module-level arrays (owners, properties, units, tenants, leases, invoices, payments,
expenses, tickets, leads, staff, users, bookings, serviceBookings, agreements,
settlements, …) seeded deterministically (mulberry32, fixed `NOW`).

**All 7 submission flows traced — origin → storage → consumption → destination:**

| # | Flow | Handler | Writes to | recordMutation | Notification | Admin view |
|---|---|---|---|---|---|---|
| 1 | Contact Us | `contact-form.tsx` → `submitLead()` | `db.leads` (unshift) | ✅ | ✅ entity=lead | `/admin/leads` |
| 2 | Request a Quote | `quote-form.tsx` + `quote-scheduler.tsx` → `submitLead()` | `db.leads` | ✅ | ✅ | `/admin/leads` |
| 3 | Property Assessment | `assessment-form.tsx` → `submitLead()` | `db.leads` | ✅ | ✅ | `/admin/leads` |
| 4 | Investor Consultation | `investor-form.tsx` → `submitLead()` | `db.leads` | ✅ | ✅ | `/admin/leads` |
| 5 | Short-term booking | `rental-booking-flow.tsx` → `createBooking()` | `db.bookings` | ✅ | ✅ | `/admin/bookings` |
| 6 | Long-term inquiry | `rental-booking-flow.tsx` → `createBooking()`/inquiry | `db.bookings` + `db.leads` | ✅ | ✅ | `/admin/bookings` + CRM |
| 7 | Service bookings | `service-booking-wizard.tsx` → `createServiceBooking()` | `db.serviceBookings` | ✅ | ✅ | `/admin/service-bookings` |

**Finding: every flow was already correctly wired.** The handler fires, the mutation
writes, `recordMutation` runs, the notification dispatches with an entity reference, and
the admin view reads the same array. Nothing in the chain was disconnected.

### Phase 2 — Root cause

**ROOT CAUSE (R1 + R2, single shared cause): mock-DB volatility across hard navigation.**
The mock DB is module-level in-memory state with **no persistence layer**. Marketing lives
in the `(marketing)` route group and the dashboard in `(app)`; crossing that boundary — and
every login redirect — triggers a **full document load**, which re-instantiates
`db.ts` and re-runs the seed. The lead/booking genuinely *was* created; it was destroyed
before the admin could read it. Identical cause for the missing notifications and audit
entries (both stores were session-only, never persisted).

This is why it "worked before": within a single SPA session the write is visible. The PM
tests it the real way — submit on the marketing site, then open the dashboard — which is
exactly the path that wipes it.

**R3 (booking data completeness):** not a regression — the booking record lacked the
financial fields the PM wants (price breakdown, payment method/status/reference).

**R4 (lease "expires in 21 days"):** self-inflicted in Revision C — the seed deliberately
forced Mubarak's lease (the tenant demo account) to 21 days to demo "Expiring Soon". The
computation in `leaseView()` is correct; the seed was wrong.

**R5 (found during audit):** notifications carried `entityType`/`entityId` but the
notification centre only marked them read — clicking never navigated anywhere.

### Phase 3/4 — Repairs

- **Persistence layer** (`lib/mock/persistence.ts` + `<MockDataHydrator />`): localStorage
  hydrate/persist for the mock DB, runtime notifications and the audit trail. Versioned
  payload (`SCHEMA_VERSION`) so changed seeds re-seed instead of serving stale snapshots;
  debounced writes; client-only hydration in an effect (no SSR mismatch); arrays mutated
  **in place** so every existing reference stays valid. Zero API-surface/store-shape/
  component changes — a pure mock-layer shim, deleted when the real backend lands.
- **Reset Demo Data** control (Settings → Super Admin only) to clear and re-seed.
- **Lead reference IDs** (`NX-LD-XXXXXX`) + type-aware notification titles
  ("New quote request — {name} requested {service}").
- **Notification click-to-navigate**: `notificationHref()` derives a route from
  `entityType`/`entityId` per audience; clicking marks read **and** opens the record.
- **Booking data completeness**: Booking/ServiceBooking extended with `customerId`,
  `paymentStatus`, `paymentReference`, `paidAt` (+ `amount`, `paymentMethod` on services).
  Admin detail views now answer *who booked what, when, how much, how they paid, status*.
- **Lease seed correction**: `createTenancy` caps elapsed time at `term − 120` days so
  ordinary tenancies keep ≥4 months; Mubarak restored to ~8 months (ends 10 Mar 2027);
  the two near-expiry demos moved to ordinary tenants (Julius Namuli C-202 @11d for the
  urgency pulse, Peace Namuli A-104 @25d for the Expiring Soon badge).
- **Rental-inquiry reference**: the `NX-INQ-XXXXXX` shown to the customer is now stored on
  the lead (previously only returned to the page, so the CRM showed a different ref).

### Verification (in-browser, real UI, hard navigation each time)

| Flow | Reference created | Reached admin | Notification |
|---|---|---|---|
| Contact Us | `NX-LD-719305` | ✅ top of /admin/leads | ✅ click → `/admin/leads/lead_web_…`, bell 5→4 |
| Request a Quote (scheduler) | `NX-LD-279842` | ✅ /admin/leads | ✅ "New quote request — E1 Quote Test requested Property Management" |
| Cleaning service booking | `NX-SV-586255` | ✅ /admin/service-bookings | ✅ admin + client |
| Short-term stay booking | `NX-BK-782455` | ✅ /admin/bookings | ✅ admin + owner + guest (3) |

Stay-booking detail verified showing the full record: type, guest, contact, property+unit,
2 adults · 1 child, 26→29 Aug, 3 nights, created date, special requests, itemised price
(UGX 100K × 3 = 300K · cleaning 80K · taxes 68K · **total 448K**), and Payment (Paid ·
mobile money · `NX-TXN-798649` · paid 23 Aug). Convert-to-Owner (Revision B) still opens
with all 13 fields + temp password. Leases: "2 leases expiring within 30 days", both the
intended demo tenants.

**Known follow-up (belongs to E2, not E1):** the service-booking "Assign staff" dropdown
still uses hardcoded names rather than the central staff directory.

**Gate:** lint + `tsc --noEmit` clean throughout · `npm run build` clean (exit 0, **85
static pages**, 72 app routes).

## 🏁 PROJECT COMPLETE — final summary

Nexora Property Management frontend is **complete** (mock-data). Single Next.js 15 app;
**80 routes** building clean; lint + tsc clean; zero horizontal overflow at 375/768/1024/1280;
`prefers-reduced-motion` honoured; SEO-ready (sitemap, robots, OG images, JSON-LD, canonicals);
WCAG-minded (skip links, landmarks, labels, focus rings, six-token palette w/ dark mode).

- **Marketing** (16 public routes): home, about, 6 services (+detail), portfolio (+detail),
  projects, investors, blog (+post), careers, contact, request-a-quote, rentals (+detail),
  cleaning & lifestyle booking.
- **Admin** (17 modules), **Owner** (7), **Tenant** (6) portals — all on the live-state
  mock engine (recordMutation → toast + notification + audit).
- 5 demo logins (pwd 123456, 2FA 123456): admin@ / manager@ / finance@nexora.co.ug,
  salim@ (owner), mubarak@gmail.com (tenant).

## Batch 12 — Motion Polish, Responsive QA, Performance, A11y, SEO ✅ COMPLETE (FINAL)

- **Motion:** global `MotionConfig reducedMotion="user"` + shared ease; marketing 300–600ms,
  app 150–250ms; `motion-safe:` variants + per-component `useReducedMotion` guards (hero halts
  autoplay under reduced motion). Verified consistent.
- **Responsive:** swept 375/768/1024/1280 across marketing + app; fixed home mobile overflow
  (transform-scaled hero) via `overflow-x-hidden` on the marketing frame; tables scroll
  internally; **zero page overflow** everywhere.
- **Performance:** all imagery via `next/image` (0 raw `<img>`); recharts isolated to chart
  pages (not marketing home); fonts via `<link>` `display=swap`; per-page first-load JS reasonable.
- **Accessibility:** skip-to-content links (marketing + app) → `#main-content`; semantic
  `<header>/<nav>/<main>/<footer>`; labelled inputs (Field); visible 2px primary focus rings;
  six-token AA palette in light + dark; `aria-current`/`aria-label`/`aria-pressed` in place.
- **SEO:** `lib/seo.ts` `pageMeta()` helper; `metadataBase`; unique title + description +
  canonical + OG + Twitter card on every marketing page; **8 branded OG images** (1200×630) in
  `public/images/og/`; `sitemap.ts` (all public routes) + `robots.ts` (app disallowed);
  JSON-LD (RealEstateAgent on home, Residence on portfolio detail); app group `noindex`.
- **Cleanup:** `/__styleguide` 404s in production; lint clean (0 unused); README + PROGRESS
  finalised; standing rules hold (0 lucide, six-token palette, Cinzel/Montserrat, no `#000`).

## Batch 11 — Tenant Portal ✅ COMPLETE

Commits: `tenant-dashboard` → `tenant-lease` → `tenant-payments` → `tenant-maintenance` →
`tenant-documents-bookings`. The most-used portal — mobile-first, effortless rent, requests,
booking history. Logged in as **mubarak@gmail.com** (long-term tenant, Nakasero A-407).

- **Dashboard** (`/tenant`): KPIs (rent / outstanding / next due / open requests), "next
  payment due" banner, quick actions, lease summary (rental-type badge), recent payments
  (receipt PDF), open requests, tenant notices.
- **My Lease** (`/tenant/lease`): property hero, renewal banner, terms / dates / unit /
  tenant cards, download branded lease PDF.
- **Rent & Payments** (`/tenant/payments`): balance + history + receipts; **Pay Rent flow**
  (method → gateway "processing" placeholder → confirmation w/ reference + receipt) wired to
  `payInvoice` (settles invoice, records payment via live engine).
- **Maintenance & Requests** (`/tenant/maintenance`): tabbed Maintenance | Complaints;
  submit form (category/priority/photo-placeholder) → `createTicket`; ticket list + status
  timeline dialog.
- **My Bookings** (`/tenant/bookings`): short-term stay history (upcoming/past) — the
  revision's short-term tenant view; Mubarak seeded with 2 stays.
- **Documents** (`/tenant/documents`): lease + receipts + invoices, filterable, downloadable.
- Shared **/notifications** + **/settings** already served the tenant role from Batch 8.

Data: `payInvoice` mutation; Mubarak guaranteed one outstanding invoice + 2 short-term
bookings; `listBookingsForEmail`. Nav gains "My Bookings". Verified end-to-end: pay-rent and
ticket submission fire the live engine (bell + toast + audit); no horizontal overflow at
375px (fixed grid tracks); dark-mode-aware. Gate: `next build` clean, lint + tsc clean.

## ✅ ALL THREE REVISION PASSES COMPLETE (pre-Batch-11)

Branding swap · services 9→6 · M-Zi removal · rental types · public browsing · booking &
inquiry flows · service booking wizards · admin Bookings + Service Bookings modules · owner
rental transparency. **Final gate: `next build` clean (75 pages, exit 0), lint + tsc clean.**
Next: Pass 4 (Custom Branded PDFs) → Batch 11 (Tenant Portal, now incl. booking history).

## Revision Pass 3 ✅ — Dashboard Updates + Integration (pre-Batch-11)

Commits: `admin-bookings-module` → `owner-portal-updates` → `data-consistency`.

- **3A Admin modules.** `/admin/bookings` — combined table of short-term stay bookings +
  long-term rental inquiries (inquiries sourced from `rental-inquiry` CRM leads); filters
  (type/status/property/date-range/search); row → detail dialog with price breakdown /
  inquiry details + CRM lead link; status actions (Confirm/Check-In/Check-Out/Cancel and
  inquiry stages Contacted/Quoted/Convert/Lost) + Add Booking, all via the live engine.
  `/admin/service-bookings` — table + service-type/status/date filters; detail dialog with
  assign-staff + status change (New/Assigned/In-Progress/Completed/Cancelled). Sidebar nav
  gains both (after CRM/Leads). Dashboard Home: **Active Bookings** KPI + **Recent Bookings**
  feed (stays + services + inquiries). Verified: status change fires toast + notification
  (bell 4→5) + audit; dark mode confirmed (elevated surface #2D2B28).
- **3B Owner portal.** Property detail shows the rental-type badge; short-term properties
  gain a "Current bookings" section (active/upcoming count + mini-table), long-term keep
  units/lease. Owner dashboard: "Recent bookings" feed beside the activity timeline. Owner
  financials: "Revenue by source" card (long-term lease vs short-term booking income +
  proportion bar). Rebalanced Salim's portfolio → Entebbe + Kira short-term, Nakasero +
  Muyenga long-term (Nakasero holds Mubarak's lease), so his portal shows both types.
- **3C Data consistency.** Portfolio cards show Short-/Long-Term badges (sourced from the
  seeded data). `Booking`/`ServiceBooking` types added to the admin entity barrel. Data:
  `BookingStatus` +checked_in/checked_out; `ServiceBookingStatus` + `assignee`; seeded 5
  long-term inquiry leads. Marketing→admin flow: create fns return references after the DB
  write (verified); `/admin/bookings` + `/admin/leads` render seeded rows — within one SPA
  session a fresh submission persists and surfaces (in-memory DB resets on hard reload, as
  with every mutation in this build).

## Revision Pass 2 ✅ — Rental Management + Service Booking Flows (pre-Batch-11)

Commits: `rental-config` → `rental-browsing` → `booking-flows` → `service-booking-forms` → `cta-wiring`.

- **2A Rental config:** `rentalType` (short-term/long-term) + `rentalPayment` (online/manual) +
  `minStay`/`maxStay`/`bedrooms`/`amenities` + short-term pricing (daily/weekly/monthly/cleaningFee)
  + long-term `annualRent` on Property. All 16 mock properties seeded (7 short-term incl. Salim's
  entebbe-villas/kira-gardens/muyenga-heights). Admin property dialog gets a Rental configuration
  section with conditional pricing fields. New `lib/api/rentals.ts` + seeded `bookings` (14) and
  `serviceBookings` (10) in the mock DB.
- **2B `/rentals`:** browse page — Short/Long-term tabs, search, type/location/beds/price/amenity
  filters, rich cards (badge, price-per-period, availability, amenities, Book/Enquire CTA).
- **2C Short-term booking:** `/rentals/[id]` detail (gallery, amenities, units, sticky panel) +
  5-step flow: dates (range calendar, booked dates blocked) → guests → summary (rate×nights +
  cleaning + 18% tax) → simulated payment (Flutterwave/MoMo/Card) → confirmation w/ NX-BK ref.
  Creates a Booking + audit/notification. NB: detail page only skeletons on FIRST load so the
  live-revision refetch can't unmount an in-flight flow.
- **2D Long-term inquiry:** inquiry form (unit, move-in, duration, employment) → "within 24 hours"
  confirmation w/ NX-INQ ref → creates CRM lead (source `rental-inquiry`).
- **2E Service bookings:** shared 5-step `ServiceBookingWizard` → `/book/cleaning` (7 categories,
  property fields) + `/book/lifestyle` (4 services, per-category hints). NX-SV refs.
- **2F CTA wiring:** all six service CTAs live — Contact an Advisor→/contact, Browse
  Properties→/rentals, Request Consultation→/request-a-quote, Book Cleaning→/book/cleaning,
  Book Service→/book/lifestyle, Schedule Consultation→/request-a-quote. Zero 404s.
- **New photos placed:** point3d (rentals hero), keys/moving-in ×2 (Rental Mgmt service),
  francesca + eric-ardito (rental gallery), clubhouse (Condo Mgmt hero), real-estate-sector
  (Asset Opt overview), jakub-zerdzicki (Investors reporting), real-estate-purchase (Investors
  income). Held for Batch 11 tenant onboarding: the two young-couple moving photos.
- Verified end-to-end in-browser; no horizontal overflow at 375px; lint + tsc clean.

## Revision Pass 1 ✅ — Branding swap + 6 services + M-Zi removal (pre-Batch-11)

Commits: `branding-swap` → `service-restructure` → `homepage-fixes` → `site-wide-cleanup`.

- New brand mark everywhere (icon-mark/logo-primary/logo-white PNGs from `public/new-brand/`,
  old SVGs retired, favicon set regenerated, PDF header inherits).
- Services 9 → 6 (Property / Rental / Condominium / Housekeeping & Cleaning / Home & Lifestyle /
  Asset Optimization & Advisory) with per-service CTAs; old slugs 404.
- Homepage: 6 service cards + View All Services; WhatsApp button clears the hero controls.
- ALL "Groupe M-Zi / M-Zi / Group MD" references removed — gate grep returns ZERO.

---

## Batch 0 — Project Setup, Asset Audit & Scaffolding ✅

**Completed.** Clean Next.js 15 project stood up in `nexora-web/`; toolchain wired; assets
organised. No visual/design work (that begins Batch 1).

### What was created

- **Scaffold:** Next.js **15.5.19** (App Router, TypeScript, `src/`, ESLint), React 19.1,
  Tailwind CSS **v4**.
- **Dependencies installed:** `framer-motion`, `@tanstack/react-query`, `zustand`,
  `react-hook-form`, `zod`, `@hookform/resolvers`, `clsx`, `tailwind-merge`,
  `class-variance-authority`, `flowbite-react-icons`.
- **shadcn/ui:** configured via `components.json` (Tailwind v4, css → `src/styles/globals.css`,
  aliases set) + `cn()` helper in `src/lib/utils.ts`. *(CLI `init` was configured manually — the
  interactive `init` prompt hangs in a non-TTY shell.)*
- **Route groups:** `src/app/(marketing)/layout.tsx` and `src/app/(app)/layout.tsx` placeholders.
- **Folder structure:** `components/{ui,marketing,app,motion}`, `content/`, `lib/api/`,
  `styles/globals.css` (relocated from `app/`), `public/{brand,images/properties,images/og}`.
- **Docs:** `README.md` (how to run), this `PROGRESS.md`, scaffold `.gitignore` retained.

### Assumptions / deviations logged

- Icon set = `flowbite-react-icons` (imports: `flowbite-react-icons/outline` · `/solid`;
  exports like `SvgAngleDown`). shadcn `iconLibrary` left as `lucide` in config, but shadcn
  components will be re-wired to **Flowbite** icons in Batch 2 — lucide is not imported anywhere.
- `globals.css` moved to `src/styles/` to match the playbook structure; root layout imports
  `@/styles/globals.css`. Real tokens + fonts land in Batch 1 (currently still scaffold defaults).
- Canonical logo vectors taken from `Logo/svg/` (wordmark outlined to paths), not the `files2/`
  versions (which rely on the Figtree font as live `<text>`).
- 2 moderate npm audit advisories (transitive) — non-blocking; revisit at Batch 12.

---

## Batch 1 — Design System Foundation ✅

**Completed.** The locked design system is encoded so every later component inherits it.

### What was created / changed

- **Fonts via `<link>`** (`src/app/layout.tsx`): Cinzel `400;500;600` + Montserrat `400;500`
  with preconnect, in the root `<head>` — **not** `@import`, **not** next/font. Geist removed.
  ESLint `no-page-custom-font` disabled in the layout with a documented justification (root
  layout loads site-wide, so the pages-router caveat behind the rule doesn't apply).
- **Tokens** (`src/styles/globals.css`): the six palette colours + font families defined in
  `:root`; mapped into the **Tailwind v4 `@theme`** (`bg-*`/`text-*`/`border-*`/`ring-*`) and the
  full **shadcn semantic token set** (card/popover/secondary/destructive/input/ring) — all
  pointing back to the palette (no new hues). `--color-*: initial` **wipes the entire default
  Tailwind colour palette** so `blue-*`/`gray-*`/`slate-*`/`#000` are unreachable.
- **Type scale** utilities (`text-hero` clamp(48–64) / `text-h1` 36 / `text-h2` 28 / `text-h3` 22 /
  `text-body` 16 / `text-caption` 13) + base `h1–h4` styling (Cinzel, 600/500, −0.01em tracking).
- **Typography primitives** (`src/components/ui/typography.tsx`): `<Heading>` (decoupled
  semantic `as` vs visual `size`) and `<Text>` (body/lead/muted/caption) on cva + tokens.
- **Motion primitives** (`src/components/motion/`): `Reveal`, `RevealGroup`/`RevealItem`
  (staggered), `CountUp`, `Parallax`, and a global `MotionProvider`
  (`<MotionConfig reducedMotion="user">`) — every primitive also guards with `useReducedMotion`.
  Shared ease `[0.22, 1, 0.36, 1]`. CSS `@media (prefers-reduced-motion)` fallback added too.
- **Hidden styleguide** at **`/__styleguide`** (folder `%5F%5Fstyleguide` — the `%5F` escape is
  required because App Router treats a leading `_` as a private, non-routed folder). Shows the
  palette, full type scale, and live Reveal / RevealGroup / CountUp / Parallax demos. `noindex`.
- Temporary `page.tsx` replaced with an on-system placeholder (real homepage = Batch 4).

### Verification (browser, real DOM)

- **Fonts genuinely load (no system fallback):** `document.fonts.check()` → **true** for
  Cinzel 500/600 and Montserrat 400/500; computed `font-family` = `Cinzel, serif` on `h1`,
  `Montserrat, sans-serif` on `body`/`p`. (The `__nextjs-Geist` face is Next's dev-overlay font,
  not applied to content.)
- **Tokens resolve:** `body` bg `rgb(245,245,245)` (#F5F5F5); primary swatch `rgb(224,138,32)`
  (#E08A20); hero renders Cinzel.
- **Default palette wiped:** an injected `bg-blue-500 text-gray-400 border-slate-700` element →
  bg transparent, colour/border fall back to palette tokens. No default colours reachable.
- **Build + lint clean; no console errors.** Routes: `/`, `/__styleguide`, `/_not-found`.

### Assumptions logged

- shadcn `--accent`/`--muted` keep the **design-system meaning** (accent = dark emphasis
  `#4A4844`; muted = secondary text `#565655`), not shadcn's "subtle surface" default. Where a
  subtle hover surface is needed in Batch 2, it'll be a palette-derived `color-mix`, not `bg-muted`.
- `--color-destructive` currently aliases `--accent` (resolves cleanly, no stray hex); a muted
  danger colour is derived only when dashboards need it (Batch 9), documented as an extension.
- Styleguide displays palette hex values as **text content** (documentation), not as styling
  values — expected for a styleguide; no hardcoded hex in component styling.

---

## Batch 2 — Core Component Library ✅

**Completed.** Every reusable UI component built once on the tokens (shadcn/Radix primitives +
**Flowbite icons only**), across states, and showcased in `/__styleguide`.

### Dependencies added
Radix primitives (slot, dialog, dropdown-menu, select, checkbox, radio-group, switch, tabs,
tooltip, popover, avatar, label, separator, scroll-area), `recharts` (v3), `react-day-picker`
(v10) + `date-fns`, `sonner`, `tw-animate-css` (enter/exit utilities for dialog/sheet).

### Components (`src/components/ui/`)
- **Forms:** Button (primary/secondary/outline/ghost/link · sm/md/lg/icon · loading · disabled ·
  asChild), Input, Textarea, Label, Select, Checkbox, RadioGroup, Switch, DatePicker (+ Calendar),
  FileUpload (drag-drop, keyboard, file list), Spinner.
- **Data display:** Card (default/interactive/media + Header/Title/Description/Content/Footer),
  StatCard (KPI + trend, accepts `<CountUp>`), Table primitives, **DataTable** (client-side sort,
  pagination, row selection, loading/empty/error states), Badge, Avatar (+ image/initials/Group),
  Timeline, EmptyState, Skeleton (text/card/table/chart), Chart wrappers (Line/Bar/Area/Donut via
  recharts, all colours = palette tokens).
- **Navigation & feedback:** Sidebar (260↔72 collapse, active/nested), Topbar (search, notif badge,
  profile slot), Breadcrumb, Tabs (underline + pill), Pagination (windowed), Dialog, Sheet (4 sides),
  DropdownMenu, Tooltip, Popover, Alert (info/primary/accent), Toaster (sonner), Separator.

Two palette-derived surface tokens added to `globals.css` (`--surface-hover`, `--surface-active`
= `color-mix` of foreground over background — no new hue) for ghost/secondary hovers, table row
hover, dropdown/select item hover, skeletons.

### Icons — standing rule honoured
Built directly on Radix (not `shadcn add`) so **no `lucide-react` ever entered the codebase**
(`grep lucide src/` → 0). Flowbite export names drop the `Svg` prefix (`Building`, `Close`,
`AngleDown`…, imported from `flowbite-react-icons/outline`).

### Verification (browser, real DOM)
- Build + lint clean, **no warnings**; all 6 routes prerender; **zero console errors** on `/__styleguide`.
- Rendered: 56 buttons, 7 recharts surfaces (line/bar/area/donut), 1 DataTable.
- On-token computed styles: primary button / badge / checked checkbox / checked switch =
  `rgb(224,138,32)` (#E08A20); outline border = `rgb(212,212,211)` (#D4D4D3); table header =
  `rgb(86,86,85)` (#565655); headings = `Cinzel`.
- No default-palette leak (earlier `blue-/slate-` "hit" was the substring inside `translate-*`).

### Assumptions logged
- `--color-destructive` still aliases `--accent`; a muted danger colour is derived when dashboards
  need it (Batch 9). Alert variants stay palette-only (info/primary/accent) — no red/green.
- `aria-invalid` inputs use a `--primary` border for the error emphasis (palette-only).
- shadcn `iconLibrary:"lucide"` remains in `components.json` but is unused — we never run `shadcn add`.

---

## Batch 3 — Marketing Layout Shell ✅

**Completed.** Global chrome shared by every marketing page — header, footer, floating WhatsApp —
composed around the page slot in `(marketing)/layout.tsx`.

### What was built
- **`src/content/site.ts`** — single editable source for brand, `primaryNav`, `services`,
  `footerColumns`, `contact` (address/email/phone/WhatsApp placeholders), `socials`, `whatsappHref`,
  and `heroRoutes`. Nothing hardcoded in components.
- **`SiteHeader`** (`components/marketing/site-header.tsx`) — sticky, `fixed top-0`. Transparent over
  the hero (white logo `logo-white.svg`, light nav) → **crossfades** to a solid `--background`
  surface + shadow + `--border` bottom once `scrollY > 80` (or immediately on non-hero pages), with
  the primary dark logo `logo-primary.svg`. Logo swap = two stacked `next/image` with 300ms opacity
  crossfade. Nav: active route in `--primary` (`aria-current="page"`); non-active = `--foreground`
  (solid) / `background/90` (transparent), hover `--primary`. "Request a Quote" CTA. Focus rings,
  keyboard accessible.
- **`MobileMenu`** — right-drawer built on the Batch-2 **Sheet** (Radix Dialog → focus trap, body
  scroll-lock, escape + outside-click close for free); links **stagger in** via Framer, close on
  click; reduced-motion drops the stagger.
- **`SiteFooter`** — elegant dark `--foreground` surface: white logo, tagline, Cinzel brand quote,
  5 columns (Navigation / Services / Projects / Information / Contact), contact details (tel/mailto/
  wa.me), Flowbite social icons, `A Groupe M-Zi Inc. Company` + dynamic `©` year. Stacks on mobile.
- **`WhatsAppButton`** — fixed bottom-right `--primary` circle (Flowbite `Whatsapp`), Framer entrance
  (fade+rise, reduced-motion safe), hover scale + "Chat with us" label reveal, prefilled wa.me link.
- **Wiring:** `(marketing)/layout.tsx` → `<MarketingFrame>`; temp `(marketing)/page.tsx` (full-bleed
  hero + long scroll) and `(marketing)/about/page.tsx` (no hero) for testing; root `app/page.tsx` removed.

### Has-hero mechanism (as requested)
`site.ts` exports `heroRoutes: string[]` (currently `["/"]`) + `pageHasHero(pathname)`. The client
**`MarketingFrame`** reads `usePathname()` (SSR-stable — returns the real path during server render,
so **no flash**) and computes `hasHero`. It passes `hasHero` to `SiteHeader` (transparent-start vs
solid-from-top) **and** sets the `<main>` top padding (`pt-20` only when there's no hero, so solid-
header pages clear the fixed header while hero pages sit full-bleed underneath). Adding a future hero
page is a one-line change to `heroRoutes` — centralised, typed, no per-component edits.

### Verification (running dev server, real DOM)
1. **Transition both directions:** at `scrollY 0` → header transparent (`bg` transparent, no border/
   shadow); after crossing threshold → `bg #F5F5F5`, `border #D4D4D3`, `shadow-sm`. Confirmed via the
   applied class strings + computed styles. *(Note: the preview browser doesn't emit `scroll` on
   programmatic `scrollTo`, so I drove the handler with a dispatched `scroll` event; on mount it reads
   `scrollY` directly, verified solid at a restored scroll position.)*
2. **Logo variant per state:** transparent → `logo-white` opacity 1 / `logo-primary` 0; solid →
   reversed. Contrast holds (white nav on hero, `#232220` nav on solid).
3. **Mobile menu:** opens (`role="dialog"`, `aria-expanded=true`), all 7 links + CTA, **body scroll
   locked**, **Escape closes** (state closed, body restored), staggered, keyboard accessible.
4. **WhatsApp:** entrance + hover label reveal; href = prefilled `https://wa.me/256700000000?text=…`.
5. **Footer:** 5 columns, 6 external links, dynamic year (2026), company line — all present; stacks on mobile.
6. **Icons:** `grep lucide src/` → **0**; social/WhatsApp icons from `flowbite-react-icons/solid`.
7. **Reduced motion:** global `@media (prefers-reduced-motion: reduce)` rule confirmed present in the
   served CSS (flattens header transitions); Framer components use `useReducedMotion`. The preview
   toolset can't emulate the media feature, so this was verified by shipped-CSS + code, not a live toggle.

- Build + lint clean (7 routes: `/`, `/about`, `/__styleguide`, `/_not-found`); zero console errors.

### Fixes / notes
- **Button `asChild` bug fixed:** it passed `[false, child]` to Radix `Slot` (the `!asChild && loading`
  expression became a 2nd child); Slot needs exactly one. Button now branches so `asChild` forwards
  `children` untouched. (First surfaced here — Batch-2 usages wrapped Buttons in *other* triggers.)
- **Process note:** running `next build` while the dev server was live corrupted its `.next`
  (dev/prod artifact collision). Going forward: stop the dev server before `next build`.
- Nav-link colouring interprets the design "links = primary" rule as: **active** link = `--primary`;
  resting nav links = `--foreground`/light-for-contrast with `--primary` hover (so contrast holds in
  both header states). Inline body links still follow the base primary/accent rule.

---

## Batch 4 — Homepage (flagship, Ilios-modelled) ✅

**Completed.** Cinematic, motion-rich homepage; all copy/data in `src/content/home.ts`; real
property photography; fully on-system.

### Sections built (in order)
1. **Hero slider** (`hero-slider.tsx`) — full-screen (100svh), 3 slides, auto-advance 6s + pause on
   hover, Ken-Burns zoom, staggered text (eyebrow→headline lines→sub-line→CTA), **slide counter
   01·02·03** (active in `--primary`) with an animated **progress line**, manual prev/next arrows,
   left social rail (Flowbite solid), bottom-left "Contact us" + phone, gradient scrim for contrast.
2. **Trust bar** (`home-stats.tsx`) — 5 `<CountUp>` stats, `--border` divider grid, staggered reveal.
3. **About** (`home-about.tsx`) — image slides in from the side + parallax; text staggers; AnimatedLink.
4. **Services** (`home-services.tsx`) — 8 cards, staggered `RevealGroup`, hover lift + icon→primary.
5. **Why Choose** (`home-why.tsx`) — 6 value props, staggered reveal.
6. **Featured projects** (`featured-projects.tsx`) — tabbed showcase; selecting a name fades/zooms in
   a feature image + details; auto-advance + pause on hover; mobile = stacked tap list.
7. **Testimonials** (`testimonials.tsx`) — auto-advancing carousel, manual arrows + dots, pause on hover.
8. **CTA banner** (`home-cta.tsx`) — parallax property image + scrim, Cinzel headline, primary CTA + WhatsApp.

### Reusable motion / interaction treatments created
- **`CtaButton`** (`cta-button.tsx`) — the single site-wide CTA: `buttonVariants` styling + hover
  arrow-slide + press scale-down; renders Link (internal/external) or button. Used in hero + CTA banner.
- **`AnimatedLink`** (`animated-link.tsx`) — inline link with left-origin underline grow + arrow nudge,
  primary→accent. Used in About, Services, Featured projects.
- **Nav underline** — added to `SiteHeader` links: full when active, grows from left on hover (fluid).
- **`SectionHeading`** + **`SectionIcon`** (icon-key → Flowbite registry) shared across sections.
- Reveal / RevealGroup / CountUp / Parallax (Batch 1) drive the scroll-unfold; shared ease `[0.22,1,0.36,1]`.

### Verified live (DOM/computed styles; dev server left running for your review)
- Hero: image + text change on nav (villas-dusk→tower-curved-balcony, "Managing Properties."→"Your
  Asset,"), active counter `#E08A20`, progress line animates, autoplay advances, arrows work, Cinzel headline.
- Stats count up on scroll-in (1,200+/98%/12/96%/340+). Service cards render + stagger.
- Featured projects: selecting Munyonyo swaps to its image (tower-poolside) + details. Testimonials advance.
- Header transparent over hero at top; solid on scroll (Batch-3 mechanism). Zero console errors.
- Build + lint clean (7 routes). `grep lucide src/` → 0; Flowbite-only; six-token palette; Cinzel/Montserrat.

### Key fix / note — Framer AnimatePresence in dev
`AnimatePresence` (esp. `mode="wait"`, and even default mode) proved **unreliable under React Strict
Mode in Next dev** here: exits didn't complete, children accumulated, and enter/opacity states stuck.
**Resolution:** the crossfading media (hero image, featured image) and the testimonial/detail blocks
use **keyed remounts** (`<motion.div key={active}>`, mount animation only — no exit) instead of
`AnimatePresence`. This is fully reliable (proven in-browser). Trade-off: slide changes are a
fade/zoom-in rather than an overlapping crossfade — clean and cinematic on the dark hero.

### Assumptions
- Mobile featured-projects is a stacked **tap** list (not swipe-gesture) — selects still crossfade.
- Hero slide CTAs: 01 Request a Quote, 02 Explore Properties, 03 Book a Consultation (per brief).
- Service/value icons mapped to nearest Flowbite outline (e.g. Mobile Car Wash → `Truck`, Cleaning →
  `WandMagicSparkles`), documented in `section-icons.tsx`.

---

## Batch 5 — About & Services Pages ✅

**Completed.** Premium, motion-rich About + Services index + 9 dynamic service sub-pages, matching
the homepage quality. Includes the Part-A testimonial fix.

### Part A — testimonial carousel fix
The prev/next arrows overlapped the quote because the blockquote was `absolute` (leftover from the
old crossfade), so long quotes overflowed the fixed-height box onto the controls. Now that it uses a
keyed remount (one blockquote at a time), it's back in normal flow inside a reserved-min-height,
centered box (`max-w-2xl`, comfortable padding, smaller mobile font); controls sit cleanly below.
Verified: desktop 40px / mobile 133px gap, **no overlap**; controls stable across short/long quotes
(**no section jump**). Committed separately: `fix: testimonial carousel spacing + control placement`.

### Content (typed)
- `src/content/about.ts` — hero, story, vision/mission (+ pull statement), 6 core values, 4 leaders,
  3-phase roadmap, CTA.
- `src/content/services.ts` — **9 services** with full sub-page data (promise, overview, included
  sub-services, who-it's-for, pricing note, related slugs) + index hero, 4-step process, CTA.
  `serviceSlugs` + `getService()` are the single source for the dynamic route.

### Reusable components (extend the Batch-4 kit)
- `PageHero` — shorter branded hero band, CSS Ken-Burns (`@keyframes kenburns` +
  `--animate-kenburns`, `motion-reduce:animate-none`) + scrim.
- `MediaText` — alternating two-column; image slides in from its side (`reverse` flips direction) +
  parallax; reduced-motion → fade only.
- `CtaBanner` — generic parallax CTA band (heading/subline/image/primary/secondary).
- Reused: `CtaButton`, `AnimatedLink`, `Reveal`/`RevealGroup`/`RevealItem`, `SectionIcon`, `Parallax`.
- **No AnimatePresence `mode="wait"`** anywhere — crossfades use keyed remount / CSS (per Batch-4 lesson).

### Pages
- `/about` — 7 sections: PageHero → story (`MediaText`, image left) → vision/mission (centered Cinzel
  pull-statement + offset cards) → core-values grid (hover lift + icon accent) → leadership (initials
  avatars, hover lift) → growth roadmap (3-phase infographic, Phase 01 active in `--primary`) → CtaBanner.
- `/services` — PageHero → designed 3-col rich-card grid (hover lift + icon fill + Explore arrow) →
  dark process strip (big faded numerals) → CtaBanner.
- `/services/[slug]` — `generateStaticParams` (all 9) + `generateMetadata` + `notFound()`. Sections:
  PageHero → overview (`MediaText`) → what's-included grid → who-it's-for + pricing-model callout →
  related services (2–3 cards) → service-specific CtaBanner.

### Verification (running dev server, real DOM)
1. `/about` — all sections present (6 values, 4 leaders, 3 roadmap phases, CTA), Cinzel hero, header
   solid-from-top (`#F5F5F5`, `main` `pt-20`), **0 broken images**.
2. `/services` — 9 unique service links, hover-lift cards, process strip, 0 broken images.
3. `/services/premium-cleaning` — overview, 4 included cards, who-it's-for, pricing model, related, CTA.
   **Bad slug `/services/does-not-exist` → HTTP 404.** Build shows 9 SSG paths.
4. Reveal/hover/parallax consistent with homepage; keyed-remount/CSS patterns (no janky/stuck transitions).
5. Testimonial fix still correct (78px gap, no overlap).
6. `grep lucide src/` → **0**; Flowbite-only; six-palette; Cinzel headings verified.
7. Mobile 375 `/about` — **no horizontal overflow** (scrollWidth == innerWidth). Reduced-motion safe
   (MediaText `useReducedMotion`, Ken-Burns `motion-reduce:animate-none`, global reduced-motion rule).

- Build + lint clean (17 routes total); zero console errors.

### Assumptions / notes
- Growth roadmap implemented as a **3-phase card infographic** (rather than the literal Batch-2
  Timeline) — reads better for 3 phases; Phase 01 ("Now") is the active/primary state.
- Leadership uses **initials avatars** (no real team photos in assets) with hover lift.
- `HomeCta` (Batch 4) left as-is; new pages use the generic `CtaBanner` (minor duplication, no risk).

---

## Batch 6 — Portfolio & Projects Pages ✅

**Completed.** The most image-driven part of the site — `/portfolio`, `/portfolio/[slug]` (9 SSG),
and `/projects` — with fresh interaction patterns, all reliable and reduced-motion safe.

### Content
- `src/content/portfolio.ts` — **9 properties** across 5 categories (Residential / Commercial /
  Condominiums / Institutional / Managed Facilities), each with gallery, spec details, scope, results
  metrics, related slugs. Plus categories, feature quote, impact stats, and all Projects content
  (before/after pairs, transformation stories, impact metrics, success stories). `propertySlugs` +
  `getProperty()` drive the dynamic route. Images assigned per context — no image reused for every card.

### New interactive components
- `PortfolioGrid` — filter chips + **Framer `layout` reflow** (positions animate on filter, not just
  show/hide) + scroll-reveal scale-up + hover image zoom. **No AnimatePresence** (removed items just
  unmount; remaining items animate via `layout`).
- `Lightbox` + `PropertyGallery` — fullscreen gallery: CSS-crossfade layers, prev/next, **keyboard
  (Esc / ← / →)**, thumbnails, body-scroll lock, animated open/close via opacity.
- `BeforeAfter` — **draggable handle** (pointer events → mouse + touch; `touch-none`), `clip-path`
  reveal, arrow-key accessible `role="slider"`. No motion → reduced-motion safe by nature.
- `SuccessStories` — tabbed showcase, CSS-crossfade (keyed/CSS pattern).
- `ParallaxFeature` — full-bleed parallax band with Cinzel pull-quote as a section-to-section transition.

### Pages
- `/portfolio` — PageHero → filterable animated grid → ParallaxFeature transition → count-up impact
  strip → CtaBanner.
- `/portfolio/[slug]` — `generateStaticParams` (all 9) + `generateMetadata` + `notFound()`. Hero →
  gallery+lightbox → details spec sheet + scope (icon list) → results count-up → related properties → CTA.
- `/projects` — PageHero → before/after showcase (2 sliders, alternating) → transformation stories
  (alternating `MediaText`) → impact count-up → tabbed success stories → CtaBanner.

### Verification (running dev server, real DOM)
1. `/portfolio` — 6 chips, 9 cards; **filter Commercial → 2 cards** (Lugogo, Ntinda) with `layout`
   reflow; 0 broken images.
2. `/portfolio/entebbe-villas` — all sections; **lightbox opens** (`aria-hidden=false`, `opacity-100`,
   3 layers), **Next advances thumbnail 0→1**, scroll-lock + keyboard wired; results count up.
   **Bad slug `/portfolio/not-a-real-property` → HTTP 404.** Build shows 9 SSG paths.
3. `/projects` — 2 before/after `role="slider"`s; **keyboard moves handle 50→60**; alternating
   transformation stories; impact metrics; tabbed success stories switch active tab; 0 broken images.
4. New patterns (filter reflow, lightbox, before/after drag, tabbed crossfade, parallax feature) all
   work; reduced-motion safe (CSS-based / `useReducedMotion`; no AnimatePresence anywhere).
5. Varied real imagery per context; **0 broken images** on every page.
6. `grep lucide src/` → **0**; Flowbite-only; six-palette; Cinzel/Montserrat.
7. Mobile 375 `/portfolio` — **no horizontal overflow**; filter chips horizontally scrollable.

- Build + lint clean (28 routes total); computed-opacity reads during CSS transitions are unreliable
  in the preview (used `aria-hidden`/className/`aria-current` for reliable state checks).

### Notes
- Before/after uses contrasting images from the set as illustrative Before/After (no true paired
  shots in assets); labelled clearly and drag/keyboard both work.
- Portfolio grid kept as a clean animated 3-col grid (uniform aspect) rather than true row-span
  masonry, to keep `layout` reflow smooth; rhythm comes from stagger + scale-in + hover zoom.

---

## Design upgrade — glassmorphism treatments + portfolio detail redesign (pre-Batch 7 Part A + C) ✅

Reference-driven visual upgrade (RealestateRoyal / Urban / Estate patterns; our six tokens only).
Split from Batch 7: Part A (shared restyle) + Part C (portfolio detail) done & verified; **Part B
(Investors/Blog/Careers/Contact + forms) is the remaining work**, to be built on this new standard.

### Part A — reusable treatments + gray-section upgrade
- New `components/marketing/section-treatments.tsx`: **GlassPanel** (frosted, `tone` light/dark,
  tints = alpha of `--foreground`/`--background`, primary accent line), **ImageOverlaySection**
  (parallax image + scrim), **FloatingImageCard** (rounded offset card + hover zoom), **ImageStatBand**
  (image-backed frosted count-up stat cards). CSS `@keyframes kenburns` added for hero bands.
- Applied (varied, not all glass): Home trust bar → `ImageStatBand`; Projects impact → `ImageStatBand`;
  Portfolio impact → elevated floating stat cards on a gradient; About vision/mission → glass panels
  over an image band. Resting `shadow-sm` added to every hover-lift card site-wide so cards float.
- **Contrast (measured, WCAG):** glass stat number (primary, hero-size) **4.3:1** worst-case (bright
  image under `foreground/85` scrim + `foreground/30` glass) → passes AA-large; **5.9:1** typical;
  light label **10.6:1**; light enquiry-card glass (dark text) ~13:1. All pass. backdrop-blur kept to
  a few panels per section (no scroll jank).

### Part C — portfolio detail rebuild (Estate blueprint)
- `/portfolio/[slug]` rebuilt: gallery (lightbox retained) → **highlights spec grid** (6 Flowbite-icon
  tiles: Type/Units/Occupancy/Year/Parking/Size) → overview → **embedded map** → scope → results
  count-up, with a **sticky frosted glass enquiry card** (Request-a-viewing CTA + phone + WhatsApp;
  `lg:sticky`, stacks on mobile) → related → CTA. New `map-embed.tsx` uses a **keyless OpenStreetMap
  iframe** (note: swap for Google Maps + API key at launch). `propertyMeta` (address/coords/year/
  parking/size) added to `portfolio.ts`.

### Verified
- Build + lint clean (28 routes). `grep lucide` → 0. Portfolio detail: highlights + map iframe +
  sticky enquiry all present; 0 broken images; **no horizontal overflow at 375** (sticky card stacks).
- Glass contrast measured AA-passing (values above). Gray stat strips replaced with image-glass /
  elevated cards — no flat gray bands left on Home/About/Portfolio/Projects.

### Design revision (per feedback, before Part B)
- **Homepage/Projects/Portfolio stat strips reverted to light** hover-animated cards (`StatCardsSection`)
  — the dark glass band was the wrong target. `ImageStatBand` removed.
- **CTA band before the footer** (the real "#575755" section — Home/About/Services/Portfolio/Projects):
  now a **clear image with a lighter gradient scrim** (`from-foreground/45 via-/78 to-/45`, darkest
  behind the centred text) + text-shadow → imagery reads clean, text contrast **7.07:1** worst-case.
  CTA images swapped to brighter shots (villa-infinity-pool, villa-garden-pool, tower-white-woodbalcony,
  tower-poolside, tower-curved-balcony). `HomeCta` now reuses the shared `CtaBanner`. *(New Unsplash/
  Freepik shots can be dropped into `public/images/properties/` — one-line src swap in the content files.)*
- **About pull-statement** ("We manage properties the way we would want our own managed…") is now a
  **hover-animated glass card**; `GlassPanel` lifts on hover by default (all cards hover-animate).
- **Services "A simple, transparent process"** kept, now an **animated flow** — steps reveal in
  sequence with a connector line drawing Consult → Onboard → Manage → Optimise (`ProcessFlow`).

### Deferred to Part B (Batch 7)
Investors, Blog (+ `[slug]`), Careers, Contact pages + the 5 lead-capture forms (react-hook-form +
zod → mocked `lib/api/leads.ts`), all to the new glass/image-overlay standard. Also: the sticky
enquiry card currently offers CTA + contact affordances; the full enquiry **form** lands with Batch 7.

---

## Batch 7 — Investors, Blog, Careers, Contact + forms ✅ (+ portfolio detail Part C)

**Completed.** Built to the corrected house style (light hover cards, image CTAs with legible scrims,
glass as accent only). Committed in chunks: portfolio detail redesign, then Batch 7 pages + forms.

### Portfolio detail (Part C, redone to standard) — commit `4d9cbf6`
Sticky enquiry card is now a **light card** (not dark glass); **keyless Google Maps embed**
(`maps.google.com/maps?q=…&output=embed`; swap for Maps Embed API + key later); highlights spec grid
(Type/Size/Units/Status/Year/Parking), amenities chips, local-context tiles, light hover result cards,
gallery "+N more". Verified: sections present, map embeds with correct coords, 0 broken images, no
mobile overflow.

### Batch 7 pages
- **/investors** — image PageHero, 6 light hover "why invest" cards, 3 alternating MediaText blocks
  (transparency / asset protection / rental income), **FAQ accordion** (click-to-expand), investor
  consultation form, image CTA.
- **/blog** — PageHero, **animated category-filter reflow** (7 chips, Framer `layout`), floating
  rounded post cards, pagination. **/blog/[slug]** (8 SSG posts, `generateStaticParams` +
  `generateMetadata`, bad slug → 404): hero, article, share buttons (FB/X/LinkedIn/WhatsApp), 3 related.
- **/careers** — PageHero, **roles accordion** with "Apply for this role" that **prefills the position**
  in the application form (+ CV upload), culture MediaText, benefits hover cards, CTA.
- **/contact** — creative split: **tabbed form panel** (General / Quote / Assessment), office info card
  (address/phone/email/WhatsApp/socials + business hours), keyless Google **office map**.

### Forms (react-hook-form + zod → mocked `lib/api/leads.ts`)
All 5 built and on-system (labels, `role="alert"` errors, loading state, sonner success/error toast):
Contact, Quote, Assessment (tabbed on /contact), Investor Consultation (/investors), Job Application
+ CV upload (/careers). `<Toaster/>` mounted in `MarketingFrame`.

### Verification (live DOM)
- Investors FAQ + careers roles **click-to-expand reveal content** (478px), chevron rotates, prefill works.
- Contact form: empty submit → **4 validation errors**; valid submit → **success toast** ("Message sent").
- Blog: filter reflow (Investment → 1 post), bad slug → **404**, share buttons, 3 related, 0 broken images.
- Build + lint clean (40 routes); `grep lucide` → 0; palette + Cinzel/Montserrat held.

### Animation lesson (important)
This preview/Chromium **cannot** animate the accordion via CSS `max-height`/`grid-rows` transitions
**or** Framer `animate` bound to changing state (both leave the element collapsed — same class of bug
as the Batch-4 featured-projects). The accordion uses a **conditional render + `tw-animate` fade/slide
entrance** (`motion-safe:`) instead — reliable. Rule of thumb for this project: prefer conditional
render / CSS opacity / keyed-remount over `animate`-on-state and height transitions.

---

## Batch 8 — Authentication & App Shell ✅

**Completed.** The transition from marketing site to product: 6 auth screens, a role-aware app shell
(sidebar + topbar + drawer), notification center, profile/settings, and a mock role-routing/guard
system with a **dev role switcher** so all three portals (Admin / Owner / Tenant) can be previewed
without a real backend. Built to the **quieter dashboard design language** (Cinzel reserved for page
titles/section headers, Montserrat for dense UI, 150–250ms functional motion, no hero sliders / Ken-
Burns / parallax / heavy glass).

### Foundation — mock backend + stores
- **`lib/roles.ts`** — the `Role` union (`super_admin`, `ops_manager`, `property_manager`,
  `maintenance_officer`, `finance_officer`, `owner`, `tenant`), `roleLabels`, `adminRoles`,
  `portalForRole(role)` → `/admin` | `/owner` | `/tenant`, and `requires2fa(role)` (true for the
  internal `adminRoles` — staff must pass 2FA, owners/tenants don't).
- **`lib/api/auth.ts`** — mocked async auth: `login`, `register`, `requestPasswordReset`,
  `resetPassword`, `verifyEmail`, `verifyTwoFactor(code)` (accepts any 6-digit code). Returns a fake
  session `{ user, token }`; unused params (mirroring the real backend contract) are `_`-prefixed.
- **`lib/api/notifications.ts`** — `AppNotification` type + 8 seed notifications (4 unread) across the
  5 types (payment/maintenance/lease/announcement/system).
- **Zustand stores:** `stores/session.ts` (persisted to `localStorage:nexora-session`, `partialize`
  keeps only `user`; holds `pending` for the 2FA hand-off), `stores/ui.ts` (persisted
  `sidebarCollapsed`), `stores/notifications.ts` (in-memory, seeded, `markRead`/`markAllRead`).

### Auth screens — `(app)/(auth)/*` (split-panel layout: brand image left, form right)
`/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/2fa` — all
react-hook-form + zod, inline `role="alert"` errors, loading buttons, sonner toasts.
- **/login** carries a **dev role `<select>`** (super_admin / property_manager / finance_officer /
  owner / tenant) so you choose which portal to enter. On submit: if `requires2fa(role)` → stash the
  user in `session.pending` and route to `/2fa`; otherwise set the session and route to
  `portalForRole(role)`.
- **/2fa** — 6-digit code (any 6 digits pass) → promotes `pending` to the live session → portal.
- **/verify-email** auto-verifies on mount; **/forgot → /reset** flow toasts and returns to `/login`.

### App shell — `components/app/app-shell.tsx` (wraps every `(dashboard)` route)
- **Collapsible sidebar** 260 ↔ 72px, collapse state **persisted** in `localStorage` (`nexora-ui`).
  Full `logo-primary.svg` when expanded, `icon-mark.svg` when collapsed. **Role-aware nav** from
  `nav-config.tsx` → `navForRole(role)` (owner / tenant / admin sets; admin further filtered by staff
  sub-role). Active route highlighted; collapsed items show tooltips.
- **Topbar** — mobile hamburger (opens the off-canvas **Sheet** drawer), breadcrumb from the path,
  search input, **dev role-switcher dropdown** ("Viewing as …"), notification bell + unread badge,
  profile menu (avatar → Profile / Settings / Logout).
- **Mobile** — sidebar hidden below `lg`; the same nav renders inside a left **Sheet** drawer.

### Notifications, profile, settings
- **`notification-center.tsx`** — bell dropdown, unread badge, latest 6 (mark-read on click),
  "View all" → `/notifications`.
- **`/notifications`** — filter chips (All / Unread / 5 types), paginated (6/page), mark-read /
  mark-all-read.
- **`/profile`** — details form (name/email/phone, updates the session) + change-password form (both
  RHF + zod, mock delay + toast).
- **`/settings`** — notification-preference matrix (each type × in-app/email/SMS) on Batch-2
  `Switch`es, save → toast.

### Role-routing & guard mechanism (how to preview all three portals — read this)
There is **no real auth**; everything keys off the persisted `session.user.role`:
1. **Guard.** `AppShell` is a client component that reads the session. It waits for a `mounted` flag
   (so persisted `localStorage` has hydrated — avoids an SSR/first-paint false redirect), then: if
   there's **no user**, it `router.replace("/login")` and renders nothing; otherwise it renders the
   shell. So every `(dashboard)` route is protected — hitting `/admin` while logged-out bounces to
   `/login`.
2. **Entering a portal.** Pick a role in the **/login** dev select and submit → the session is set to
   that role and you land on `portalForRole(role)` (`/admin`, `/owner`, or `/tenant`). Internal roles
   detour through `/2fa` first (any 6 digits).
3. **Switching live.** The topbar **"Viewing as {role}" dropdown** calls `session.setRole(...)`, which
   rewrites the current user's role in place and navigates to the new portal — so you can jump
   Admin → Owner → Tenant instantly without logging out. The sidebar nav, dashboard, and breadcrumbs
   all re-derive from the new role. **This is the switcher to use when reviewing Batches 9–11.**
   *(It's clearly labelled a dev affordance; in production it'd be gated to staff / removed.)*
4. **Logout.** Profile menu → Logout clears the session (and `localStorage`) → `/login`.

### Dashboard pages (stubs until Batches 9–11)
`/admin`, `/owner`, `/tenant` render a `DashboardStub` (PageHeader + role-appropriate `StatCard`
grid + a dashed "arrives in Batch N" note) so the shell + routing are fully reviewable now.

### Standing-rule fix found during verification
The Batch-2 Sidebar had `transition-[width]` on the 260↔72 collapse. In this preview that transition
**pins the width at its old value** even though the `w-[260px]`/`w-[72px]` class flips (the class read
`w-[260px]` while the box measured 72px) — the exact `max-height`/`grid-rows` failure class from
Batch 7. **Removed the width transition** → the collapse now applies instantly and reliably (verified
72 → 260 → 72 both ways). Consistent with the project rule: no `animate`/transition bound to changing
state; prefer instant/conditional/keyed.

### Verification (live DOM, 1280×900 desktop + 375 mobile)
- **Login as owner** → session persisted (`localStorage:nexora-session`) → redirect `/owner` →
  role-aware sidebar (7 owner nav items) → topbar "Viewing as Owner" → 4 KPI cards.
- **Sidebar collapse** 72 ↔ 260 both ways (persisted); logo swaps icon-mark ↔ full lockup.
- **Notification badge** shows **4** unread; avatar present; dev role-switcher renders.
- **/notifications** — 7 filter chips, 6 paginated rows, 3 mark-read actions.
- **Guard** — unauthenticated `(dashboard)` access redirects to `/login` (mounted-gated, no flash).
- Build + lint **clean**; `grep lucide src/` → **0**; six-token palette + Cinzel/Montserrat held.

### Notes
- Radix dropdowns (role switcher, notification bell, profile menu) need **real pointer events** —
  they render correctly but don't open via synthetic `.click()` in the preview (same as the Batch-3
  mobile Sheet, which is verified to work with real input).
- Auth is entirely client-side/mock; tokens are fake strings. Real API wiring is a later concern.

---

## Admin Live Upgrade — Pass 4 ✅ (Branded PDFs + integration polish) — ADMIN ENHANCEMENT COMPLETE

The 4-pass admin enhancement is **COMPLETE**. Pass 4 adds client-side branded PDF generation and
wires every download stub across all three portals.

- **PDF generator** (`lib/pdf/*`): `@react-pdf/renderer`, **dynamically imported** inside `downloadPdf`
  so it's a client-only, code-split chunk — the full `npm run build` passes clean (verified). `theme.ts`
  (brand colours + logo PNG + company constants; Helvetica for load-safe generation). `documents.tsx`:
  shared branded Header (logo + company + orange-underlined title) / Footer (reg + tagline + page
  numbers) + the four documents. `builders.ts`: entity → payload (real store data). `download.ts`:
  blob → browser download + toast.
- **4 branded documents:** Invoice (bill-to, line-items table, total, payment instructions), Receipt
  (PAID stamp, amount/balance), Owner Statement (per-property breakdown + portfolio totals +
  disbursement), Lease Agreement (parties, terms table, 6 clauses, signature block).
- **Wired stubs** — Admin: Finance invoices *View PDF*, payments *Receipt*, Reports *Owner Statement*
  generator + recent, Leases *Download agreement*, Owner detail *Statement*, Tenant detail Documents
  (lease/invoice/receipt). Owner: reports, financials export, documents (lease→Lease PDF, else
  Statement). Tenant: payment-history receipts.
- **Verified live:** all 4 types generate real files with sensible names + success toasts —
  `Nexora-Invoice-INV-2026-0224-July-2026.pdf`, `Nexora-Statement-Salim-Kato-Jun-2026.pdf`,
  `Nexora-Lease-LSE-LSE1.pdf`, `Nexora-Receipt-NX583700.pdf`. Owner portal still reconciles (Salim's
  statement generates from his real 4-property data). **Full `npm run build` clean** (first since
  Batch 9, with all Pass 1–4 additions). Committed in chunks (pdf-generator / stub-wiring).

**Admin dashboard is now a fully live, state-managed product:** dark mode, live state engine, full CRUD
for every entity, delete confirmations, 7-tab Settings, RBAC roles, Wallet, audit trail, system
notifications, and branded PDFs. Next: **Batch 11 — Tenant Portal.**

---

## Admin Live Upgrade — Pass 3 ✅ (Settings expansion + Security + Wallet + Audit Trail)

**Data layer:** RBAC `roleDefs` (7 PRD roles + per-module permission matrix) + role CRUD; wallet
(`wallet.balance`, `walletTransactions`, `bankAccounts`) + `withdrawFunds`/`sendFunds`/bank CRUD +
`saveSettingsSection` — all through `recordMutation`. New read accessors: `listRoles`, `getWallet`,
`listTransactions`, `listBankAccounts`, `ownerOptions`, `PERMISSION_MODULES`.

**Settings → 7 tabs** (`/admin/settings`):
1. **Company** — profile form (name/email/phone/address/reg/TIN/description + logo stub) → save + audit;
   keeps the appearance/theme toggle.
2. **Global** — currency/timezone/date-format, lease defaults (grace/due-day), maintenance SLA hours.
3. **Roles** — 7 role cards + Create/Edit (module R/W permission matrix, write implies read) + Delete
   ("cannot be undone"). All through the live engine.
4. **Notifications** — 8 types × 3 channels (In-app/Email/SMS) Switch grid → save.
5. **Audit Trail** — reads the audit store; search + user/entity/action/date filters; paginated,
   newest-first; **click-to-expand** rows (conditional-render + mount animation) showing summary +
   before/after JSON.
6. **Security** — 2FA Switch with **disable-confirmation** dialog; change-password form with **strength
   meter**; active-sessions list with revoke-confirmation.
7. **Integrations** — 6 status cards (Flutterwave/Stripe/Resend/Africa's Talking/Cloudinary/S3) +
   Configure modal with masked API-key/secret fields.

**Wallet** (`/admin/wallet`, in sidebar after Finance): balance count-up + received/withdrawn/pending
KPIs + balance-trend chart; filterable transaction table (+/- colour-coded via foreground/primary,
status badges); **Withdraw** modal (review step + balance validation), **Send funds** modal (owner
disbursement); **Banking details** (masked accounts + add/edit/delete + set-primary). All wallet
mutations live-update the balance KPI.

**Verified:** Wallet withdraw UGX 25M → review "Balance after 123.5M" → confirm → **balance KPI
148.5M→123.5M live** + toast + bell +1 + new transaction row. Company save → toast + **Audit Trail
entry** (Aisha Nakato · updated · settings · company) + click-to-expand detail. Roles (7 cards +
create), Security (2FA + strength meter + 2 revokable sessions) render. lint + tsc clean; committed in
2 chunks (settings/audit/security + wallet). Dark-mode + responsive throughout.

---

## Admin Live Upgrade — Pass 2 ✅ (all CRUD modals + delete confirmations + expanded panels)

Every admin entity now has full create/edit/delete, each routed through the Pass-1 live engine
(`recordMutation` → revision bump + toast + **system notification** + **audit entry**). Reusable
foundation: **`DeleteConfirmation`** ("This action cannot be undone", used everywhere) and
**`RowActions`** (⋯ menu that stops propagation so it never triggers row-click). Shared form dialogs:
`OwnerFormDialog`, `TenantFormDialog`. Data layer split: `lib/api/admin-mutations.ts` holds
owners/tenants/leases/invoices/expenses/tickets/leads/announcements/staff mutations (re-exported from
`admin.ts`), plus unit CRUD + `getUnitDetail` + `unitOptions`/`tenantOptions` in `admin.ts`.

- **Properties** — create/edit/delete (delete cascades units + leases).
- **Units** — create/edit/delete + a rich **Manage drawer** (tenant/lease/rent status + maintenance
  history + change-status + quick actions).
- **Owners** — add/edit; detail expanded (occupancy stat, **Communication** timeline).
- **Tenants** — add/edit; detail expanded (paid-to-date total, **Communication** tab + complaints).
- **Leases** — create (tenant + vacant-unit selects → unit occupied), edit, renew, **terminate**
  (reason/exit/deposit-refund → unit vacant), delete.
- **Finance** — invoices (generate/edit-status/delete), expenses (log/edit/delete).
- **Maintenance** — create ticket, update status/technician/cost, **close** (resolution required), delete.
- **CRM Leads** — add, edit-stage, **convert to owner/tenant**, delete.
- **Announcements** — delete (composer already notifies).
- **Staff** — real panel (role/dept/status/joined) + **invite** modal + edit + deactivate/reactivate + remove.

Every dialog: RHF + zod, dark-mode-aware, responsive. **Verified live:** Staff invite → list 6→7 +
bell 4→5 + "Invitation sent" toast + "Invited" badge; Property delete → "Delete property?" ("cannot be
undone") → removed + toast + bell +1. lint + tsc clean; committed in 4 chunks.

---

## Admin Live Upgrade (post-Batch-10) — Pass 1 ✅ (dark mode + sidebar polish + live state engine)

Pre-work first: **`fix: dashboard mobile responsiveness + topbar layout`** — root cause of page
overflow was the content column being `flex-1` without `min-w-0`; added it so tables/charts scroll
internally. Topbar right-group flush-right + mobile search Sheet; breadcrumb visible on all viewports
with mobile ellipsis. Verified at 375px across admin + owner.

**Pass 1 delivered:**
- **1A Dark mode** — class-strategy (`.dark` on `<html>`, scoped to dashboard routes by AppShell so
  marketing stays light-only; anti-flash `<script>` in `<head>`). Base tokens overridden in `.dark`;
  new `--surface-elevated` (cards/overlays/bars lift off the darker page) + `--surface-sunken` (page).
  In LIGHT `--surface-elevated == --background` so light is unchanged. Store `lib/stores/theme.ts`
  (persist `nexora-theme`, system default). Toggle in the sidebar footer + Settings (animated sun/moon
  via CSS transform). Charts re-theme (tooltip/donut use `--surface-elevated`). Verified: cards
  `#2D2B28` on page `#1A1A1A`, muted-on-card 5.58:1 + fg 12.95:1 (AA), marketing stays `#F5F5F5`.
- **1B Sidebar polish** — collapsed items get portaled Radix tooltips (escape the overflow clip);
  labels fade/slide in on expand (mount animation); logo crossfade + content-width adjust confirmed.
- **1C Live state engine** — `lib/stores/live.ts` `revision` signal; **`useAsync` subscribes to it**,
  so every mutation re-fetches every list/detail/dashboard/chart at once (no rewrite of pages).
  Property create/update/delete added; all existing mutations (lease renew/terminate, ticket update,
  invoice/expense create, announcement send, lead activity, **marketing lead feed**) route through one
  `recordMutation()` path.
- **1D System notifications + audit** — `recordMutation()` bumps revision **+** writes an audit entry
  (`lib/stores/audit.ts`) **+** pushes a live system notification (`pushSystem`, bell +1). Bell rings
  (keyed-remount CSS `bell-ring`) on new notifications. Toast fired by the caller.
- **Gate demo verified:** Add Property → properties list 16→**17** + bell 4→**5** + toast, then SPA-nav
  to dashboard → Properties KPI **17**; the "Property added" notification tops the (elevated) bell
  dropdown. lint + tsc clean. **Audit viewer arrives in Pass 3.**

---

## Batch 10 — Owner Portal ✅ COMPLETE

Salim Kato's read-first investor portal — calmer than the Admin dashboard, reusing the **same
owner-scoped accessors** proven in the Admin Owners detail. `npm run build` clean; lint + tsc clean.

### Screens (all `/owner/*`)
- **Dashboard** (`/owner`) — 5 KPI count-up tiles (properties, units, blended occupancy, this-month
  revenue, outstanding), revenue + occupancy charts, owner-scoped activity Timeline, and a "your
  properties" hover-lift card row. Verified: 4 properties, UGX 259M/mo, 92% occupancy.
- **My Properties** (`/owner/properties`) — hover-lift cards with subtle thumbnail zoom (CSS transform,
  not Ken-Burns); the 4 owned properties (Nakasero Heights, Entebbe Villas, Kira Gardens, Muyenga
  Heights). Click → detail.
- **Property Detail** (`/owner/properties/[slug]`) — **read-only** (verified: zero edit/assign/add
  controls): hero, occupancy KPIs, unit list, read-only maintenance Timeline. Owner may only view their
  own properties (ownership guard → "not part of your portfolio").
- **Financials** (`/owner/financials`) — **reconciles with admin Owner Detail**: gross revenue
  **UGX 259.5M** (identical), outstanding UGX 40.1M (== dashboard). Fee breakdown 259.488M − 20.759M
  (8%) − 9.35M expenses = **net disbursement UGX 229.4M**. Revenue-vs-expenses chart, date-range
  filter, per-property table, disbursement history.
- **Reports** (`/owner/reports`) — monthly / quarterly / annual statements grouped; Download → toast.
- **Documents** (`/owner/documents`) — property-tied docs (management agreement, title deed, insurance,
  lease) with Flowbite type icons, search/filter, download stubs.
- **Notifications** (`/owner/notifications`) — shared `NotificationsView`, **owner-scoped audience**
  (statements, disbursements, alerts on his properties — no admin noise; bell badge = 3).
- **Profile** (`/owner/profile`) — personal + **sensitive disbursement/bank details**; account number
  is `password`-masked with a show/hide toggle ("•••• •••• 5678"). RHF+zod → toast.
- **Settings** (`/owner/settings`) — notification + delivery-channel **Switch** toggles + display prefs.

### Plumbing
- **Notifications are now audience-scoped.** `notifications.ts` → `notificationsByAudience`
  (admin/owner/tenant); the store gained `setAudience`, which the app shell calls from the signed-in
  role, so the shared topbar bell shows the right set per portal. `NotificationsView` extracted and
  reused by `/notifications` + `/owner/notifications`.
- App-shell profile menu links are role-aware (owner → `/owner/profile`, `/owner/settings`).
- Owner nav Notifications/Settings repointed to `/owner/*`. Sidebar shows exactly the 7 owner sections.
- New accessors: `getOwnerActivity`, `getOwnerFinancials` (both derive from the same property revenue
  + 8% fee as `getOwnerDetail`, so figures reconcile). New primitive used: existing Radix `Switch`.
- Trigger states: loading = latency; empty = filter to none; **error = `?debug=error`** (verified on
  `/owner/documents?debug=error`).

**Review:** log in as `salim@gmail.com` / `123456` → 2FA `123456` → lands on `/owner`. Routes:
`/owner`, `/owner/properties`, `/owner/properties/[slug]`, `/owner/financials`, `/owner/reports`,
`/owner/documents`, `/owner/notifications`, `/owner/profile`, `/owner/settings`. Dev server on **:3007**
(port 3000 was taken by another project this session).

---

## Batch 9 — Admin Dashboard ✅ COMPLETE (Pass A + Pass B)

**Both passes delivered.** Pass A: real credential login, the full reset-password flow, the typed mock
data layer, and the core screens (Dashboard Home, Properties + detail, Tenants + detail) plus compact
identity-scoped Owner/Tenant overviews. Pass B: the remaining ten admin modules — Units, Owners
(+detail), Leases, Finance, Maintenance, CRM/Leads (+detail), Analytics, Announcements, Settings,
Staff — all real and interactive. Later refinements folded in: 2FA required on every login (code
`123456`), logout confirmation modal, and the Nexora logomark favicon. `npm run build` clean.

### Part 0 — real credential login (replaces the demo role selector)
- The demo "Sign in as (role)" `<select>` **and** the topbar "Viewing as {role}" switcher are **removed**
  (`grep "Viewing as|setRole|devRoles"` → 0).
- `lib/api/auth.ts` `login(email, password)` now validates against the seeded user table
  (`lib/mock/db.ts` → `findUser`), throws `InvalidCredentialsError` on mismatch (inline alert + toast),
  and on success stashes the user in `session.pending` and routes to **/2fa**. **2FA (required for
  every sign-in):** `/2fa` verifies a fixed 6-digit code (**123456**), then sets the live session and
  routes via `portalForRole`. Guard note: the 2FA page only bounces to /login when there's no pending
  **and** no signed-in user (so verification, which clears `pending`, doesn't self-redirect).
- **Logout confirmation:** the profile-menu Logout opens a clean confirm Dialog ("Log out? Are you
  sure…") — Cancel / Log out; confirming clears the session → /login.
- **Favicon:** replaced with the Nexora logomark — `src/app/favicon.ico` + `metadata.icons`
  (16/32/apple) + `manifest` from `public/favicon_io/`.
- **Five seed accounts — all password `123456`:**

  | Email | Role | Lands on |
  |-------|------|----------|
  | admin@nexora.co.ug | Super Admin (Aisha Nakato) | /admin — org-wide, all 13 modules |
  | manager@nexora.co.ug | Property Manager (David Okello) | /admin — properties/units/tenants/leases/maintenance/leads |
  | finance@nexora.co.ug | Finance Officer (Grace Namuli) | /admin — finance/owners/analytics + revenue chart only |
  | salim@gmail.com | Owner (Salim Kato) | /owner — his 3 properties only |
  | mubarak@gmail.com | Tenant (Mubarak Aliyu) | /tenant — his unit/lease only |

- Login page keeps clickable **demo-account quick-fill chips** (removed at backend integration).
- Guard unchanged: unauthenticated → /login; profile-menu Logout clears session → /login.

### Part 0b — reset-password flow (complete, on-brand)
`/forgot-password` (email → "Check your email" success, mints a token for real accounts) →
`/reset-password?token=…` (RHF+zod new-password + confirm, **live strength meter** Weak→Strong) →
success toast → `/login`. **Invalid/missing token → a dedicated "Invalid or expired link" state**
with a "Request a new link" action. `isValidResetToken()` gates the form. Reuses the Batch-8 split
auth layout; conditional-render + `tw-animate` entrance (standing rule).

### Part 1 — typed mock data layer (`lib/mock/`, `lib/api/admin.ts`)
- **`lib/mock/types.ts`** — every PRD entity typed: Owner, Property→Building→Unit, Tenant, Lease,
  Invoice, Payment, Expense, MaintenanceTicket, Lead (+activities), Staff, Activity, MockUser.
- **`lib/mock/db.ts`** — **deterministic seeded** generator (mulberry32 + fixed `NOW` 2026-07-10) so
  server & client produce identical data (no hydration drift). Reuses the **9 marketing/portfolio
  properties** + 7 admin-only = **16 properties**, ~50 sampled units, ~30 tenants, leases, ~120
  invoices across 4 monthly cycles, payments, 32 expenses, 26 tickets, 18 leads, 6 staff, activity
  feed. **Identity wiring:** Salim owns `nakasero-heights`, `entebbe-villas`, `kira-gardens`; Mubarak
  rents **unit A-407** in Nakasero Heights under an **active** lease (`ten_mubarak`) with real invoices/
  payments.
- **`lib/api/admin.ts`** — typed **async accessors with simulated latency** (real loading states) and
  identity scoping via `{ ownerId }` / `{ tenantId }` (owner/tenant portals reuse this exact layer).
  Every accessor takes `forceError` — pages read it from **`?debug=error`** (via `debugErrorFlag()`)
  to demonstrate error states. `lib/use-async.ts` drives loading/error/reload.

### Part 2 (Pass A screens)
- **Dashboard Home `/admin`** — 6 KPI tiles (count-up), occupancy (area) + revenue (bar) charts,
  recent-activity Timeline, alerts panel (lease expiries / overdue invoices / urgent tickets).
  **Role-adaptive:** finance sees revenue chart only, PM sees occupancy only, super_admin sees both.
- **Properties `/admin/properties`** — DataTable (search + category + status filters, sort, paginate,
  thumbnail, occupancy bar, status badges), **add-property Dialog** (RHF+zod → toast), row→detail.
- **Property Detail `/admin/properties/[id]`** — hero + tabs **Overview / Buildings & Floors / Units /
  Occupancy (donut) / Documents**, quick actions.
- **Tenants `/admin/tenants`** — DataTable (search + property + status filters), avatar cells,
  row→detail.
- **Tenant Detail `/admin/tenants/[id]`** — profile header + tabs **Overview (lease + activity
  Timeline) / Payments / Invoices / Tickets / Documents**. Mubarak resolves to A-407 / Nakasero.
- **Owner `/owner` + Tenant `/tenant`** — compact **identity-scoped** overviews (KPIs + scoped table/
  lease) proving the data model per user; full portals arrive in Batches 10/11.
- Shared: `components/app/status.tsx` (palette-only StatusBadge/PriorityBadge — no green/red),
  `page-header`, `use-async`. DataTable gained an optional **`onRowClick`**.

### Standing-rule fix found during verification
`CountUp` relied on `useInView` + framer's rAF-driven `animate()`. This preview **throttles
requestAnimationFrame**, so above-the-fold KPIs stuck at 0. Added an **`immediate`** mode (starts on
mount, for dashboard KPIs) **and a `setTimeout` fallback that guarantees the final value** even when
rAF never advances. Hardens every CountUp site-wide.

### Verification (live DOM)
1. All 5 logins work (admin/salim/mubarak via the real form; manager/finance role nav verified);
   **wrong creds → "Incorrect email or password."** Each lands on the right portal.
2. Demo selector + "Viewing as" switcher **gone** (grep clean).
3. Reset flow end-to-end verified: forgot → token link → reset (strength "Strong") → /login; **and**
   `/reset-password` with no token → "Invalid or expired link".
4. Data layer typed; latency drives skeletons; **`/admin/properties?debug=error` → error state** with
   Try-again; nonsense search → empty state.
5. **Identity scoping:** Salim → /owner shows exactly **nakasero-heights, entebbe-villas, kira-gardens**
   (3 props, 80 units); Mubarak → /tenant shows **A-407 · Nakasero Heights**, active lease, rent
   UGX 2.8M, 3 payments. Verified via admin Property/Tenant detail too.
6. Role-awareness: super_admin (13 nav + both charts), property_manager (7 nav), finance_officer
   (4 nav + revenue chart only).
7. Tables show loading + empty + error; detail Tabs switch (Radix — verified via keyboard, real clicks
   work; synthetic `.click()` doesn't in preview); add-property Dialog validates + toasts.
8. `grep lucide` → 0; Flowbite-only; six-token palette; Cinzel titles / Montserrat UI; quiet motion.
9. `npm run build` clean (all `/admin/*`, `/owner`, `/tenant`, reset routes compiled); lint + tsc clean.

### How to review (login per role — all password `123456`, then 2FA code `123456`)
- **admin@nexora.co.ug** → full admin (all modules, both charts)
- **manager@nexora.co.ug** → admin scoped to properties/tenants/leases/maintenance
- **finance@nexora.co.ug** → admin scoped to finance/owners/analytics
- **salim@gmail.com** → Owner portal (his 3 properties)
- **mubarak@gmail.com** → Tenant portal (his A-407 tenancy)
- Trigger states: any admin table with **`?debug=error`** → error; search gibberish → empty; watch
  skeletons on first load.

### Part 2 (Pass B screens) ✅
- **Units** (`/admin/units`) — filter by property/type/status, add-unit dialog (RHF+zod), row-click →
  detail Sheet drawer (tenant, lease, rent).
- **Owners** (`/admin/owners` + `[id]`) — list + detail (Overview/Properties/Disbursements/Documents);
  financial summary + monthly disbursement ledger. **Salim owns 4 properties** (Nakasero Heights,
  Entebbe Villas, Kira Gardens, Muyenga Heights) — admin view == his `/owner` portal (same accessor).
- **Leases** (`/admin/leases`) — filters, expiry-alert banner (`expiring` highlighted in primary),
  create-lease dialog + renew / terminate (mutate mock state → toast, table refetches).
- **Finance** (`/admin/finance`) — Tabs: Invoices (generate dialog, PDF stub), Payments (ledger +
  reconcile stub), Expenses (log dialog), Reports (generator + PDF stubs). KPIs **ladder to the
  Dashboard** — Outstanding == Dashboard outstanding == Billed − Collected == Analytics arrears.
- **Maintenance** (`/admin/maintenance`) — board (Open/Assigned/In-progress/Completed/Closed) +
  table toggle; ticket dialog updates status/technician/cost via `updateTicket`. Tickets tie to real
  units/properties.
- **CRM / Leads** (`/admin/leads` + `[id]`) — table + pipeline; detail with activity Timeline +
  follow-up logging. **Marketing forms feed here live:** `submitLead()` now calls
  `db.addMarketingLead()`, so a public quote/assessment/contact submission appears at the top of the
  CRM as a `new`, `Unassigned`, web-sourced lead.
- **Analytics** (`/admin/analytics`) — occupancy / collection / arrears / avg resolution / retention
  stat cards + revenue-by-property, collection-trend, occupancy-by-category charts; date-range filter;
  export stub.
- **Announcements** (`/admin/announcements`) — broadcast composer (audience: all tenants / property /
  owners / custom; channel chips) + sent-history table; `createAnnouncement` prepends to history.
- **Settings** (`/admin/settings`) — Tabs: Company profile (RHF+zod), Roles overview, Notification
  channel toggles, Integrations placeholders.
- **Staff** (`/admin/staff`) — team list + "coming in Phase 2" banner. Added to the admin nav
  (`UsersGroup` icon).
- Data-layer additions: `getOwnerDetail`, `renewLease` / `terminateLease`, `updateTicket`,
  `createInvoice` / `createExpense`, `getFinanceSummary`, `getAnalytics`, `listAnnouncements` /
  `createAnnouncement`, `addLeadActivity`, `addMarketingLead`, `tenantOptions`. Tenancy generation
  tuned so occupied units mostly hold current leases (retention ≈ 89%, realistic).
- **CountUp** hardened with a `setTimeout` settle fallback (rAF is throttled in preview tabs) + an
  `immediate` mode for above-the-fold KPIs.

### How to trigger the states (review)
- **Loading:** natural — every list has simulated latency (350–800 ms).
- **Empty:** filter to no matches (e.g. Units search "zzz"), or an entity with no rows.
- **Error:** append **`?debug=error`** to any admin route (e.g. `/admin/tenants?debug=error`) → the
  table/section shows "Couldn't load…" + Try again.

---

## Asset Inventory (verified visually — not by filename)

Originals in the `Nexora` root are **read-only**; copies live under `nexora-web/public/`.

### Brand → `public/brand/`

| Source | → Destination | Notes |
|--------|---------------|-------|
| `Logo/svg/logo-black.svg` (595×137) | `logo-primary.svg` | **Primary lockup**, outlined paths. icon `#E08A20` · "Nexora" `#1A1A1A` · descriptor `#4A4844` |
| `Logo/png/logo-black.png` (2379×548) | `logo-primary.png` | transparent raster fallback |
| `files2/Nexora_Logo_Full_White.svg` | `logo-white.svg` | white lockup for hero/dark overlays |
| `Logo/svg/Vector.svg` (207×214) | `icon-mark.svg` | **Icon mark** (`#E08A20`) — favicon, collapsed sidebar, loading |
| `Logo/png/Vector.png` (828×856) | `icon-mark.png` | transparent raster icon |
| `logo-5.jpg` (2160×2700) | `logo-on-orange.jpg` | dark mark on `#E08A20` — for `--primary` surfaces |

Raster lockup background set (kept in root as reference, not all shipped): `logo.jpg` (white),
`logo-2.jpg` (light `#F5F5F5`), `logo-1.jpg` (on photo, white text), `logo-3.jpg` (on `#232220`,
orange+white), `logo-4.jpg` (all-white reversed), `logo-5.jpg` (on orange), `logo-6.jpg`
(monochrome dark); `logomark*.jpg` = icon-only variants; `Group.jpg`/`Vector.jpg` tiny icons.

### Photography → `public/images/properties/`

| Source | → Destination | Dims / orient | Depicts |
|--------|---------------|---------------|---------|
| `image 1.jpg` | `tower-curved-balcony.jpg` | 1966×2458 P | Curved-balcony apartment tower, dusk |
| `image 2.jpg` | `tower-white-woodbalcony.jpg` | 2458×3072 P | White apt, wood balconies, pool deck |
| `image 3.jpg` | `villas-dusk.jpg` | 3556×2000 L | Luxury villas at dusk, cars, reflecting pool |
| `image 4.jpg` | `apartment-facade.jpg` | 2458×3072 P | Grey/glass apartment facade |
| `image 5.jpg` | `tower-poolside.jpg` | 1600×2400 P | White curved-balcony block by pool |
| `image 6.jpg` | `twin-towers-dusk.jpg` | 2048×2560 P | Twin wood-clad towers, star lights |
| `image 23.jpg` | `suburban-house.jpg` | 1280×906 L | Suburban gabled family house |
| `dillon-kydd-*.jpg` | `residential-street.jpg` | 1260×840 L | Suburban street of brick family homes |
| `francesca-tosolini-*.jpg` | `interior-living-room.jpg` | 1262×840 L | Warm living-room interior |
| `avi-waxman-*.jpg` | `aerial-neighbourhood.jpg` | 1122×794 L | Aerial suburban neighbourhood |
| `steven-ungermann-*.jpg` | `villa-infinity-pool.jpg` | 1262×840 L | Modern villa + infinity pool |
| `webaliser-*.jpg` | `villa-garden-pool.jpg` | 1202×900 L | Modern villa + pool, garden |
| `pixasquare-*.jpg` | `villa-minimalist.jpg` | 930×930 sq | Minimalist white cubist villa |

### Reference docs (NOT copied into the app)

`Brochure Review.pdf`, `Nexora_PRD_v1.0.docx`, `Nexora_Website_Design_Brief Confidential.docx`,
`SOW_Designer_Developer_Nexora.docx`, `files/Nexora_Design_Frontend_Playbook.docx`, `PROMPT.md`.

### Notable deviations from the PROMPT.md Asset Map

1. No SVGs in root — canonical vectors are in `Logo/svg/`.
2. Filenames used spaces (`image 1.jpg`), renamed to kebab-case on copy.
3. More photography than mapped: 7 renders + 6 unsplash (only 2 were mapped).
4. A true vector white lockup exists (`files2/Nexora_Logo_Full_White.svg`).
5. Root logos are opaque JPG; transparent versions are `Logo/png/*` / `files/*.png`.
