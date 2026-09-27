import { describe, expect, it } from "vitest";
import {
  nextTriggerState,
  reconcileTrigger,
  type TriggerAction,
  type TriggerState,
} from "@/components/film/cue-table";
import {
  blendShots,
  cameraFor,
  viewportToWorld,
  wideShot,
  worldToViewport,
} from "@/lib/director/camera";
import { EntityMap, type Entity } from "@/lib/director/entity-map";
import { artboardToLocal, localToViewport } from "@/lib/director/anchors";
import {
  SHOCK_CUE,
  TRANSITION_POSES,
  openOpacity,
  openScale,
  transitionAt,
  transitionLayout,
} from "@/lib/director/household-transition";

const cue = { id: "c", at: 0.5 };
const seen = { visible: true, reduced: false };

/** Walk a scroll path through the reconciler the way the director's tick does. */
function walk(path: number[], context = seen) {
  let state: TriggerState = "armed";
  const actions: TriggerAction[] = [];
  for (let i = 1; i < path.length; i++) {
    const action = reconcileTrigger(cue, path[i - 1], path[i], state, context);
    if (action !== "none") actions.push(action);
    state = nextTriggerState(state, action);
  }
  return { state, actions };
}

describe("reconcileTrigger", () => {
  it("fires once on a forward crossing", () => {
    expect(walk([0, 0.4, 0.5, 0.6, 0.9, 1])).toEqual({ state: "played", actions: ["fire"] });
  });

  it("resets when the reader goes back behind the cue, and fires again on the next crossing", () => {
    expect(walk([0.4, 0.6, 0.45, 0.55])).toEqual({ state: "played", actions: ["fire", "reset", "fire"] });
  });

  it("never stacks fires while scrubbing back and forth past the cue", () => {
    const path = [0.4, 0.6];
    for (let i = 0; i < 40; i++) path.push(i % 2 ? 0.52 : 0.9);
    const { actions } = walk(path);
    expect(actions).toEqual(["fire"]);
  });

  it("alternating across the cue always pairs fire with reset", () => {
    const path = [0];
    for (let i = 0; i < 20; i++) path.push(i % 2 ? 0.3 : 0.7);
    const { actions } = walk(path);
    const fires = actions.filter((a) => a === "fire").length;
    const resets = actions.filter((a) => a === "reset").length;
    expect(fires - resets).toBeLessThanOrEqual(1);
    expect(actions.every((a, i) => a === (i % 2 ? "reset" : "fire"))).toBe(true);
  });

  it("settles instead of firing on a load or jump past the cue", () => {
    expect(walk([0.8, 0.8])).toEqual({ state: "settled", actions: ["settle"] });
  });

  it("settles under reduced motion or when the visual is off screen", () => {
    expect(walk([0.4, 0.6], { visible: true, reduced: true }).actions).toEqual(["settle"]);
    expect(walk([0.4, 0.6], { visible: false, reduced: false }).actions).toEqual(["settle"]);
  });
});

describe("camera", () => {
  const vp = { width: 1200, height: 800 };

  it("the wide shot is the identity transform", () => {
    expect(cameraFor(wideShot(vp))).toEqual({ x: 0, y: 0, zoom: 1 });
  });

  it("holds the focus at the screen point", () => {
    const shot = { focus: { x: 300, y: 200 }, zoom: 2.6, screen: { x: 800, y: 400 } };
    const cam = cameraFor(shot);
    const onScreen = worldToViewport(shot.focus, cam, { x: 0, y: 0 });
    expect(onScreen.x).toBeCloseTo(800);
    expect(onScreen.y).toBeCloseTo(400);
    const back = viewportToWorld(onScreen, cam, { x: 0, y: 0 });
    expect(back.x).toBeCloseTo(300);
    expect(back.y).toBeCloseTo(200);
  });

  it("blends zoom geometrically and clamps t", () => {
    const a = wideShot(vp);
    const b = { focus: { x: 0, y: 0 }, zoom: 4, screen: { x: 0, y: 0 } };
    expect(blendShots(a, b, 0.5).zoom).toBeCloseTo(2);
    expect(blendShots(a, b, -1)).toEqual(a);
    expect(blendShots(a, b, 2).zoom).toBeCloseTo(4);
  });
});

describe("anchors", () => {
  it("maps a local box through the camera's scale on the measured rect", () => {
    const anchor = localToViewport(
      { x: 10, y: 20, width: 4, height: 4 },
      { left: 100, top: 50, width: 400, height: 200 },
      { width: 200, height: 100 },
    );
    expect(anchor).toEqual({ x: 120, y: 90, width: 8, height: 8 });
  });

  it("maps artboard units through a contain fit", () => {
    const box = artboardToLocal({ x: 200, y: 200, width: 300, height: 300 }, { width: 400, height: 400 }, { width: 200, height: 100 });
    expect(box).toEqual({ x: 100, y: 50, width: 75, height: 75 });
  });
});

describe("EntityMap", () => {
  const loan: Entity = {
    id: "loan-1",
    semanticType: "loan",
    dataReference: "sim:test/loan/1",
    representation: "data-point",
    highlighted: true,
    state: { shocked: false },
  };

  it("keeps identity across a change of representation", () => {
    const map = new EntityMap();
    map.register(loan);
    expect(map.update("loan-1", { representation: "illustration" })).toBe(true);
    expect(map.get("loan-1")).toMatchObject({ id: "loan-1", dataReference: "sim:test/loan/1", representation: "illustration" });
  });

  it("reports no change and does not notify for an identical patch", () => {
    const map = new EntityMap();
    map.register(loan);
    let calls = 0;
    map.subscribe(() => calls++);
    const before = map.snapshot();
    expect(map.update("loan-1", { representation: "data-point", state: { shocked: false } })).toBe(false);
    expect(calls).toBe(0);
    expect(map.snapshot()).toBe(before);
  });

  it("refuses geometry in state", () => {
    const map = new EntityMap();
    expect(() => map.register({ ...loan, state: { x: 3 } })).toThrow(/geometry/);
    map.register(loan);
    expect(() => map.update("loan-1", { state: { anchor: {} } })).toThrow(/geometry/);
  });

  it("refuses updates to unknown entities", () => {
    expect(() => new EntityMap().update("nope", { highlighted: false })).toThrow();
  });
});

describe("household transition", () => {
  it("fires the shock with the household fully open and labelled", () => {
    const at = transitionAt(SHOCK_CUE.at);
    expect(at.open).toBe(1);
    expect(at.annotate).toBe(1);
    expect(at.focus).toBe(1);
  });

  it("goes wide → focus → open → closed → wide, and the book moves only after the loan", () => {
    const first = TRANSITION_POSES[0];
    const last = TRANSITION_POSES[TRANSITION_POSES.length - 1];
    expect(first).toMatchObject({ focus: 0, open: 0 });
    expect(last).toMatchObject({ focus: 0, open: 0, featuredShock: 1, bookShock: 1 });
    const featuredAt = TRANSITION_POSES.find((p) => p.featuredShock === 1)!.at;
    const bookAt = TRANSITION_POSES.find((p) => p.bookShock === 1)!.at;
    expect(featuredAt).toBeGreaterThan(SHOCK_CUE.at);
    expect(bookAt).toBeGreaterThan(featuredAt);
    for (const p of TRANSITION_POSES) if (p.open > 0) expect(p.focus).toBe(1);
  });

  it("cuts under reduced motion: channels are only ever a pose's values", () => {
    for (let p = 0; p <= 1; p += 0.01) {
      const f = transitionAt(p, true);
      expect([0, 1]).toContain(f.focus);
      expect([0, 1]).toContain(f.open);
    }
  });

  it("scrubs continuously without reduced motion", () => {
    let prev = transitionAt(0);
    for (let p = 0.001; p <= 1; p += 0.001) {
      const f = transitionAt(p);
      expect(Math.abs(f.focus - prev.focus)).toBeLessThan(0.05);
      expect(Math.abs(f.open - prev.open)).toBeLessThan(0.05);
      prev = f;
    }
  });

  it("opens from exactly the loan's ring", () => {
    const lay = transitionLayout({ width: 1280, height: 800 });
    const ring = 8;
    const share = 0.375;
    expect(openScale(0, ring, lay.box, share) * lay.box * share).toBeCloseTo(ring);
    expect(openScale(1, ring, lay.box, share)).toBe(1);
    expect(openOpacity(0)).toBe(0);
    expect(openOpacity(1)).toBe(1);
  });

  it("keeps the household on screen at desktop and phone sizes", () => {
    for (const vp of [
      { width: 1280, height: 800 },
      { width: 390, height: 844 },
    ]) {
      const lay = transitionLayout(vp);
      const half = (lay.box * lay.zoom) / 2;
      expect(lay.screen.x - half).toBeGreaterThanOrEqual(0);
      expect(lay.screen.x + half).toBeLessThanOrEqual(vp.width);
      expect(lay.screen.y - half).toBeGreaterThanOrEqual(0);
      expect(lay.screen.y + half).toBeLessThanOrEqual(vp.height);
    }
  });
});
