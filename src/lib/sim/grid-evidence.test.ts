import { describe, expect, it } from "vitest";
import pack from "../../../data/figures/how-much-fast-reserve.v1.json";
import { FLOOR_HZ, GRID_CALIBRATION_TARGETS } from "@/lib/sim/grid-frequency";
import { GRID_HOURS, GRID_LOSS_MW, GRID_RESERVE_MW } from "@/illustrations/grid";

const published = Object.fromEntries(pack.published.figures.map((f) => [f.id, f]));
const events = pack.events.all;
const trips = events.filter((e) => e.class === "trip");
const summer = (t: string) => Number(t.slice(5, 7)) >= 4 && Number(t.slice(5, 7)) <= 9;

describe("how-much-fast-reserve v1 pack", () => {
  it("tags every block with its kind and names known sources", () => {
    expect(pack.coverage.kind).toBe("observed");
    expect(pack.events.kind).toBe("observed");
    expect(pack.featured_event.kind).toBe("observed");
    expect(pack.hours.kind).toBe("observed");
    expect(pack.pairing.kind).toBe("calculated");
    expect(pack.years.kind).toBe("calculated");
    expect(pack.ffr_by_kinetic.kind).toBe("calculated");
    expect(pack.published.kind).toBe("observed-published");
    const sources = Object.keys(pack.sources);
    const named = [
      pack.coverage.source,
      pack.events.source,
      pack.featured_event.source,
      pack.years.source,
      ...pack.events.paired_with,
      ...pack.hours.sources,
      ...pack.pairing.sources,
      ...pack.ffr_by_kinetic.sources,
      ...pack.published.figures.map((f) => f.source),
    ];
    for (const s of named) expect(sources).toContain(s);
  });

  it("classifies every event, and every trip meets the trip rule", () => {
    const classes = Object.keys(pack.method.classes);
    for (const e of events) expect(classes).toContain(e.class);
    for (const e of trips) {
      expect(e.on_hour).toBe(false);
      expect(e.gap_samples).toBe(0);
      expect(e.pre - e.nadir).toBeGreaterThanOrEqual(0.1);
      expect(e.nadir_s).toBeGreaterThanOrEqual(2);
      expect(e.retained_30s!).toBeGreaterThanOrEqual(0.2);
      expect(e.steepest_hz_s).toBeGreaterThanOrEqual(-0.6);
    }
  });

  it("summarises exactly the events it lists", () => {
    const s = pack.events.summary;
    expect(s.sustained_falls).toBe(events.length);
    expect(Object.values(s.by_class).reduce((a, b) => a + b, 0)).toBe(events.length);
    expect(s.by_class.trip).toBe(trips.length);
    expect(s.trips).toBe(trips.length);
    expect(s.trips_apr_sep).toBe(trips.filter((e) => summer(e.t)).length);
    expect(s.trips_below_49_8).toBe(trips.filter((e) => e.nadir < 49.8).length);
    expect(s.deepest_hz).toBe(Math.min(...trips.map((e) => e.nadir)));
    expect(s.any_below_49_6).toBe(trips.some((e) => e.nadir < 49.6));
  });

  it("stays far from the floor: the story is about margin, not a near-miss", () => {
    expect(Math.min(...events.map((e) => e.nadir))).toBeGreaterThan(FLOOR_HZ + 0.5);
    expect(pack.events.summary.any_below_49_6).toBe(false);
  });

  it("pairs every trip with its hour's kinetic energy, converting Finnish time to UTC", () => {
    for (const e of trips) {
      expect(e.kinetic_gws).not.toBeNull();
      expect(e.hour_index).not.toBeNull();
      const local = new Date(`${e.onset.slice(0, 19).replace(" ", "T")}Z`).getTime();
      const offsetHours = (local - new Date(e.onset_utc).getTime()) / 3_600_000;
      expect([2, 3]).toContain(offsetHours);
      expect(pack.hours.kinetic_gws[e.hour_index!]).not.toBeNull();
    }
    const p = pack.pairing;
    expect(p.trips_paired).toBe(trips.length);
    expect(p.apr_sep.trips + p.oct_mar.trips).toBe(trips.length);
  });

  it("features the deepest trip, with a trace that shows it", () => {
    const { event, trace } = pack.featured_event;
    expect(event.nadir).toBe(pack.events.summary.deepest_hz);
    expect(event.class).toBe("trip");
    expect(trace.raw_hz).toHaveLength(2100);
    expect(trace.filtered_hz).toHaveLength(2100);
    const window = trace.filtered_hz.slice(trace.event_index, trace.event_index + 250);
    expect(Math.min(...window)).toBeCloseTo(event.nadir, 2);
    expect(Math.min(...trace.filtered_hz.slice(0, trace.event_index))).toBeGreaterThan(49.9);
  });

  it("covers the year of hours with few gaps", () => {
    expect(pack.coverage.months).toHaveLength(12);
    for (const m of pack.coverage.months) expect(m.gap_share).toBeLessThan(0.005);
    const k = pack.hours.kinetic_gws;
    expect(k).toHaveLength(8760);
    expect(k.filter((v) => v === null).length).toBeLessThan(k.length * 0.01);
    for (const v of k) if (v !== null) expect(v).toBeGreaterThan(60);
  });

  it("finds fast reserve bought in low-inertia hours and never in high ones", () => {
    const bands = pack.ffr_by_kinetic.since_2020;
    const low = bands.filter((b) => b.to_gws <= 140);
    const high = bands.filter((b) => b.from_gws >= 200);
    for (const b of low) expect(b.share_procured).toBeGreaterThan(0.5);
    for (const b of high) expect(b.share_procured).toBeLessThan(0.01);
  });
});

describe("our yearly counts against the operators' published KPIs", () => {
  it("reproduces the published mean kinetic energy within 5 GWs", () => {
    const kpi = published["inertia-kpis"].value;
    kpi.years!.forEach((year, i) => {
      const ours = pack.years.kinetic.find((y) => y.year === year)!;
      expect(Math.abs(ours.mean_gws - kpi.mean_gws![i])).toBeLessThanOrEqual(5);
    });
  });
});

describe("model and illustration constants match the published figures", () => {
  it("uses the published floor, reference incident and low-inertia case", () => {
    expect(published.floor.value.floor_hz).toBe(FLOOR_HZ);
    expect(published["reference-incident"].value.mw).toBe(GRID_LOSS_MW);
    expect(published["design-kinetic"].value.gws).toBe(GRID_CALIBRATION_TARGETS.designPoint.kineticGWs);
    expect(published["low-inertia-ffr"].value.gws).toBe(GRID_CALIBRATION_TARGETS.lowInertia.kineticGWs);
    expect(published["low-inertia-ffr"].value.ffr_mw).toBe(GRID_CALIBRATION_TARGETS.lowInertia.ffrMW);
    expect(published["low-inertia-ffr"].value.gws).toBe(GRID_HOURS.light);
    expect(published["low-inertia-ffr"].value.ffr_mw).toBe(GRID_RESERVE_MW);
  });

  it("takes the typical hour from the mean kinetic energy of the last three published years", () => {
    const kpi = published["inertia-kpis"].value;
    const last = kpi.mean_gws!.slice(-3);
    expect(GRID_HOURS.typical).toBe(Math.round(last.reduce((a, b) => a + b, 0) / last.length));
  });
});
