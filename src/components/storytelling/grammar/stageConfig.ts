import type {
  FieldMode,
  TransmissionNodeId,
  VisualBehavior,
  VisualJob,
} from "./types";

export type PressureStage = {
  job: VisualJob;
  behavior: VisualBehavior;
  /** Which transmission nodes are lit. */
  spineActive: TransmissionNodeId[] | "all";
  field: FieldMode;
  caption: string;
  provenance: "hypothetical" | "modeled" | "observed" | "mixed";
};

/** Act key → continuous-spine stage. Shared by cashflow-pressure only. */
export const PRESSURE_STAGES: Record<string, PressureStage> = {
  dial: {
    job: "establish",
    behavior: "reveal",
    spineActive: ["central-bank"],
    field: "stub",
    caption: "Where does the pressure concentrate?",
    provenance: "hypothetical",
  },
  transmission: {
    job: "reveal",
    behavior: "trace",
    spineActive: "all",
    field: "household",
    caption: "One household · payment eats the residual",
    provenance: "hypothetical",
  },
  heterogeneity: {
    job: "compare",
    behavior: "compare",
    spineActive: ["payment", "buffer"],
    field: "segments",
    caption: "Same shock · unequal rooms",
    provenance: "hypothetical",
  },
  book: {
    job: "zoom",
    behavior: "zoom",
    spineActive: ["buffer"],
    field: "population",
    caption: "Zoom · thin share rises — who crossed?",
    provenance: "modeled",
  },
  intersection: {
    job: "filter",
    behavior: "filter",
    spineActive: ["loan", "buffer"],
    field: "sleeve",
    caption: "Filter · floating ∩ thin",
    provenance: "modeled",
  },
  evidence: {
    job: "evidence-board",
    behavior: "annotate",
    spineActive: ["payment", "buffer"],
    field: "annotated",
    caption: "Reality check · averages can ease while a sleeve tightens",
    provenance: "mixed",
  },
  cut: {
    job: "decide",
    behavior: "split",
    spineActive: ["buffer"],
    field: "cut",
    caption: "The sleeve you filtered to",
    provenance: "modeled",
  },
};

export function stageFor(visualState: string): PressureStage {
  return (
    PRESSURE_STAGES[visualState] ?? {
      job: "establish",
      behavior: "reveal",
      spineActive: ["central-bank"],
      field: "stub",
      caption: "",
      provenance: "hypothetical",
    }
  );
}
