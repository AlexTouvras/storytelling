# Atmosphere Motifs

> Cinematic chrome for intros, outros, and soft stage ambient.  
> Not story templates. Not charts. Domain vernacular as moving objects.

## Craft ceiling

| Tier | Bar | When |
|------|-----|------|
| **A — now** | Pinloop / Linear / Stripe / Raycast / Resend — one shot, living ambient, obsessive space | Motif v1 (SVG/CSS/Framer) |
| **B — later** | Pendragon / ZERO / GQ×AP Lab — scroll-as-camera WebGL | Optional motif backends |
| **Editorial** | Pudding / Bloomberg / NYT — one claim per step, honest evidence | Decision acts (not motifs) |

Motifs never invent metrics. No fake KPIs in the rain.

## Shot discipline (before coding a motif)

1. Focal point (where the eye should land)
2. What moves vs what stays still
3. Domain vernacular (why this object belongs to finance / data / AI…)
4. Intensity mapping: `subtle` | `hero` | `curtain`
5. Reduced-motion end frame: a still, readable hold of the opening — not a halfway blend
6. A transition changes the objects already on screen. The arrival is those objects in a new state.
7. If the shot travels, travel only increases, then eases to a stop. The stop is the destination.
8. An entry has no hard rim. The path that led in is gone once the view is inside.

## Catalog

| `motifId` | Domains | Shot brief | Craft refs |
|-----------|---------|------------|------------|
| `pressure-field` | finance, credit | Population of residual-capacity bars; thin = violet; thick = cyan; breathe slowly | Pinloop live field; Stripe one emotional plane |
| `ledger-drift` | finance, econ | Soft ledger columns; tick marks drift horizontally like a tape | Raycast grid; Resend line systems |
| `data-stream` | data, analytics | Vertical glyph rain (· │ ▌ 0 1); density varies; no numbers that look like KPIs | Pinloop feed; Linear ambient |
| `signal-ribbon` | markets, econ | Layered sine ribbons; slow phase shift; oscilloscope calm | Stripe restraint; Bloomberg density |
| `constellation` | AI, systems | Sparse nodes + faint edges; slow drift; fog of depth | Resend diagrams; Pendragon focus |

## Manifest

```json
"atmosphere": {
  "motifId": "pressure-field",
  "roles": ["intro", "outro", "ambient"],
  "intensity": "hero"
}
```

- `roles` — where the motif mounts (`intro` hero, `outro` conclusion curtain, `ambient` under sticky)
- `intensity` — default per role if omitted: intro→hero, outro→curtain, ambient→subtle

## Authoring rules

1. Pick motif by domain vernacular, not by “looks cool.”
2. Story-specific Act visuals stay in `VISUAL_REGISTRY` — motifs do not replace them.
3. Prefer one motif per story; don’t stack competing skies.
4. `aria-hidden` on atmosphere layers; meaning lives in copy + decision visuals.
