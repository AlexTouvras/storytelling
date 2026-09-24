import { describe, expect, it } from "vitest";
import { beatAt, frameAt } from "@/components/film/frame";

const featured = { shareBefore: 0.14, shareAfter: 0.014 };

describe("film frame", () => {
  it("opens on the calm book and ends on the cut", () => {
    const open = frameAt(0, featured);
    const end = frameAt(1, featured);
    expect(open.bookShock).toBe(0);
    expect(open.featuredShock).toBe(0);
    expect(open.population).toBeGreaterThan(0);
    expect(end.bookShock).toBe(1);
    expect(end.sleeve).toBe(1);
    expect(end.cut).toBe(1);
    expect(beatAt(0)).toBe(0);
    expect(beatAt(1)).toBe(6);
  });

  it("reprices the featured loan before the rest of the book", () => {
    const mid = frameAt(0.2, featured);
    expect(mid.featuredShock).toBeGreaterThan(mid.bookShock);
    expect(mid.bookShock).toBe(0);
    expect(mid.focusY).toBeGreaterThan(0.5);
  });

  it("does not move book shock backwards", () => {
    let prev = 0;
    for (let i = 0; i <= 40; i++) {
      const shock = frameAt(i / 40, featured).bookShock;
      expect(shock).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = shock;
    }
  });

  it("snaps to pose endpoints when motion is reduced", () => {
    const frame = frameAt(0.2, featured, true);
    expect(frame.featuredShock === 0 || frame.featuredShock === 1).toBe(true);
    expect(frame.beat).toBe(beatAt(0.2));
  });
});
