# Nexora Web — Build Progress

Running log of completed batches (0 → 12), per `PROMPT.md`.

---

## ⚠ STANDING RULE — icons

`components.json` has `iconLibrary: "lucide"` (shadcn CLI default), but **`lucide-react` must NEVER
be imported anywhere in this codebase.** When shadcn components are added in Batch 2, every default
icon they ship with must be **rewired to Flowbite** (`flowbite-react-icons/outline` · `/solid`).
Grep for `lucide` before every batch gate — it must return zero hits in `src/`.

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
