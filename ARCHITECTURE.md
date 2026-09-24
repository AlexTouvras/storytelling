# Architecture

## Purpose

**Interactive Decision Storytelling** — Orbit’s flagship system for turning complex data, AI, analytics, and business problems into interactive experiences that help people understand and decide. Canonical product positioning: `docs/FLAGSHIP.md`.

Two artifacts: (1) the reusable **engine**, (2) the **reference decision story** (`when-rates-rise`). The story is the interface; the product is a reasoning process (Question → Evidence → Model → Mechanism → Uncertainty → Scenarios → Visual narrative → Decision frame).

Future host: Orbit portfolio teaser (first section after the title) → flagship landing at `/stories` → essay at `/stories/[slug]`. New stories are rows on `/stories`. Do not overload Orbit’s prose `/writes` MDX model.

## Three layers

```text
Layer 3  Decision Stories   when-rates-rise, …
Layer 2  Story Grammar      reveal / transform / compare / … (earned from stories)
Layer 1  Story Engine       sticky + Scrollama + registry + validation + a11y
```

Do not invent five templates before extracting grammar from real decision stories. First extract: `docs/STORY_GRAMMAR.md`.

## Runtime (Layer 1)

```text
manifests (JSON)  →  Zod schema  →  template registry  →  StoryLayout
                                                              ├─ ScrollSceneProvider + StoryScrollama (react-scrollama)
                                                              ├─ StoryStep / StorySection (step enter → section id)
                                                              ├─ StickyVisual (CSS sticky; same path all breakpoints)
                                                              └─ SceneRenderer (allow-listed visuals)
```

| Layer | Path | Role |
|-------|------|------|
| Flagship | `docs/FLAGSHIP.md` | Product positioning |
| Spec | `docs/reference-story-spec.md` | Reference decision story editorial |
| Manifests | `src/stories/manifests/` | Decision story content + scene config |
| Schema | `src/stories/schemas/` | Zod + per-visual state allowlist |
| Templates | `src/stories/templates/` | Known `templateId` → layout config |
| Sims | `src/lib/sim/` | Deterministic models feeding stories |
| Loader | `src/lib/loadStory.ts` | Parse + registry check |
| Engine UI | `src/components/storytelling/` | Reusable scene components |
| Story Grammar | `src/components/storytelling/grammar/` + `docs/STORY_GRAMMAR.md` | Spine, mark field, stage map |
| Atmosphere | `src/components/storytelling/atmosphere/` + `docs/ATMOSPHERE_MOTIFS.md` | Intro/outro/ambient motifs |
| Evidence figures | `data/figures/*.json` | Frozen kind-tagged packs (`npm run freeze:evidence`) |
| Validate | `scripts/validate-stories.ts` | CI-friendly gate + allowlist/grammar parity |
| Unit tests | `vitest` (`npm run test:unit`) | Sim, resolveScene, schema |
| E2E / a11y | Playwright + axe (`npm run test:e2e`, port 3100) | Sticky spine, scroll states, WCAG2 A/AA |

## Manifest schema (v1)

- **meta:** `slug`, `title`, `summary`, `date`, `templateId`, optional `hero`, optional `role` (`reference` \| `fixture`)
- **sections[]:** `id`, `headline`, `body`, `scenes[]`
- **scenes[]:** `id`, `trigger`, `visualId`, `visualState`, optional `transition`
- **dataRefs / sources / methodology / limitations / a11y**

`visualId` / `visualState` are allow-listed per visual; the renderer never evaluates free-form component names.

Current visuals: `rate-risk-mechanism` (fixture) and `cashflow-pressure` (reference).

The reference story also has a bespoke film at `/stories/when-rates-rise/film` (`src/components/film/`). Scroll progress drives one canvas — loan dots from the seeded book — through a close-up, a pullback, a reprice, and the sleeve. It is not a new `templateId`. The essay route stays on the manifest engine.

## Scroll behavior

1. `StoryLayout` wraps content in `ScrollSceneProvider` + `StoryScrollama`.
2. Each chapter is a `StoryStep`; `onStepEnter` sets the active section.
3. Provider resolves that section’s first `section-visible` scene → `visualId` / `visualState`.
4. CSS sticky holds the graphic; `SceneRenderer` renders the allow-listed visual (rejects unknown id/state).
5. Scrollama offset defaults to fraction `0.4`. Pixel strings are converted post-mount (`useSafeScrollamaOffset`) so react-scrollama never divides by `innerHeight === 0`.
6. `progress` triggers are accepted in the schema but not yet driven by scroll progress.

## Reduced motion & mobile

- CSS `@media (prefers-reduced-motion: reduce)` disables animations globally.
- One scrolly path all breakpoints; small screens stack graphic above steps with chapter padding.
- Prefer fraction or mount-safe pixel offsets — never raw `"280px"` before layout height exists.

## Design tokens

Mirrored from Orbit (not full Orbit chrome): OKLCH void/neon, Syne / IBM Plex Sans / JetBrains Mono, `.glass`, reduced-motion kill-switch.

## Future Orbit integration

1. Publish or path-import this engine’s components + schema.
2. Add a portfolio teaser as the first section after the Orbit title: short copy, one visual, a button to `/stories`.
3. Add `/stories` as this flagship landing. New stories are rows on that page.
4. Add `/stories/[slug]` for the essay manifest. Films keep their own route.
5. Keep `/writes` as prose MDX; do not overload `WriteFrontmatter`.
6. Human approve before production publish.
7. Treat IDS as Orbit’s flagship system, not a blog garnish.

## Explicitly deferred

Weekly topic discovery, auto story generation, auto PRs, auto-publish, speculative multi-template libraries, Mermaid/GSAP, production deployment of this app alone.
