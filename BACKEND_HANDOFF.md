# Nexora — Backend Handoff

**Frontend status:** complete against a typed mock data layer. Every screen, flow and
state you see working in the app is real UI driven by real logic — only the persistence
and transport are mocked.

**What this document is for:** letting you build the API without reading the frontend.
Every mock accessor below maps to the endpoint it should become. Where the frontend
encodes a business rule, that rule is called out, because several of them were decided
in the 27 August stakeholder meeting and are not obvious from the data model.

**How the mock works today.** `src/lib/mock/db.ts` builds a deterministic seed
(mulberry32, fixed `NOW = 2026-07-10T08:00:00Z`). `src/lib/mock/persistence.ts` is a
localStorage shim that hydrates/persists those arrays so runtime records survive a
reload. `src/lib/api/*` are the typed accessors the UI calls. **Deleting the shim and
turning each accessor into a `fetch` should be the whole migration** — no component
knows where its data comes from.

---

## 1. Contents

1. [Contents](#1-contents)
2. [Data model](#2-data-model)
3. [Endpoint map](#3-endpoint-map)
4. [Workflow endpoints](#4-workflow-endpoints-not-crud)
5. [The live state engine contract](#5-the-live-state-engine-contract)
6. [Notifications](#6-notifications)
7. [Currency](#7-currency)
8. [Payments](#8-payment-gateway-integration)
9. [Sessions and auth](#9-sessions-and-auth)
10. [Placeholders awaiting stakeholder input](#10-placeholders-awaiting-stakeholder-input)
11. [Known limitations](#11-known-limitations)

---

## 2. Data model

Full field-level definitions live in `src/lib/mock/types.ts` — that file is the
authoritative schema and is worth reading alongside this section. Relationships:

### Core property graph

| Entity | Key relationships |
|---|---|
| `Owner` | has many `Property`; has one `ManagementAgreement`; has many `SettlementRecord` |
| `Property` | belongs to `Owner`; has many `Unit`; has many `Expense` |
| `Unit` | belongs to `Property`; has zero-or-one active `Lease` |
| `Tenant` | has many `Lease`; has many `Invoice`, `Payment`, `MaintenanceTicket` |
| `Lease` | `unitId`, `tenantId`, `propertyId`; drives rent `Invoice` generation |

### Financial records

**Every one of these carries a `currency` field** (§7) and **every one links to its
originating record** — this was audited explicitly and is a hard requirement:

| Entity | Links to its origin via |
|---|---|
| `Invoice` | `leaseId` · `maintenanceTicketId` · `serviceBookingId` · `additionalChargeId` |
| `Payment` | `invoiceId` (+ `serviceBookingId`, `maintenanceTicketId`, `additionalChargeId`) |
| `Expense` | `propertyId` + `maintenanceTicketId` |
| `SettlementRecord` | `ownerId` + `agreementId` + `period` / `periodStart` / `periodEnd` |
| `Quotation` | `bookingId` + `serviceTypeId` |
| `AdditionalCharge` | `bookingId` (and `invoiceId` once accepted) |
| `WorkerEarning` | `staffId` + `sourceType`(`service_booking`\|`ticket`) + `sourceId` + `payoutId` |
| `WorkerPayout` | `staffId`; the jobs it covers are the earnings whose `payoutId` matches |

> ⚠️ **`Expense.propertyId` is deliberately EMPTY for Nexora-absorbed maintenance
> costs.** Owner settlements deduct expenses by filtering on the owner's property IDs,
> so an absorbed cost with no `propertyId` **cannot** reach a payout — the exclusion is
> structural rather than procedural. The originating property is still recoverable from
> `description` and `maintenanceTicketId`. There is a comment saying "DO NOT FIX THIS"
> at the write site. Please preserve this property in the backend.

### Service catalogue (three levels)

`ServiceType` → `ServiceCategory` → `CatalogueItem`.

**Nothing about the catalogue may live in code.** The public booking forms build
themselves from these tables — categories become form sections, `selectionMode` decides
single/multi/quantity, `CatalogueItem.price` is the price shown. There are no hardcoded
service lists, prices or switch statements anywhere in the frontend, and there must not
be any in the backend either.

### Staff and workers

`Staff` covers both `system_user` (platform login, has a `Role`) and
`operational_staff` (field workers, created in E2 without logins). F4 added
`hasPortalAccess`, `userId`, `workerType` (`employee`\|`contractor`) and
`availabilitySchedule` (7 rows of `{day, available, start, end}`).

---

## 3. Endpoint map

Format: **mock accessor** → suggested endpoint. `A` = async (a real call today), `S` =
synchronous derived read (may become a computed field, a query param, or stay
client-side).

### `auth.ts`

| Accessor | Endpoint |
|---|---|
| `login(email, password)` | `POST /auth/login` → `{ token, user }`; `user` carries `role`, `ownerId?`, `tenantId?`, `staffId?`, `requiresPasswordChange?` |
| `verifyTwoFactor(code)` | `POST /auth/2fa/verify` |
| `changePassword(current, next)` | `POST /auth/password/change` |
| `register(...)` | `POST /auth/register` |
| `requestPasswordReset(email)` | `POST /auth/password/forgot` |
| `isValidResetToken(t)` | `GET /auth/password/reset/{token}` |
| `resetPassword(token, next)` | `POST /auth/password/reset` |
| `verifyEmail(token)` | `POST /auth/email/verify` |

### `admin.ts` — reads

`getDashboardStats` `GET /dashboard/stats` · `getActivity` `GET /activity` ·
`getAlerts` `GET /alerts` · `getOccupancySeries` / `getRevenueSeries`
`GET /analytics/{series}` · `listProperties` `GET /properties` · `getProperty`
`GET /properties/{id}` · `getPropertyUnits` `GET /properties/{id}/units` ·
`getPropertyTenants` `GET /properties/{id}/tenants` · `listUnits` `GET /units` ·
`getUnitDetail` `GET /units/{id}` · `listOwners` `GET /owners` · `getOwner`
`GET /owners/{id}` · `getOwnerDetail` / `getOwnerSnapshot` / `getOwnerActivity` /
`getOwnerFinancials` `GET /owners/{id}/{detail|snapshot|activity|financials}` ·
`listTenants` `GET /tenants` · `getTenant` `GET /tenants/{id}` · `listLeases`
`GET /leases` · `getLeaseDetail` `GET /leases/{id}` · `listInvoices` `GET /invoices` ·
`listPayments` `GET /payments` · `listExpenses` `GET /expenses` · `getFinanceSummary`
`GET /finance/summary` · `listTickets` `GET /maintenance/tickets` · `listLeads`
`GET /leads` · `getLead` `GET /leads/{id}` · `listStaff` `GET /staff` ·
`getStaffMember` `GET /staff/{id}` · `listAnnouncements` `GET /announcements` ·
`getAnalytics` `GET /analytics` · `listRoles` `GET /roles`

`staffOptions` / `serviceStaffFor` / `maintenanceStaff` / `propertyOptions` /
`unitOptions` / `tenantOptions` / `ownerOptions` are dropdown feeds — either
`GET /staff?assignableFor=…` style filters, or keep client-side over a cached list.
`propertyName` / `ownerName` / `tenantName` / `unitLabel` are pure lookups.

### `admin-mutations.ts` — plain CRUD

`createOwner` / `updateOwner` → `POST|PATCH /owners` · `createTenant` / `updateTenant`
→ `POST|PATCH /tenants` · `createLease` / `updateLease` / `deleteLease` →
`POST|PATCH|DELETE /leases` · `updateInvoice` / `deleteInvoice` →
`PATCH|DELETE /invoices/{id}` · `updateExpense` / `deleteExpense` →
`PATCH|DELETE /expenses/{id}` · `createTicket` / `deleteTicket` →
`POST|DELETE /maintenance/tickets` · `createLead` / `updateLead` / `deleteLead` →
`POST|PATCH|DELETE /leads` · `deleteAnnouncement` → `DELETE /announcements/{id}` ·
`inviteStaff` / `updateStaff` / `removeStaff` → `POST|PATCH|DELETE /staff` ·
`addOperationalStaff` / `updateOperationalStaff` / `removeOperationalStaff` →
same collection, `staffType=operational_staff` · `createRole` / `updateRole` /
`deleteRole` → `POST|PATCH|DELETE /roles` · `saveSettingsSection` →
`PATCH /settings/{section}`

Also here: `createProperty` / `updateProperty` / `deleteProperty`, `createUnit` /
`updateUnit` / `deleteUnit`, `createInvoice`, `createExpense`, `createAnnouncement`,
`addLeadActivity` (all in `admin.ts`) — plain CRUD.

### `catalogue.ts`

CRUD: `createServiceType` / `updateServiceType` / `deleteServiceType`,
`createCategory` / `updateCategory` / `deleteCategory`, `createItem` / `updateItem` /
`deleteItem` / `duplicateItem` → `POST|PATCH|DELETE /catalogue/{types|categories|items}`.

Reads: `listServiceTypes` `GET /catalogue/service-types` · `catalogueTree`
`GET /catalogue/service-types/{id}/tree` · `serviceTypeBySlug`
`GET /catalogue/service-types?slug=` · `resolveBookingServiceType` — **slug-based route
resolution** (F2), see §4.

Bulk: `previewBulkPrice` / `applyBulkPrice` → `POST /catalogue/bulk-price/{preview|apply}` ·
`exportCatalogueRows` `GET /catalogue/export` · `previewImport` / `applyImport` →
`POST /catalogue/import/{preview|apply}`.

### `rentals.ts`

`listRentals` `GET /rentals` · `getRentalDetail` `GET /rentals/{id}` · `getRentalFacets`
`GET /rentals/facets` · `createBooking` `POST /bookings` · `createRentalInquiry`
`POST /inquiries` · `createServiceBooking` `POST /service-bookings` ·
`listBookings` / `listServiceBookings` / `listBookingRows` / `getRecentBookings` /
`getActiveBookingCount` / `listBookingsForEmail` → `GET /bookings`,
`GET /service-bookings` with filters · `getBookingDetail` / `getServiceBooking`
`GET /{bookings|service-bookings}/{id}` · `updateBookingStatus` /
`updateServiceBookingStatus` / `updateInquiryStage` → `PATCH …/status` ·
`assignServiceBooking` `POST /service-bookings/{id}/assign`

### `finance.ts` / `settlement.ts` / `agreements.ts`

`getFinancialKpis` `GET /finance/kpis` · `getRevenueBreakdown`
`GET /finance/revenue-breakdown` · `listFinancialTransactions` `GET /finance/transactions`
· `listOwnerSettlements` `GET /settlements` · `computeOwnerSettlement`
`GET /settlements/preview?ownerId=&period=` · `processSettlement`
`POST /settlements` · `listSettlements` `GET /settlements` ·
`fetchAgreements` / `fetchAgreementById` / `fetchAgreementByOwner`
`GET /agreements[/{id}]` · `createAgreement` / `updateAgreement` /
`terminateAgreement` / `deleteAgreement` → `POST|PATCH|DELETE /agreements` ·
`fetchAgreementFinancials` `GET /agreements/{id}/financials`

`commissionForAgreement`, `monthlyCommission`, `effectiveRate`, `ownerGrossRevenue`,
`ownerExpenses` are the settlement maths — **move these server-side**; the frontend
should read computed figures, not recompute money.

### `worker.ts` / `worker-jobs.ts` / `assignment.ts`

| Accessor | Endpoint |
|---|---|
| `grantPortalAccess(staffId, {email, workerType})` | `POST /staff/{id}/portal-access` → `{ tempPassword, email }` |
| `revokePortalAccess(staffId)` | `DELETE /staff/{id}/portal-access` (staff record RETAINED) |
| `setWorkerAvailability(staffId, status)` | `PATCH /staff/{id}/availability` |
| `saveAvailabilitySchedule(staffId, rows)` | `PUT /staff/{id}/availability-schedule` |
| `updateWorkerContact(staffId, patch)` | `PATCH /me/contact` (self-service; actor is the worker) |
| `jobsForWorker` / `jobsToday` / `jobsUpcoming` / `jobsOverdue` | `GET /me/jobs?scope=` |
| `jobById` | `GET /me/jobs/{id}` |
| `acceptJob` / `declineJob(reason)` | `POST /me/jobs/{id}/{accept|decline}` |
| `startJob` / `completeJob(workDone, notes, photos)` | `POST /me/jobs/{id}/{start|complete}` |
| `earningsFor` / `earningsSummary` / `availableBalance` | `GET /me/earnings` |
| `payoutsFor` / `earningsForPayout` | `GET /me/payouts`, `GET /payouts/{id}/earnings` |
| `requestPayout(amount, methodNote)` | `POST /me/payouts` |
| `backfillEarnings` | server-side on grant — see §4 |
| `assignmentOptions` / `serviceAssignmentOptions` | `GET /staff/assignable?date=&kind=` returning load + conflicts |

### `notifications.ts` / `password-reset.ts` / `payment-states.ts`

`GET /notifications?audience=&recipientStaffId=`, `POST /notifications/{id}/read`,
`POST /notifications/read-all` · `resetUserPassword` `POST /users/{id}/password/reset`
(admin-initiated, returns a temp password) · `verifyPayment` / `rejectPayment` /
`checkPaymentStatus` → §8.

---

## 4. Workflow endpoints (not CRUD)

These carry business rules. Modelling them as PATCHes on a status field will lose the
rules.

### Maintenance payer routing and owner approval (F3)

The 27 Aug meeting moved "who pays?" from **closure** to **after assessment, before any
work**. Enforce this server-side; the frontend gates it but the frontend is not the
authority.

```
POST /maintenance/tickets/{id}/assessment
     { assessedBy, assessedAt, labour, materials, notes }
     → status: assessed

POST /maintenance/tickets/{id}/route
     { chargeTo: 'tenant'|'owner'|'nexora', reason, overrideReason?, invoiceDueDate? }
     → tenant  : raises an Invoice, status awaiting_tenant_payment
       owner   : ≥ threshold → awaiting_owner_approval; < threshold → scheduled
       nexora  : scheduled, no invoice, no approval record

POST /maintenance/tickets/{id}/{approve|decline}   { reason }   (owner only)
POST /maintenance/tickets/{id}/reminder            (admin nudge)
POST /maintenance/tickets/{id}/close
     { resolution, labourCost, materialsCost, liability, liabilityReason,
       liabilityChangeReason?, invoiceDueDate? }
```

**Status machine** (`TICKET_TRANSITIONS` in `maintenance-routing.ts` is the source of
truth — mirror it):

```
open → assigned | closed
assigned → assessed | closed
assessed → awaiting_owner_approval | awaiting_tenant_payment | scheduled | closed
awaiting_owner_approval → owner_approved | owner_declined
owner_approved → scheduled
owner_declined → closed
awaiting_tenant_payment → closed          ← NOT scheduled
scheduled → in_progress | closed
in_progress → completed | closed
completed → closed | in_progress
closed → (terminal)
```

> `awaiting_tenant_payment` deliberately cannot transition to `scheduled` by hand.
> **Payment is the gate that releases the work** — only the payment endpoint may move
> it, which stops work starting on an unpaid charge.

**Closure must reconcile, not re-issue.** By the time a tenant-liable ticket closes,
the invoice usually exists and is usually already PAID (that payment is what released
the work). Re-raising it double-bills the tenant and erases collected money from
revenue reporting. Update the existing invoice's amount, recompute paid/outstanding,
and preserve the payment.

**Three financial branches at closure** — these are the money paths and must not drift:

| `liability` | Effect |
|---|---|
| `owner` | creates an `Expense` on the property → reduces that owner's settlement |
| `tenant` | reconciles/raises an `Invoice` → collected money is Nexora revenue |
| `nexora` | creates an `Expense` with **empty `propertyId`** → reaches nobody |

### Service booking lifecycle (E3/F1)

```
POST /service-bookings/{id}/assessment    { assessedBy, scope, amount, notes }
POST /service-bookings/{id}/invoice       { amount, due }
POST /service-bookings/{id}/payment       { amount, method, reference }
POST /service-bookings/{id}/start
POST /service-bookings/{id}/complete      { notes, completedBy, photos }
POST /service-bookings/{id}/confirm       ← MANAGER confirms; only now is the customer told
POST /service-bookings/{id}/reject        { reason }
POST /service-bookings/{id}/cancel        { reason }
```

**The worker completes; a manager confirms.** F4 let workers mark jobs complete from
their own portal — it calls the same `complete` endpoint, and the manager confirmation
step still stands between "worker says done" and "customer told done". Do not collapse
these two.

### Quotations (F1) — price snapshotting

```
POST /bookings/{id}/quotation/accept   { serviceTypeId, lines[] }
```

**Every line stores `unitPriceAtBooking`.** If an admin reprices a catalogue item
tomorrow, an already-accepted quotation must not silently rewrite itself — that is an
accounting problem, not a display quirk. Nothing in a `Quotation` is ever recomputed
from the live catalogue. This is verified end-to-end in the frontend test suite and
should have a backend test too.

### Additional work charges (F2)

```
POST /service-bookings/{id}/additional-charges          { description, justification,
                                                          items[]|customAmount }
POST /additional-charges/{id}/accept   { method, recordedBy }   ← raises an Invoice
POST /additional-charges/{id}/decline  { reason }
POST /additional-charges/{id}/pay      { amount, method, reference }
POST /additional-charges/{id}/cancel
```

**INVARIANT: the original booking and its accepted quotation are never mutated by this
flow.** That is what keeps "the customer agreed to X" true after the fact. Extra work
becomes its own record, linked to the booking.

Hourly billing for extra work was **considered and rejected** at the 27 Aug meeting.

### Worker portal access (F4)

```
POST /staff/{id}/portal-access  { email, workerType }
```
Creates a login for an **operational staff** record only (never a system user), issues
a temporary password with `requiresPasswordChange`, and **backfills earnings for work
they already completed** — E2 staff have been working for months before anyone gives
them a login, and without the backfill their Earnings screen opens empty. Make the
backfill idempotent by `sourceId` so re-granting after a revoke does not double-pay.

### Settlements (Rev D)

```
POST /settlements   { ownerId, period }   → SettlementRecord
```
Net payout = gross − commission − expenses, all derived from the owner's
`ManagementAgreement`. **No hardcoded rates** — four contract types
(`revenue_sharing`, `fixed_fee`, `hybrid`, `flat_rate`).

---

## 5. The live state engine contract

Every mutation in the frontend runs through `recordMutation` (`src/lib/api/actions.ts`),
which fires four things at once: a live-revision bump (re-renders every open view), a
toast, a notification, and an audit entry.

**What the frontend needs back from a mutation:**

```jsonc
{
  "data": { /* the updated entity, complete — not a partial patch */ },
  "audit": {
    "actor":      "Aisha Nakato",
    "action":     "status_changed",       // created|updated|deleted|status_changed|renewed|terminated
    "entityType": "ticket",
    "entityId":   "tkt_123",
    "entityName": "TKT-0028",
    "summary":    "Human-readable sentence shown verbatim in the audit trail",
    "before":     { "status": "assessed" },
    "after":      { "status": "awaiting_owner_approval" }
  },
  "notifications": [ /* see §6 */ ]
}
```

`summary` is displayed to users, not just logged — write it as a sentence. `before`/
`after` power the audit diff view.

If you prefer notifications to arrive over a socket rather than in the mutation
response, the frontend can adapt; what it cannot do is invent the audit summary, which
is why that comes from the server.

---

## 6. Notifications

```jsonc
{
  "id": "…", "type": "payment|maintenance|lease|announcement|system",
  "title": "…", "body": "…",
  "channel": "in_app|email|sms", "status": "sent|read",
  "sent_at": "ISO", "read_at": "ISO|null",
  "audiences": ["admin"],          // omit = everyone
  "recipientStaffId": "stf_ops_3", // omit = everyone in the audience
  "entityType": "ticket", "entityId": "tkt_123", "action": "updated", "actor": "…"
}
```

**Two levels of scoping, and both matter.**

`audiences` restricts to `admin` / `owner` / `tenant` / `worker`. The rule the frontend
follows: **operational records are `["admin"]` by default**, and every party-facing
message is a *separate* notification written in that party's voice. This is not
cosmetic — an owner's reason for declining a repair reaching the tenant could damage a
tenancy, and Nexora's model rests on owners and tenants never dealing with each other
directly.

`recipientStaffId` narrows to ONE person within an audience. `worker` is an audience of
every service worker, but a job notification is about one worker's job — without this,
every worker's feed carries every other worker's job references.

Notification queries therefore need **both** filters:
`GET /notifications?audience=worker&recipientStaffId=stf_ops_3`.

---

## 7. Currency

Two currencies: **UGX and USD** (the 27 Aug minutes: "especially because short-term
rental customers and property owners may be international").

- **Every financial record stores the currency it was recorded in.**
- **There is NO automatic conversion.** The minutes: exchange-rate behaviour "was not
  defined and must not be assumed". An invoice raised in UGX is displayed as UGX to a
  user whose preference is USD. Do not add an FX layer without a decision.
- The user's currency preference governs **new records** and their own unscoped totals
  — nothing else.
- Totals that span records of mixed currency are **undefined** today. All seeded data is
  UGX, so this has not bitten yet. When you implement reporting, either group by
  currency or make the caller pass one — do not sum across.

If FX is later approved, the right shape is a rate table with an `asOf` timestamp and a
rate stored **on each converted line**, so historical documents stay reproducible.

---

## 8. Payment gateway integration

The frontend models **five** payment states and only one of them marks an invoice paid:

| Frontend state | Invoice effect | Typical provider status |
|---|---|---|
| `successful` | **paid** | `success` / `completed` |
| `pending` | not paid | `pending` / `processing` |
| `requires_verification` | not paid, enters the admin verification queue | `pending_review` |
| `failed` | not paid, `failureReason` shown | `failed` / `declined` |
| `cancelled` | not paid | `cancelled` / `abandoned` |

> Money that has not been confirmed is not money. `pending` and
> `requires_verification` deliberately leave the invoice unpaid.

**Integration points:**

```
POST /payments/initialize   { invoiceId, amount, method, currency }
                            → { providerReference, redirectUrl? }
POST /payments/{id}/verify         ← admin action on the verification queue
POST /payments/{id}/reject         { reason }
GET  /payments/{id}/status         ← poll; maps provider status → the five states
POST /webhooks/payments            ← provider callback, idempotent by providerReference
GET  /payments/reconcile?from=&to= ← end-of-day reconciliation
```

Store `providerReference`, `providerStatus` (raw, so support can quote it back) and
`stateChangedAt`. The frontend already renders all of these.

**Provider is not chosen yet** — see §10.

A successful maintenance-charge payment must also **release the work**
(`awaiting_tenant_payment` → `scheduled`) and notify admin + the assigned worker.

---

## 9. Sessions and auth

- **2FA is required** for all staff roles including `service_worker` — workers see
  customer addresses and phone numbers.
- Roles: `super_admin`, `ops_manager`, `property_manager`, `maintenance_officer`,
  `finance_officer`, `owner`, `tenant`, `service_worker`.
- `portalForRole()` maps role → `/admin` | `/owner` | `/tenant` | `/worker`. The
  frontend enforces a portal guard, **but the backend must enforce it too** — a worker
  must not be able to read `/api/properties` regardless of what the UI does.
- `requiresPasswordChange` forces the change-password screen before any dashboard route.
- **Session expiry: the frontend shows a warning 2 minutes before, but the backend owns
  actual validity.** The frontend timeout duration is a placeholder (§10). Return
  `401` with a distinguishable body for "expired" vs "invalid" so the UI can tell the
  user which happened.

---

## 10. Placeholders awaiting stakeholder input

Every one of these is a real value the frontend needs and does not have. They are all
flagged in the UI with the words "pending stakeholder confirmation".

| # | Placeholder | Current value | Where |
|---|---|---|---|
| 1 | **Service price catalogues** | Seeded demo prices, all marked `pricesConfirmed: false` | `/admin/service-catalogue` shows a "Placeholder pricing in use" banner |
| 2 | **Owner approval threshold** | `UGX 500,000` | `DEFAULT_OWNER_APPROVAL_THRESHOLD`; admin-editable, persisted |
| 3 | **Worker rates / Nexora fee split** | `WORKER_SHARE_RATE = 0.35` | `lib/api/worker.ts` |
| 4 | **Session timeout duration** | 30 min, 2-min warning | `SESSION_TIMEOUT_MINUTES` |
| 5 | **Payment provider** | Simulated; five states modelled, no provider chosen | `lib/api/payment-states.ts` |
| 6 | **FX behaviour** | None — no conversion, by instruction | §7 |
| 7 | **Service Officer vs Service Worker** | "Service Worker" used throughout | Naming left open at the meeting |

---

## 11. Known limitations

**Non-tenant service customers have no accounts.** Someone who books a cleaning from the
marketing site is not a tenant and cannot log in. Their quotation acceptance, their
additional-charge approvals and their payments are therefore **recorded by an admin on
their behalf**, with the response method (`phone` / `email` / `whatsapp` / `in_person`)
and the recording staff member captured in the audit trail as evidence the approval
actually happened.

This works, and the audit trail is honest about it. But it means a real customer cannot
see their own quotation or pay their own invoice. **Recommended future phase:** a
lightweight customer account — or a signed magic link per booking, which avoids
passwords entirely and would suit one-off customers better.

Two smaller ones:

- **Photo upload is stubbed** across assessments, job completion and maintenance
  requests, pending file storage. The UI says so where it appears.
- **Assignment conflict detection is a frontend convenience only.** It warns, it does
  not block, and it cannot serialise two admins assigning the same worker at once.
  The backend should own real validation.
