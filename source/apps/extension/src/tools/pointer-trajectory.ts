import type { DragTrajectoryOptions } from "@/transport/types";

interface Point {
  x: number;
  y: number;
}
export interface PointerTrajectory {
  points: Point[];
  options: DragTrajectoryOptions;
}

/** Test-path variability only. This does not model or certify human behavior. */
export function validateDragTrajectory(options: unknown): string | undefined {
  if (options === undefined) return;
  if (!options || typeof options !== "object" || Array.isArray(options))
    return "trajectory must be an object";
  const o = options as DragTrajectoryOptions;
  if (o.kind !== "linear" && o.kind !== "bezier") return "unknown trajectory kind";
  if (o.seed !== undefined && (!Number.isInteger(o.seed) || o.seed < 0 || o.seed > 0xffffffff))
    return "trajectory seed must be an unsigned 32-bit integer";
  for (const [name, value, maximum] of [
    ["curvature_px", o.curvature_px, 100],
    ["jitter_px", o.jitter_px, 16],
  ] as const) {
    if (
      value !== undefined &&
      (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > maximum)
    )
      return name + " is outside its finite nonnegative bound";
  }
}

/** Precompute a bounded, seeded cubic Bezier path; validate all points before input.
 * No overshoot, reattempt, anti-detection logic, browser spoofing or CAPTCHA logic.
 * The final point is assigned exactly, independently of floating-point interpolation.
 */
export function buildPointerTrajectory(
  from: Point,
  to: Point,
  steps: number,
  options?: DragTrajectoryOptions,
): PointerTrajectory {
  const invalid = validateDragTrajectory(options);
  if (invalid) throw new TypeError(invalid);
  if (
    !Number.isInteger(steps) ||
    steps < 1 ||
    steps > 120 ||
    ![from.x, from.y, to.x, to.y].every(Number.isFinite)
  )
    throw new TypeError("invalid path geometry");
  if (!options || options.kind === "linear") {
    return {
      options: { kind: "linear" },
      points: Array.from({ length: steps }, (_, i) => {
        const t = (i + 1) / steps;
        return i === steps - 1
          ? { ...to }
          : { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
      }),
    };
  }
  const seed = options.seed ?? crypto.getRandomValues(new Uint32Array(1))[0];
  let state = seed;
  const random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let n = Math.imul(state ^ (state >>> 15), state | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
  const dx = to.x - from.x,
    dy = to.y - from.y,
    length = Math.hypot(dx, dy);
  const nx = length ? -dy / length : 0,
    ny = length ? dx / length : 0;
  const curvature = options.curvature_px ?? 18,
    jitter = options.jitter_px ?? 2;
  const offset1 = (random() * 2 - 1) * curvature,
    offset2 = (random() * 2 - 1) * curvature;
  const c1 = { x: from.x + dx / 3 + nx * offset1, y: from.y + dy / 3 + ny * offset1 };
  const c2 = { x: from.x + (dx * 2) / 3 + nx * offset2, y: from.y + (dy * 2) / 3 + ny * offset2 };
  const phase = random() * Math.PI * 2;
  const points = Array.from({ length: steps }, (_, i) => {
    if (i === steps - 1) return { ...to };
    const t = (i + 1) / steps,
      u = 1 - t;
    const noise = Math.sin(Math.PI * t) * Math.sin(4 * Math.PI * t + phase) * jitter;
    return {
      x:
        u * u * u * from.x +
        3 * u * u * t * c1.x +
        3 * u * t * t * c2.x +
        t * t * t * to.x +
        nx * noise,
      y:
        u * u * u * from.y +
        3 * u * u * t * c1.y +
        3 * u * t * t * c2.y +
        t * t * t * to.y +
        ny * noise,
    };
  });
  return { points, options: { kind: "bezier", seed, curvature_px: curvature, jitter_px: jitter } };
}
