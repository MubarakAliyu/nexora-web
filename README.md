# Nexora Property Management — Web Platform

Premium, motion-rich marketing website + authenticated dashboards (Admin, Owner, Tenant)
for **Nexora Property Management** (a Groupe M-Zi Inc. company). Built by Starnova Labs.

## Tech stack

- **Next.js 15** (App Router, TypeScript, `src/` directory)
- **Tailwind CSS v4** + **shadcn/ui**
- **Framer Motion** (animation)
- **Flowbite Icons** (`flowbite-react-icons`) — the only icon set
- **React Query** (server state) + **Zustand** (UI state)
- **react-hook-form** + **zod** (forms & validation)

## Design system (locked)

- **Fonts:** Cinzel (headings) + Montserrat (body), loaded via `<link>` in the root layout head.
- **Palette (the only colours allowed):**
  `--background #F5F5F5` · `--foreground #232220` · `--muted #565655` ·
  `--primary #E08A20` · `--accent #4A4844` · `--border #D4D4D3`. Never `#000000`.
- Tokens are defined in `src/styles/globals.css`; every component references them.

## Getting started

```bash
npm install        # install dependencies
npm run dev        # start the dev server at http://localhost:3000
npm run build      # production build
npm run start      # serve the production build
npm run lint       # eslint
```

## Project structure

```
src/
  app/
    (marketing)/      # public marketing site (Batches 3–7)
    (app)/            # authenticated dashboards (Batches 8–11)
    layout.tsx        # root layout: font <link> tags, html/body
    page.tsx          # temporary landing (replaced in Batch 4)
  components/
    ui/               # shadcn primitives + design-system components
    marketing/        # marketing-only components
    app/              # dashboard components
    motion/           # reusable Framer Motion wrappers
  content/            # typed marketing content (services, stats, projects…)
  lib/
    api/              # data-access layer (mocked; Django REST later)
    utils.ts          # cn() class merge helper
  styles/
    globals.css       # design tokens live here
public/
  brand/              # logo variants + icon mark
  images/properties/  # property & interior photography
  images/og/          # social share images (generated in Batch 12)
```

## Build protocol

Work proceeds in batches **0 → 12** (see `PROGRESS.md` and the root `PROMPT.md`).
Each batch must build clean (`npm run build` + `npm run lint`) before the next begins.
