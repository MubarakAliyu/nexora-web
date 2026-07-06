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
