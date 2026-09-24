# Interactive Decision Storytelling

Orbit flagship: a reusable system for turning complex data, AI, analytics, and business problems into interactive experiences that help people understand and decide.

**Not** “a scrollytelling side feature.” Positioning: [`docs/FLAGSHIP.md`](./docs/FLAGSHIP.md).

Two artifacts:

1. **The engine** — schema-driven runtime, sticky scenes, visual registry, deterministic sims, validation, evidence provenance.
2. **The reference story** — [*When Rates Rise*](http://localhost:3000/stories/when-rates-rise): where should a portfolio manager cut?

Future host: an Orbit portfolio teaser (first section after the title) that opens the flagship landing at `/stories`. Stories are rows there; each essay is `/stories/[slug]`. This repo stays standalone until packaging.

## Stack

- Next.js 16 · React 19 · TypeScript
- Tailwind CSS 3 (Orbit-parity OKLCH tokens)
- framer-motion (non-essential transitions)
- react-scrollama (step enter)
- Zod (manifest validation)

## Quick start

```bash
npm install
npm run validate:stories
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — flagship landing — then `/stories/when-rates-rise`.

Reproduce the book shock figures:

```bash
npx tsx scripts/run-rate-buffer-sim.ts
```

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local Next.js server |
| `npm run build` | Production build |
| `npm run validate:stories` | Zod-validate manifests + allowlist/grammar parity |
| `npm run test:unit` | Vitest (sim, resolveScene, schema) |
| `npm run test:e2e` | Playwright + axe (port 3100; `npx playwright install chromium` once) |
| `npm run test:engine` | validate + unit + build + e2e |
| `npm run lint` | ESLint |
| `npm run freeze:evidence` | Write `data/figures/when-rates-rise.v2.json` |

## How to add a decision story

1. Write a Decision Spec (Question, Evidence, Model, Mechanism, Uncertainty, Scenarios, Decision frame) before code.
2. Add `src/stories/manifests/{slug}.json` with matching `meta.slug`.
3. Keep `meta.templateId` as `scrolling-narrative` until a second template is earned.
4. Use allow-listed `visualId` / `visualState` from `src/stories/schemas/visualAllowlist.ts`.
5. Register any new visual in `VISUAL_REGISTRY` + allowlist — never eval component names from the manifest.
6. Run `npm run validate:stories`.

## Docs

- [`docs/FLAGSHIP.md`](./docs/FLAGSHIP.md) — product positioning
- [`docs/reference-story-spec.md`](./docs/reference-story-spec.md) — reference decision story
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — layers and runtime
- [`.state/`](./.state/) — agent working memory

## Scope (deferred)

Five speculative templates, weekly auto-publish, “AI-powered storytelling” branding, chart libraries, Mermaid, GSAP, Python pipelines, Orbit packaging — until extracted from real decision stories.
