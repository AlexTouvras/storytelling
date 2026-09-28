# Reader kit

Every reference story ships two things beside its film:

1. **An introduction woven into the film.** A short orientation card before the first beat, each term taught where the reader first needs it, a Terms drawer that holds them all, and a badge on every beat that says where its figure comes from.
2. **Optional depth on its own page.** `/stories/<slug>/method` holds the data, schema, rules, model, tables and limitations, all generated from the frozen evidence pack, with the pack itself as a download.

The film stays short because the depth has somewhere to go. The reader is never asked to read a glossary before the story starts.

This is Layer 1: the components and checks are story-agnostic, and a story only supplies words and a pack. `validate:stories` rejects a `role: "reference"` manifest without both blocks.

## What a story supplies

| Piece | Where | Rules |
|-------|-------|-------|
| Orientation | `reader.orientation` in the manifest | 20–60 words. What the story is about in plain words. No term's technical name. |
| Beats | `reader.beats` | One short name per beat, the same count as the film's narration. The drawer groups terms under these. |
| Terms | `reader.terms[]` | `id`, `word` (as the film says it), optional `forms` (other spellings the film uses), `technical` (the name a specialist would use; `;` or `,` separate several), `definition` (≤220 characters, no new jargon), `beat` (where it is taught). |
| Legend | `reader.legend` (optional) | Up to four labels and a caption for an illustration the reader has to decode. Only when a picture needs one. |
| Method | `method.pack`, `method.spec` | The pack in `data/figures/` and the Decision Spec. |
| Narration | A non-client module exporting `<story>Narration(): BeatText[]`, registered in `src/stories/reader/narration.ts` | The words the reader sees, one entry per beat: kicker, title, paragraphs. The film imports the same module, so the check reads what renders. |
| Method module | `src/stories/method/<slug>.ts`, registered in `src/stories/method/registry.ts` | `pack` (the JSON import), `schema` (one line per top-level pack block, saying what it holds), `sections()` (the story's own tables and rules, built from the pack). |
| Beat kind | A `kind` on each beat's copy | One of `observed`, `published`, `calculated`, `modelled`, `hypothetical`, `illustrative` (`src/lib/reader/kinds.ts`). Null only on a title card with no figure. |

## Where each term goes

A term is taught in the first beat whose **paragraphs** use it: the word, or one of its forms, has to appear there. Neither the word nor its technical name may appear anywhere in an earlier beat's kicker, title or paragraphs. `termOrderProblems` checks this with whole-word matching (a plural `s` or `es` counts), so:

- If an early beat uses a term in passing, reword the early beat. Moving the term earlier is the wrong fix when that beat has no room to explain it.
- A term used only in a kicker or title needs a paragraph that uses it too, or it has nowhere to be tapped.
- A title card counts as beat 0. Keep it free of terms, or teach them there.
- Captions and caveats are not checked. Keep jargon out of them anyway.

The film renders a term button only at that first use, in that beat. Everywhere else the word is plain text, and the drawer has it.

## What the engine provides

| Component | Job |
|-----------|-----|
| `ReaderShell` | The film's root: reader context plus the Terms drawer. |
| `OrientationCard` | The orientation, how to read the film, the label key and the method link. |
| `TermText` | A beat's paragraphs with its terms as buttons (`aria-expanded`, definition in place, no animation). |
| `TermsDrawer` | Every term, grouped by beat, later ones marked "still to come". Escape closes it and returns focus. |
| `KindBadge` | A beat's label, linked to that label on the method page. |
| `MethodLink` | The film's last line, into the method page. |
| `MethodPage` + `/stories/[slug]/method` | Labels, terms, the decision, the story's sections, the manifest's figures, method, sources, the schema table, limitations; `/method/evidence.json` serves the pack. Both routes are static and only exist for registered slugs. |

## Checks

- `npm run validate:stories`: reference stories declare both blocks; the narration is registered and has one entry per beat; the terms are in order; every pack block has a schema note; the pack and Spec exist.
- `src/stories/reader/reader-kit.test.ts`: the same, per story, as unit tests, and a reference manifest without the blocks is rejected.
- `e2e/reader-kit.spec.ts`: on every reference film, the orientation card, a term button toggling its definition, the badge link, the drawer with every term and Escape, the method page and the download. Add a row when a story is added.

## Order of work for a new story

1. In the Decision Spec, list the terms with the beat each is taught in, and write the orientation. A term that cannot be placed without a glossary is a sign the beat order is wrong.
2. Write the narration module; the film imports it.
3. Add `reader` and `method` to the manifest.
4. Write the method module: schema notes first (the check lists what is missing), then the sections a curious reader would ask for.
5. Register both, run `validate:stories`, add the e2e row.
6. Look at the film and the method page on a laptop and a phone. The checks confirm the terms are placed correctly; they cannot tell you whether a definition makes sense.
