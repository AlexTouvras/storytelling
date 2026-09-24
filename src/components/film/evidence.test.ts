import { describe, expect, it } from "vitest";
import pack from "../../../data/figures/when-rates-rise.v2.json";

describe("evidence board sources", () => {
  it("keeps the displayed observed and published figures in the frozen pack", () => {
    const dti = pack.observed.find((row) => row.id === "sector-dti");
    const housing = pack.observed.find((row) => row.id === "ces-housing-10-2");
    const mortgagor = pack.observed.find((row) => row.id === "ces-mortgagor-12");
    const wp = pack.calculatedPublished.find((row) => row.id === "wp3053-dsti");
    expect(dti?.label).toContain("92.8%");
    expect(dti?.label).toContain("87.0%");
    expect(housing?.label).toContain("10.2%");
    expect(housing?.label).toContain("5.5%");
    expect(mortgagor?.label).toContain("12%");
    expect(wp?.label).toContain("26%");
    expect(wp?.label).toContain("33%");
  });
});
