import {
  Callout,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Grid,
  H1,
  H2,
  Pill,
  Row,
  Spacer,
  Stack,
  Stat,
  Table,
  Text,
  useHostTheme,
} from "cursor/canvas";

/**
 * External review: inheritances for IDS flagship polish + insight.
 * Sources: FLAGSHIP_AUDIT, DATA_AND_MCP_ROADMAP, newsroom/scrolly practice,
 * MCP catalog research (2026-09-23).
 */
export default function FlagshipExternalReview() {
  const theme = useHostTheme();

  return (
    <Stack gap={24} style={{ padding: 24, maxWidth: 960 }}>
      <Stack gap={8}>
        <H1>IDS flagship — external inheritances</H1>
        <Text tone="secondary">
          What to borrow so stories feel newsroom-grade and decision-useful —
          without abandoning Approach B (manifest → engine) or inventing five
          templates. Review date 2026-09-23.
        </Text>
      </Stack>

      <Callout tone="warning" title="Verdict">
        The ceiling is not the sticky runtime. It is (1) visual continuity /
        semantic motion, (2) annotation discipline, and (3) an evidence spine
        that can feed sharper cuts. Stack upgrades help only when they serve
        those three.
      </Callout>

      <Grid columns={3} gap={12}>
        <Stat value="2–3" label="Visual continuity (audit)" tone="danger" />
        <Stat value="OK" label="Engine stage (Layer 1)" tone="success" />
        <Stat value="High" label="MCP / data upside" tone="info" />
      </Grid>

      <Divider />

      <H2>Gap map (from your own audit + outside bar)</H2>
      <Table
        headers={["Gap", "Outside bar does", "Inherit"]}
        rows={[
          [
            "Metaphor swaps each act",
            "One object zooms / filters / annotates",
            "Stable marks + grammar verbs (zoom, filter, annotate)",
          ],
          [
            "Metric dump",
            "One claim per step (Pudding / Segel–Heer)",
            "Progressive disclosure already started — enforce harder",
          ],
          [
            "Opacity width transitions",
            "Semantic morph (bar→dot field, sleeve highlight)",
            "D3 joins or FLIP; GSAP only if scrub needed",
          ],
          [
            "Evidence as banner text",
            "Screenshot-distinct provenance language",
            "Badge system + frozen figures JSON",
          ],
          [
            "Illustrative book only",
            "Moment-matched or microdata cuts",
            "Calibrated sim → HFCS; Eurostat/ECB MCP",
          ],
          [
            "Mobile dock crowded",
            "Fewer simultaneous encodings",
            "Density modes + shorter captions (already sketched)",
          ],
        ]}
      />

      <Divider />

      <H2>Recommended stack tiers</H2>
      <Text tone="secondary" size="small">
        Keep Layer 1 boring. Put spend in Layer 2 (grammar marks) and evidence
        pipeline. Chart CDNs and no-code builders stay out of the published
        story path.
      </Text>

      <Grid columns={2} gap={16}>
        <Card>
          <CardHeader trailing={<Pill tone="success">Do now</Pill>}>
            Production story runtime
          </CardHeader>
          <CardBody>
            <Stack gap={8}>
              <Text weight="semibold">Keep</Text>
              <Text size="small">
                Next 16 · React 19 · react-scrollama · CSS sticky · Zod manifests
                · Framer for small UI transitions · seeded sims
              </Text>
              <Text weight="semibold">Add</Text>
              <Text size="small">
                d3-scale / d3-array / d3-selection (or Observable Plot for
                standard marks) · Susie Lu–style annotation primitives ·
                Playwright + axe in CI · CSS scroll-driven animations for
                non-data reveals only
              </Text>
              <Text weight="semibold">Defer</Text>
              <Text size="small">
                GSAP ScrollTrigger (unless scrubbed sequences earn it) · Rive
                (mechanism illustrations, not charts) · Mermaid / heavy chart
                suites
              </Text>
            </Stack>
          </CardBody>
        </Card>

        <Card>
          <CardHeader trailing={<Pill tone="info">Analysis side</Pill>}>
            Evidence → frozen figures
          </CardHeader>
          <CardBody>
            <Stack gap={8}>
              <Text size="small">
                Python/R notebooks (uv + Jupyter) produce versioned JSON:
                kind-tagged observed / calculated / modeled / hypothetical.
                Engine never invents series at render time.
              </Text>
              <Text size="small">
                Optional: Observable Plot or Altair in notebooks for draft
                charts; hand-port winning marks into allow-listed React visuals.
              </Text>
              <Text size="small">
                Power BI MCP: explore affordability / bank stories — not a
                substitute for HFCS microdata.
              </Text>
            </Stack>
          </CardBody>
        </Card>
      </Grid>

      <Divider />

      <H2>MCP map — install Global unless repo-bound</H2>
      <Table
        headers={["Priority", "Server / tool", "IDS job"]}
        rows={[
          [
            "P0",
            "cursor-ide-browser (have)",
            "Scroll / sticky / mobile visual QA with screenshots",
          ],
          [
            "P0",
            "socioeconomic-data-mcp or eurostat-mcp-suite + ECB fetch",
            "Primary-source series with provenance for Evidence Pack v2",
          ],
          [
            "P0",
            "user-projectbrain (have)",
            "Decision Specs, architecture, handoffs — register this repo",
          ],
          [
            "P1",
            "Playwright + axe (CI, not MCP)",
            "A11y + sticky regression on every story slug",
          ],
          [
            "P1",
            "echart-mcp-view or mcp-dashboards",
            "Exploration inside chat only — freeze winners to figures JSON",
          ],
          [
            "P1",
            "Power BI modeling MCP (have)",
            "Second-story ideation (churn, bank, affordability)",
          ],
          [
            "P2",
            "Figma MCP (only if you design outside code)",
            "Pitch / act boards — prefer code-first grammar",
          ],
          [
            "P2",
            "World Bank Data360 MCP",
            "Later global development stories; low priority for rates",
          ],
          [
            "Skip",
            "Pigment Frames / Graphy / Flourish embed",
            "Wrong product shape — governed SaaS or embed ≠ Orbit flagship",
          ],
        ]}
      />

      <Callout tone="info" title="Config note">
        Shared MCPs go in C:/Users/kater/.cursor/mcp.json (Global). Do not
        duplicate Power BI or ProjectBrain into this project mcp.json.
      </Callout>

      <Divider />

      <H2>Visual grammar to extract next</H2>
      <Text tone="secondary" size="small">
        Newsroom pattern vocabulary mapped to your locked Layer 2 verbs —
        implement as reusable behaviors, not new page architectures.
      </Text>
      <Grid columns={2} gap={12}>
        {[
          ["reveal", "Staged marks; 150–250ms; end state correct without motion"],
          ["zoom", "Same coordinate system; camera/scale on one object"],
          ["filter", "Sleeve / intersection dimming — not a new chart type"],
          ["annotate", "One callout per step; collision-aware notes"],
          ["compare", "Aligned small multiples or segment bars that persist"],
          ["split", "Portfolio cut as part-to-whole of the same field"],
          ["trace", "Causal chain as path highlight, not list replacement"],
          ["transform", "Stable mark identity across acts (join keys)"],
        ].map(([verb, how]) => (
          <Card key={verb}>
            <CardBody>
              <Stack gap={4}>
                <Text weight="semibold">{verb}</Text>
                <Text size="small" tone="secondary">
                  {how}
                </Text>
              </Stack>
            </CardBody>
          </Card>
        ))}
      </Grid>

      <Divider />

      <H2>What “compelling + insightful” actually buys</H2>
      <Grid columns={3} gap={12}>
        <Card>
          <CardHeader>Compelling</CardHeader>
          <CardBody>
            <Text size="small">
              Continuity + pacing + typography of acts. One visual spine. Martini
              glass: concrete → reveal → zoom out → mechanism → decision.
            </Text>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>Insightful</CardHeader>
          <CardBody>
            <Text size="small">
              Cuts the reader could not get from a paragraph: float∩thin by
              country/income after calibration or HFCS — labeled honestly.
            </Text>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>Decision-useful</CardHeader>
          <CardBody>
            <Text size="small">
              End on a durable Decision frame (you started DecisionCard).
              Uncertainty and limits visible; no fake bank microdata.
            </Text>
          </CardBody>
        </Card>
      </Grid>

      <Divider />

      <H2>Suggested build order (overrides tool FOMO)</H2>
      <Stack gap={8}>
        <Row gap={8} align="center">
          <Pill tone="accent">1</Pill>
          <Text>
            Finish visual continuity on When Rates Rise (one zooming object) —
            still the highest ROI vs any new library.
          </Text>
        </Row>
        <Row gap={8} align="center">
          <Pill tone="accent">2</Pill>
          <Text>
            Extract Story Grammar primitives from that continuity work.
          </Text>
        </Row>
        <Row gap={8} align="center">
          <Pill tone="accent">3</Pill>
          <Text>
            Install socioeconomic / Eurostat MCP Global; Evidence Pack v2
            (calibrated book, then HFCS plan).
          </Text>
        </Row>
        <Row gap={8} align="center">
          <Pill>4</Pill>
          <Text>
            Add d3/Plot marks + annotation component; Playwright a11y CI.
          </Text>
        </Row>
        <Row gap={8} align="center">
          <Pill>5</Pill>
          <Text>
            Orbit host; agent pipeline last (research → freeze → spec →
            manifest), human-gated.
          </Text>
        </Row>
      </Stack>

      <Spacer height={8} />
      <Text size="small" tone="tertiary" style={{ color: theme.textTertiary }}>
        Companion docs: docs/FLAGSHIP_AUDIT.md · docs/DATA_AND_MCP_ROADMAP.md ·
        docs/FLAGSHIP.md. This canvas does not change locked decisions (Approach
        B, allow-listed visuals, no auto-publish).
      </Text>
    </Stack>
  );
}
