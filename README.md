# Nexora Property Management — Web Platform

The official marketing website and application dashboards for **Nexora Property Management** — an integrated property management ecosystem based in Kampala, Uganda.

Built as a single Next.js 15 application with two route groups: a public, motion-rich **marketing site** and an authenticated **application** with **four portals** — Admin, Owner, Tenant and (mobile-first) Service Worker.

---

## Project Status — ✅ Complete (frontend, mock-data)

All build batches are complete and the production build passes clean, warning-free.

| Batch | Scope | Status |
|---|---|---|
| 0–2 | Setup, design system, component library | ✅ |
| 3–7 | Marketing site (home, about, services, portfolio, projects, investors, blog, careers, contact, forms) | ✅ |
| 8 | Authentication + role-aware app shell | ✅ |
| 9 | Admin dashboard (16 modules) | ✅ |
| 10 | Owner portal | ✅ |
| 11 | Tenant portal (rent, requests, bookings, documents) | ✅ |
| 12 | Motion polish, responsive QA, performance, accessibility, SEO | ✅ |
| Revisions 1–3 | Brand refresh, 6 services, rental types, public rental browsing, booking + inquiry flows, admin/owner booking modules | ✅ |
| Revision A | Management Agreements module, wallet removed, Financial Overview (agreement-driven commission) | ✅ |
| Revision B | Owner/tenant onboarding + forced password change, 7-step property wizard, owner read-only lockdown, staff module | ✅ |
| Revision C | Enhanced lease statuses (auto expiring/expired), deposit expansion + termination outcomes, Move-Out & Deposit Settlement wizard, tenant lease enhancements | ✅ |
| Revision D | Owner settlement workflow, owner financials restructure, notification coverage, CSV exports + integration modals (zero stubs) | ✅ |
| E1–E5 | Persistence shim, operational staff, service lifecycle, maintenance cost liability, admin password reset + data consistency | ✅ |
| F1 | Three-level admin-managed **Service Catalogue** — nothing about it lives in code; catalogue-driven booking forms; quotations with price snapshotting | ✅ |
| F2 | Slug-based booking route resolution, additional work charges, five payment states, session timeout | ✅ |
| F3 | Maintenance payer routing + owner approval — the "who pays?" decision moved from closure to before any work | ✅ |
| F4 | **Service Worker dashboard** — the fourth portal, mobile-first, with worker accounts, job accept/decline, earnings and admin scheduling-conflict awareness | ✅ |
| F5 | **Currency (UGX + USD)**, Settings across all four portals, financial traceability audit, backend handoff | ✅ |

### Public routes (crawlable)
`/` · `/about` · `/services` + `/services/[slug]` · `/portfolio` + `/portfolio/[slug]` · `/projects` · `/investors` · `/blog` + `/blog/[slug]` · `/careers` · `/contact` · `/request-a-quote` · `/rentals` + `/rentals/[id]` · `/book/cleaning` · `/book/lifestyle`

### App routes (authenticated, noindexed)
- **Auth:** `/login` · `/register` · `/forgot-password` · `/reset-password` · `/verify-email` · `/2fa`
- **Admin:** `/admin` · `/properties` (+`/[id]`) · `/units` · `/owners` (+`/[id]`) · `/tenants` (+`/[id]`) · `/leases` (+`/[id]/move-out`) · `/finance` · `/financial-overview` · `/agreements` (+`/[id]`) · `/maintenance` · `/leads` (+`/[id]`) · `/bookings` · `/service-bookings` · `/analytics` · `/announcements` · `/staff` (+`/[id]`) · `/settings`
- **Owner:** `/owner` · `/properties` (+`/[slug]`) · `/agreement` · `/financials` · `/reports` · `/documents` · `/notifications` · `/settings`
- **Tenant:** `/tenant` · `/lease` · `/payments` · `/maintenance` · `/bookings` · `/documents`
- **Service Worker (mobile-first):** `/worker` (Today) · `/worker/jobs` (+`/[id]`) · `/worker/earnings` · `/worker/profile` · `/worker/settings`
- **Admin (F1–F5 additions):** `/admin/service-catalogue`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, TypeScript, `src/` directory) |
| Styling | Tailwind CSS v4 |
| Components | shadcn/ui (Radix primitives) |
| Animation | Framer Motion |
| Icons | Flowbite Icons (`flowbite-react-icons`) — exclusively, no other icon set |
| Fonts | Cinzel (headings/display) · Montserrat (body/UI) — loaded via `<link>` in the root layout |
| Forms | react-hook-form + zod |
| Data fetching (client) | @tanstack/react-query |
| UI state | Zustand |
| Charts | Recharts |
| Toasts | Sonner |

> The frontend currently runs on a **typed mock data layer** (`src/lib/api/`, `src/lib/mock/`). There is no live backend yet — see [Backend integration](#backend-integration) below.

---

## Getting Started

### Prerequisites

- Node.js 20+ (developed on Node 22)
- npm 10+

### Install & run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Useful scripts

```bash
npm run dev        # start the dev server
npm run build       # production build (stop the dev server first — see note below)
npm run start        # run the production build locally
npm run lint          # ESLint
npx tsc --noEmit       # typecheck only, without a full build
```

> **Windows / local dev note:** running `next build` while the dev server is active can corrupt the `.next` folder (dev and prod artifacts collide). Stop `npm run dev` before running `npm run build`, then restart the dev server afterwards.

---

## Project Structure

```
src/
  app/
    (marketing)/        # public site: home, about, services (+[slug]), portfolio (+[slug]),
                         # projects, investors, blog (+[slug]), careers, contact,
                         # request-a-quote, rentals (+[id]), book/cleaning, book/lifestyle
    (app)/               # authenticated app: auth screens + /admin, /owner, /tenant
    layout.tsx            # root layout — font <link> tags, metadata, favicon
    sitemap.ts / robots.ts # SEO: generated sitemap.xml + robots.txt
  components/
    ui/                    # shadcn/Radix primitives (Button, DataTable, Dialog, …)
    marketing/               # marketing-only sections (hero, footer, forms, …)
    app/                       # dashboard components (sidebar, topbar, page-header, …)
    motion/                     # reusable Framer Motion primitives (Reveal, CountUp, …)
  content/                        # typed marketing copy (home.ts, services.ts, …)
  lib/
    api/                           # mock data access layer + auth
    mock/                           # seeded mock dataset (properties, tenants, leases, …)
    utils.ts
  styles/
    globals.css                       # design tokens (see below) + Tailwind theme
public/
  brand/                                # logo lockups (light/white/on-orange), icon mark
  images/properties/                     # property & interior photography
  favicon_io/                             # favicon + web manifest
```

`PROGRESS.md` in the project root is a running build log — each development batch is documented there with what was built and how it was verified.

---

## Design System

All visual decisions are token-driven — see `src/styles/globals.css`. Do not introduce colors, fonts, or icons outside this system.

**Typography**
- Headings / display: **Cinzel** (400/500/600)
- Body / UI: **Montserrat** (400/500)

**Color tokens** (the only colors used anywhere in the app)

| Token | Hex | Usage |
|---|---|---|
| `--background` | `#F5F5F5` | Page background, card surfaces |
| `--foreground` | `#232220` | Primary text, headings, icons |
| `--muted` | `#565655` | Secondary text, placeholders |
| `--primary` | `#E08A20` | CTAs, active states, links, accents |
| `--accent` | `#4A4844` | Hover/pressed states |
| `--border` | `#D4D4D3` | Dividers, input borders, card outlines |

**Icons:** Flowbite Icons only (`flowbite-react-icons`) — no Lucide, Heroicons, or react-feather.

**Motion:** the marketing site uses a cinematic, scroll-driven motion language (hero slider, parallax, scroll-reveal, count-up stats). The authenticated app (`(app)` route group) intentionally uses a quieter, faster motion language (150–250ms transitions) appropriate for a daily-use dashboard. Both respect `prefers-reduced-motion`.

A known environment quirk: Framer Motion's `animate` prop bound to changing React state, along with CSS `max-height` / `grid-rows` / `transition-[width]` transitions, has proven unreliable in this dev setup. All interactive reveals (accordions, carousels, sidebar collapse, etc.) use **conditional rendering with mount-only animation** instead. Keep this pattern for any new interactive component.

---

## Authentication (demo credentials)

The app currently runs on mocked authentication. Every account uses password **`123456`**, followed by a 2FA step (code **`123456`**).

| Email | Role | Portal |
|---|---|---|
| `admin@nexora.co.ug` | Super Admin | `/admin` |
| `manager@nexora.co.ug` | Property Manager | `/admin` |
| `finance@nexora.co.ug` | Finance Officer | `/admin` |
| `salim@gmail.com` | Owner | `/owner` (owns 4 properties; reconciles with admin Financial Overview) |
| `mubarak@gmail.com` | Tenant | `/tenant` (rents Nakasero A-407) |
| `newowner@test.com` | Owner (onboarding demo) | Forced `/change-password` on first login — temp password **`TempPass-1234`** |
| `sarah.worker@nexora.co.ug` | Service Worker — Cleaning (employee) | `/worker` |
| `fred.worker@nexora.co.ug` | Service Worker — Maintenance (employee) | `/worker` |
| `ronald.worker@nexora.co.ug` | Service Worker — Car Wash (contractor) | `/worker` |

Each portal is guarded: signing in as one role and typing another portal's URL redirects
you to your own. Service workers require 2FA like other staff — they see customer
addresses and phone numbers.

**Branded PDFs (8 types):** Invoice · Receipt · Owner Statement · Lease Agreement ·
Deposit Settlement Statement (Move-Out) · Settlement Statement (owner payout) ·
Service Invoice / Receipt · Maintenance Invoice. **CSV exports** on every admin list
(properties, units, tenants, owners, leases, invoices, payments, expenses, tickets, leads,
bookings, transactions, analytics).

### Currency

Two currencies are supported: **UGX** and **USD**, set per user under Settings in any of
the four portals (they share one preference store).

> **Amounts are displayed in the currency in which they were recorded. Automatic
> conversion is not enabled.** Every financial record stores its own currency; the
> preference governs new records and your own totals only. Exchange-rate behaviour was
> explicitly left undecided by the stakeholder and must not be assumed.

### Backend integration

See **[BACKEND_HANDOFF.md](./BACKEND_HANDOFF.md)** — every mock accessor mapped to the
endpoint it should become, the full data model, workflow endpoints and the business rules
they carry, the payment-gateway integration points, the notification recipient model, and
every placeholder value still awaiting stakeholder input.

### Operational modules

- **Operational Staff** — staff are split into *system users* (have a login) and
  *operational staff* (field workers: cleaners, technicians, drivers — no login).
  Availability, department, assignment counters, and a per-member assignments +
  performance view. Cross-module assignment increments the member's job counter.
- **Service booking financial lifecycle** — pricing is assessment-based by design (there
  is deliberately **no rate card**): request → on-site assessment → invoice → payment →
  work → completion → manager confirmation (with a reject-back path). Service revenue
  only counts once collected.
- **Maintenance cost liability & invoicing** — closing a ticket records *who pays*, not
  just what it cost. Three branches: **Owner** → property expense, deducted from that
  owner's settlement · **Tenant** → invoice raised (`INV-TKT-0019`), payable from the
  tenant portal through the same multi-step flow as rent · **Nexora** → absorbed as an
  operational cost that structurally cannot reach an owner payout. Admin gets liability /
  payment columns, filters and summary cards; the ledger links each figure back to its
  source ticket.
- **Admin-initiated password reset** — Super Admin only. Support can issue a temporary
  credential when a user phones in, gated behind a three-point identity checklist and
  mandatory verification notes that are written into the audit trail. The admin can
  initiate a reset but can **never read an existing password**; the user is forced to
  set a new one on next login.
- **Reset Demo Data** — Super Admin control (Settings) that restores every collection to
  its pristine seed and clears persisted state.

---

## Backend Integration

The frontend is built against the API contract defined in the **Nexora PRD v1.0** (endpoint registry, entity schema, and RBAC matrix). To connect a real backend:

1. Implement the REST API per the PRD's endpoint registry (`/api/v1/...`).
2. Replace the accessors in `src/lib/api/` with real HTTP calls (React Query is already wired for this — swap the mock fetch functions, keep the hooks).
3. Replace mock auth in `src/lib/api/auth.ts` with real JWT-based auth (access + refresh token, HttpOnly cookies) per the PRD.
4. Wire the payment gateway redirect stubs (tenant "Pay Rent" flow) to the real Flutterwave/Stripe integration.

---

## Deployment

### Deploying to Vercel

This is a standard Next.js 15 App Router project — no special configuration is required.

1. **Push to GitHub** (see below), then in Vercel: **Add New → Project → Import** your repository.
2. Vercel auto-detects Next.js. Defaults are correct:
   - **Framework Preset:** Next.js
   - **Build Command:** `next build`
   - **Output Directory:** *(default — leave blank)*
   - **Install Command:** `npm install`
3. Add any environment variables your integration needs (see [Environment Variables](#environment-variables) below) under **Project Settings → Environment Variables**.
4. Deploy. Every push to your main branch will trigger a new production deployment; every pull request gets a preview deployment automatically.

### Environment Variables

The project currently runs entirely on mock data and has **no required environment variables** to build or deploy. As real integrations are wired in, add variables here and in Vercel, for example:

```bash
# .env.local (not committed — see .gitignore)
NEXT_PUBLIC_API_BASE_URL=
NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY=
FLUTTERWAVE_SECRET_KEY=
STRIPE_SECRET_KEY=
```

Create a `.env.local.example` alongside any real `.env.local` so collaborators know what's needed, without committing secrets.

---

## Pushing to GitHub

If this project isn't connected to a remote yet:

```bash
git remote add origin https://github.com/<your-username>/<your-repo>.git
git branch -M main
git push -u origin main
```

> If you're unsure whether this repo is already connected to something else, check first:
> `git remote -v` — it should be empty before adding a new origin.

---

## Project Status

This project is being built in sequential batches (see `PROGRESS.md` for the full log):

- [x] Batch 0 — Project setup & asset audit
- [x] Batch 1 — Design system foundation
- [x] Batch 2 — Core component library
- [x] Batch 3 — Marketing layout shell (header, footer, WhatsApp)
- [x] Batch 4 — Homepage
- [x] Batch 5 — About & Services
- [x] Batch 6 — Portfolio & Projects
- [x] Batch 7 — Investors, Blog, Careers, Contact + lead forms
- [x] Batch 8 — Authentication & app shell
- [x] Batch 9 — Admin Dashboard
- [ ] Batch 10 — Owner Portal
- [ ] Batch 11 — Tenant Portal
- [ ] Batch 12 — Motion polish, responsive QA, performance & accessibility

---

## License

Proprietary — Nexora Property Management / Starnova Labs. Not for redistribution.