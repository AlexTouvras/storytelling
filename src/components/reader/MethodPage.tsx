import Link from "next/link";
import type { StoryManifest } from "@/stories/schemas/manifest";
import {
  KIND_INFO,
  filmHref,
  kindAnchor,
  packHref,
  type EvidenceKind,
} from "@/lib/reader/kinds";
import {
  limitationsOf,
  packSchema,
  packStamp,
  type MethodBlock,
  type MethodSection,
  type StoryMethod,
} from "@/lib/reader/method";
import { KindBadge } from "@/components/reader/KindBadge";

type Props = {
  manifest: StoryManifest;
  method: StoryMethod;
};

function kb(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

/**
 * The optional depth behind a film: the same page shape for every story,
 * generated from its manifest and its frozen pack. Readers who want the data,
 * the schema and the calculations get a document; the film stays short.
 */
export function MethodPage({ manifest, method }: Props) {
  const { slug } = manifest.meta;
  const stamp = packStamp(method.pack);
  const packBytes = new TextEncoder().encode(JSON.stringify(method.pack)).length;
  const schema = packSchema(method.pack, method.schema);
  const limitations = limitationsOf(method.pack, manifest.limitations);
  const reader = manifest.reader;

  const sections: MethodSection[] = [
    {
      id: "decision",
      title: "The decision",
      blocks: [
        ...(manifest.meta.hero ? [{ type: "p" as const, text: `Question: ${manifest.meta.hero.question}` }] : []),
        { type: "p", text: manifest.meta.summary },
      ],
    },
    ...(method.sections?.() ?? []),
    {
      id: "figures",
      title: "Figures in the film",
      blocks: [
        {
          type: "table",
          columns: ["Figure", "Kind", "Note"],
          left: [0, 1, 2],
          rows: manifest.dataRefs.map((ref) => [ref.label, KIND_INFO[ref.kind].label, ref.note ?? ""]),
        },
      ],
    },
    { id: "method", title: "Method in one paragraph", blocks: [{ type: "p", text: manifest.methodology }] },
  ];

  const contents = [
    { id: "labels", title: "How to read the labels" },
    ...(reader ? [{ id: "terms", title: "Terms" }] : []),
    ...sections.map((s) => ({ id: s.id, title: s.title })),
    { id: "sources", title: "Sources" },
    { id: "schema", title: "Schema and download" },
    { id: "limitations", title: "Limitations" },
  ];

  return (
    <article data-testid="method-page" className="mx-auto max-w-4xl px-5 pb-28 pt-24 text-white md:pt-32">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-neon-cyan/80">
        Method · {manifest.meta.title}
      </p>
      <h1 className="mt-4 font-display text-[clamp(2rem,4.5vw,3.2rem)] font-semibold leading-[1.04] tracking-[-0.03em]">
        How this was made
      </h1>
      <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/65 md:text-lg">
        The data, the rules, the model and the limits behind the film. Every figure on this page is
        generated from the frozen evidence pack, so it cannot drift from what the film shows.
      </p>
      <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-2 font-mono text-[11px] uppercase tracking-[0.12em] text-white/45">
        <div>
          <dt className="inline">Pack </dt>
          <dd className="inline text-white/75" data-testid="pack-id">
            {stamp.id}
            {stamp.version ? ` v${stamp.version}` : ""}
          </dd>
        </div>
        {stamp.generated ? (
          <div>
            <dt className="inline">Frozen </dt>
            <dd className="inline text-white/75">{stamp.generated}</dd>
          </div>
        ) : null}
      </dl>
      <div className="mt-6 flex flex-wrap gap-4 font-mono text-[11px] uppercase tracking-[0.14em]">
        <Link href={filmHref(slug)} className="focus-ring text-neon-cyan/85 hover:text-neon-cyan">
          ← Back to the film
        </Link>
        <a href={packHref(slug)} download className="focus-ring text-white/60 hover:text-white" data-testid="pack-download">
          Download the evidence pack (JSON, {kb(packBytes)})
        </a>
      </div>

      <nav aria-label="On this page" className="mt-10 border-y border-white/10 py-4">
        <ol className="grid gap-1 font-mono text-[11px] uppercase tracking-[0.12em] text-white/50 sm:grid-cols-2">
          {contents.map((c, i) => (
            <li key={c.id}>
              <a href={`#${c.id}`} className="focus-ring hover:text-white">
                {String(i + 1).padStart(2, "0")} · {c.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <Section id="labels" title="How to read the labels">
        <p className="text-white/65">Every figure in the film carries one of these labels.</p>
        <dl className="mt-4 space-y-3">
          {(Object.keys(KIND_INFO) as EvidenceKind[]).map((kind) => (
            <div key={kind} id={kindAnchor(kind)} className="scroll-mt-24 sm:flex sm:gap-4">
              <dt className="w-32 shrink-0">
                <KindBadge kind={kind} slug={slug} testId="method-kind" />
              </dt>
              <dd className="mt-1 text-sm leading-relaxed text-white/70 sm:mt-0">{KIND_INFO[kind].definition}</dd>
            </div>
          ))}
        </dl>
      </Section>

      {reader ? (
        <Section id="terms" title="Terms">
          <Table
            columns={["Film word", "Technical name", "Definition", "Taught in"]}
            left={[0, 1, 2, 3]}
            rows={reader.terms.map((t) => [t.word, t.technical, t.definition, reader.beats[t.beat] ?? `beat ${t.beat}`])}
          />
        </Section>
      ) : null}

      {sections.map((section) => (
        <Section key={section.id} id={section.id} title={section.title} kind={section.kind} slug={slug}>
          {section.blocks.map((block, i) => (
            <Block key={`${section.id}-${i}`} block={block} />
          ))}
        </Section>
      ))}

      <Section id="sources" title="Sources">
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-white/70">
          {manifest.sources.map((s) => (
            <li key={s.id}>
              {s.url ? (
                <a href={s.url} className="focus-ring underline decoration-white/25 underline-offset-4 hover:decoration-white">
                  {s.label}
                </a>
              ) : (
                s.label
              )}
            </li>
          ))}
        </ul>
      </Section>

      <Section id="schema" title="Schema and download">
        <p className="text-white/65">
          The pack is one JSON file. Each top-level block below carries its own kind and source where it has
          one.{" "}
          <a href={packHref(slug)} download className="focus-ring text-neon-cyan/85 underline underline-offset-4">
            Download it ({kb(packBytes)})
          </a>
          .
        </p>
        <div className="mt-4">
          <Table
            testId="schema-table"
            columns={["Block", "Holds", "Shape", "Kind", "Source"]}
            left={[0, 1, 2, 3, 4]}
            rows={schema.map((r) => [r.key, r.holds, r.shape, r.kind ? KIND_INFO[r.kind].label : "", r.source])}
          />
        </div>
      </Section>

      <Section id="limitations" title="Limitations">
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-white/70">
          {limitations.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        {manifest.method ? (
          <p className="mt-6 font-mono text-[11px] text-white/45">
            Reasoning: <code>{manifest.method.spec}</code> · pack: <code>{manifest.method.pack}</code>
          </p>
        ) : null}
      </Section>
    </article>
  );
}

function Section({
  id,
  title,
  kind,
  slug,
  children,
}: {
  id: string;
  title: string;
  kind?: EvidenceKind;
  slug?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-14 scroll-mt-24" data-testid={`method-${id}`}>
      <div className="flex items-center gap-3">
        <h2 className="font-display text-2xl font-semibold tracking-[-0.02em] md:text-3xl">{title}</h2>
        {kind && slug ? <KindBadge kind={kind} slug={slug} testId="section-kind" /> : null}
      </div>
      <div className="mt-4 space-y-4 text-base leading-relaxed text-white/70">{children}</div>
    </section>
  );
}

function Block({ block }: { block: MethodBlock }) {
  switch (block.type) {
    case "p":
      return <p>{block.text}</p>;
    case "list":
      return (
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case "code":
      return (
        <pre className="overflow-x-auto rounded border border-white/10 bg-white/[0.03] p-4 font-mono text-[12px] leading-relaxed text-white/80">
          <code>{block.text}</code>
        </pre>
      );
    case "table":
      return <Table caption={block.caption} columns={block.columns} rows={block.rows} left={block.left} />;
  }
}

function Table({
  caption,
  columns,
  rows,
  left = [],
  testId,
}: {
  caption?: string;
  columns: readonly string[];
  rows: readonly (readonly (string | number)[])[];
  left?: readonly number[];
  testId?: string;
}) {
  const align = (i: number) => (left.includes(i) ? "text-left" : "text-right");
  return (
    <div className="overflow-x-auto" data-testid={testId}>
      <table className="w-full border-collapse font-mono text-[11px] text-white/75">
        {caption ? (
          <caption className="mb-2 text-left font-sans text-sm text-white/50">{caption}</caption>
        ) : null}
        <thead>
          <tr className="border-b border-white/15 text-white/45">
            {columns.map((c, i) => (
              <th key={c} scope="col" className={`px-2 py-2 font-normal uppercase tracking-[0.08em] ${align(i)}`}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b border-white/5 align-top">
              {row.map((cell, ci) => (
                <td key={ci} className={`px-2 py-1.5 ${align(ci)} ${ci === 0 ? "text-white/85" : ""}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}