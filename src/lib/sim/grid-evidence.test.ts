import { describe, expect, it } from "vitest";
import pack from "../../../data/figures/how-much-fast-reserve.v0.json";
import { FLOOR_HZ, GRID_CALIBRATION_TARGETS } from "@/lib/sim/grid-frequency";
import { GRID_HOURS, GRID_LOSS_MW, GRID_RESERVE_MW } from "@/illustrations/grid";

const published = Object.fromEntries(pack.published.figures.map((f) => [f.id, f]));
const trips = pack.events.all.filter((e) => !e.on_hour);

describe("how-much-fast-reserve v0 pack", () => {
  it("tags every block with its kind and names a known source", () => {
    expect(pack.coverage.kind).toBe("observed");
    expect(pack.events.kind).toBe("observed");
    expect(pack.featured_event.kind).toBe("observed");
    expect(pack.published.kind).toBe("observed-published");
    const sources = Object.keys(pack.sources);
    for (const block of [pack.coverage, pack.events, pack.featured_event]) expect(sources).toContain(block.source);
    for (const f of pack.published.figures) expect(sources).toContain(f.source);
  });

  it("is marked partial until kinetic energy and FFR volumes are pulled", () => {
    expect(pack.version).toBe(0);
    expect(pack.status).toMatch(/^partial/);
    expect(pack.pending.map((p) => p.dataset)).toEqual([260, 276, 278]);
  });

  it("summarises exactly the events it lists", () => {
    const s = pack.events.summary;
    expect(s.sustained_falls).toBe(pack.events.all.length);
    expect(s.trips).toBe(trips.length);
    expect(s.on_hour).toBe(pack.events.all.length - trips.length);
    expect(s.trips_apr_sep).toBe(trips.filter((e) => Number(e.t.slice(5, 7)) >= 4 && Number(e.t.slice(5, 7)) <= 9).length);
    expect(s.trips_below_49_8).toBe(trips.filter((e) => e.nadir < 49.8).length);
    expect(s.deepest_hz).toBe(Math.min(...trips.map((e) => e.nadir)));
    expect(s.any_below_49_6).toBe(trips.some((e) => e.nadir < 49.6));
  });

  it("stays far from the floor: the story is about margin, not a near-miss", () => {
    expect(pack.events.summary.deepest_hz).toBeGreaterThan(FLOOR_HZ + 0.5);
    expect(pack.events.summary.any_below_49_6).toBe(false);
  });

  it("features the deepest trip, with a trace that shows it", () => {
    const { event, trace } = pack.featured_event;
    expect(event.nadir).toBe(pack.events.summary.deepest_hz);
    expect(event.on_hour).toBe(false);
    expect(trace.raw_hz).toHaveLength(2100);
    expect(trace.filtered_hz).toHaveLength(2100);
    expect(trace.start < event.t).toBe(true);
    const window = trace.filtered_hz.slice(trace.event_index, trace.event_index + 250);
    expect(Math.min(...window)).toBeCloseTo(event.nadir, 2);
    const before = trace.filtered_hz.slice(0, trace.event_index);
    expect(Math.min(...before)).toBeGreaterThan(49.9);
    expect(Math.abs(trace.filtered_hz[trace.event_index] - event.pre)).toBeLessThan(0.02);
  });

  it("covers the year with few gaps", () => {
    expect(pack.coverage.months).toHaveLength(12);
    for (const m of pack.coverage.months) expect(m.gap_share).toBeLessThan(0.005);
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
