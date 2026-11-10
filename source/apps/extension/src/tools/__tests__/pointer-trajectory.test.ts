import { describe, it, expect } from "vitest";
import { buildPointerTrajectory, validateDragTrajectory } from "../pointer-trajectory";
import type { DragTrajectoryOptions } from "@/transport/types";

const from = { x: 100, y: 100 },
  to = { x: 340, y: 160 };
const options: DragTrajectoryOptions = {
  kind: "bezier",
  seed: 12345,
  curvature_px: 18,
  jitter_px: 2,
};
describe("bounded generic pointer trajectory", () => {
  it("preserves default linear behavior", () => {
    const p = buildPointerTrajectory(from, to, 24);
    expect(p.options.kind).toBe("linear");
    expect(p.points[0]).toEqual({ x: 110, y: 102.5 });
    expect(p.points.at(-1)).toEqual(to);
  });
  it("reproduces an explicit seed but changes paths with a different seed", () => {
    const a = buildPointerTrajectory(from, to, 24, options);
    expect(buildPointerTrajectory(from, to, 24, options)).toEqual(a);
    expect(buildPointerTrajectory(from, to, 24, { ...options, seed: 67890 }).points).not.toEqual(
      a.points,
    );
    expect(a.points.at(-1)).toEqual(to);
    expect(a.points[0]).not.toEqual({ x: 110, y: 102.5 });
  });
  it("returns a replayable seed for newly randomized paths", () => {
    const a = buildPointerTrajectory(from, to, 24, { kind: "bezier" });
    expect(Number.isInteger(a.options.seed)).toBe(true);
    expect(buildPointerTrajectory(from, to, 24, a.options)).toEqual(a);
  });
  it("keeps seeded variation finite, endpoint exact and deviations bounded", () => {
    for (let seed = 0; seed < 200; seed++) {
      const p = buildPointerTrajectory(from, to, 120, { ...options, seed });
      expect(p.points.at(-1)).toEqual(to);
      for (const q of p.points) {
        expect(Number.isFinite(q.x) && Number.isFinite(q.y)).toBe(true);
        const deviation =
          Math.abs((q.y - from.y) * 240 - (q.x - from.x) * 60) / Math.hypot(240, 60);
        expect(deviation).toBeLessThanOrEqual(20.000001);
      }
    }
  });
  it.each([
    null,
    [],
    {},
    { kind: "unknown" },
    { kind: "bezier", seed: -1 },
    { kind: "bezier", seed: 4294967296 },
    { kind: "bezier", seed: 1.5 },
    { kind: "bezier", curvature_px: NaN },
    { kind: "bezier", curvature_px: 101 },
    { kind: "bezier", jitter_px: Infinity },
    { kind: "bezier", jitter_px: 17 },
    { kind: "bezier", jitter_px: -1 },
  ])("rejects malformed trajectory %j", (o) => {
    expect(validateDragTrajectory(o)).toEqual(expect.any(String));
    expect(() => buildPointerTrajectory(from, to, 24, o as DragTrajectoryOptions)).toThrow();
  });
  it("supports a uint32 zero seed", () => {
    expect(buildPointerTrajectory(from, to, 24, { kind: "bezier", seed: 0 }).options.seed).toBe(0);
  });
});
