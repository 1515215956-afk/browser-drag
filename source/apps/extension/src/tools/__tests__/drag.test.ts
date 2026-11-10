import { afterEach, describe, expect, it, vi } from "vitest";
import { SessionManager } from "@/session-manager/manager";
import type { DragParams } from "@/transport/types";
import { handleDrag, type InteractionDeps } from "../interaction";
import { guardedRunner } from "@/cooperation/action-guard";
import { ToolDispatcher } from "../dispatcher";
import type { ProtocolFrame } from "@/transport/types";
import type { FrameHandler, Transport } from "@/transport/transport";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function fixture() {
  const manager = new SessionManager({
    agentWindow: {
      create: async () => ({ windowId: 100, initialTabIds: [4] }),
      remove: async () => {},
      ensureActiveTab: async () => 4,
    },
  });
  const ctx = await manager.start("drag-test");
  ctx.refStore.set("e1", 1234, { tabId: 4 });
  const mouse: Array<Record<string, unknown>> = [];
  const controller = new AbortController();
  let hook = async (_p: Record<string, unknown>) => {};
  const deps: InteractionDeps = {
    signal: controller.signal,
    tabsApi: {
      get: async (id) => ({ id, windowId: id === 4 ? 100 : 900, active: true }) as chrome.tabs.Tab,
      query: async () => [{ id: 4, windowId: 100, active: true }] as chrome.tabs.Tab[],
    },
    cdp: {
      send: (async (_tab: number, method: string, p: Record<string, unknown> = {}) => {
        if (method === "Input.dispatchMouseEvent") {
          mouse.push(p);
          await hook(p);
          return {};
        }
        if (method === "Runtime.evaluate")
          return {
            result: { value: p.expression === "document.visibilityState" ? "visible" : "absent" },
          };
        if (method === "DOM.scrollIntoViewIfNeeded") return {};
        if (method === "DOM.getContentQuads")
          return { quads: [[10, 20, 110, 20, 110, 60, 10, 60]] };
        if (method === "Page.getLayoutMetrics")
          return { cssLayoutViewport: { clientWidth: 1280, clientHeight: 720 } };
        throw new Error("unexpected CDP " + method);
      }) as InteractionDeps["cdp"]["send"],
    },
  };
  const params: DragParams = {
    session_id: "drag-test",
    tab_id: 4,
    ref: "@e1",
    delta_x: 200,
    delta_y: 50,
    duration_ms: 50,
    steps: 2,
  };
  return {
    manager,
    ctx,
    mouse,
    deps,
    params,
    controller,
    hook: (h: typeof hook) => {
      hook = h;
    },
  };
}

describe("experimental native drag", () => {
  it("uses seeded curved movement while retaining endpoint and release", async () => {
    const f = await fixture();
    const result = await handleDrag(
      f.manager,
      { ...f.params, steps: 24, trajectory: { kind: "bezier", seed: 12345 } },
      f.deps,
    );
    expect(result).toMatchObject({
      released: true,
      to: { x: 260, y: 90 },
      trajectory: { kind: "bezier", seed: 12345 },
    });
    expect(f.mouse.at(-1)).toMatchObject({ type: "mouseReleased", x: 260, y: 90 });
  });
  it.each([
    { kind: "invalid" },
    { kind: "bezier", seed: -1 },
    { kind: "bezier", jitter_px: Infinity },
  ])("rejects malformed trajectories before input %j", async (trajectory) => {
    const f = await fixture();
    expect(
      await handleDrag(f.manager, { ...f.params, trajectory } as DragParams, f.deps),
    ).toMatchObject({ code: "invalid_params" });
    expect(f.mouse).toEqual([]);
  });
  it("preflights the entire curved path, not only the two endpoints", async () => {
    const f = await fixture();
    const original = f.deps.cdp.send;
    f.deps.cdp.send = (async (tab, method, p) => {
      if (method === "DOM.getContentQuads") return { quads: [[10, 0, 110, 0, 110, 4, 10, 4]] };
      return original(tab, method, p);
    }) as typeof original;
    const { buildPointerTrajectory } = await import("../pointer-trajectory");
    let seed = 0;
    while (
      !buildPointerTrajectory({ x: 60, y: 2 }, { x: 260, y: 2 }, 24, {
        kind: "bezier",
        seed,
        curvature_px: 100,
        jitter_px: 16,
      }).points.some((p) => p.y < 0)
    )
      seed++;
    expect(
      await handleDrag(
        f.manager,
        {
          ...f.params,
          delta_y: 0,
          steps: 24,
          trajectory: { kind: "bezier", seed, curvature_px: 100, jitter_px: 16 },
        },
        f.deps,
      ),
    ).toMatchObject({ code: "invalid_params" });
    expect(f.mouse).toEqual([]);
  });
  it("routes tool.drag through the normal extension dispatcher", async () => {
    const f = await fixture();
    vi.stubGlobal("chrome", { tabs: f.deps.tabsApi });
    const sent: ProtocolFrame[] = [];
    let receive: FrameHandler | undefined;
    const transport: Transport = {
      state: "connected",
      connect: async () => {},
      disconnect: async () => {},
      send: (frame) => {
        sent.push(frame);
      },
      onMessage: (handler) => {
        receive = handler;
        return {
          dispose: () => {
            receive = undefined;
          },
        };
      },
      onConnectionStateChange: () => ({ dispose: () => {} }),
    };
    const resumed = vi.fn();
    const dispatcher = new ToolDispatcher({
      transport,
      sessions: f.manager,
      onBrowserControlResumed: resumed,
      cdp: { ...f.deps.cdp, detachSession: async () => {} } as never,
    });
    dispatcher.start();
    try {
      receive!({ id: "drag-rpc", method: "tool.drag", params: f.params });
      await vi.waitFor(() => expect(sent.some((p) => "id" in p && p.id === "drag-rpc")).toBe(true));
      expect(sent).toContainEqual(
        expect.objectContaining({
          id: "drag-rpc",
          result: expect.objectContaining({ released: true, to: { x: 260, y: 90 } }),
        }),
      );
      expect(resumed).toHaveBeenCalledWith("drag-test");
    } finally {
      dispatcher.stop();
    }
  });
  it("holds exactly one left press through moves and releases at destination", async () => {
    const f = await fixture();
    const result = await handleDrag(f.manager, f.params, f.deps);
    expect(result).toMatchObject({ from: { x: 60, y: 40 }, to: { x: 260, y: 90 }, released: true });
    expect(f.mouse.map((p) => [p.type, p.buttons])).toEqual([
      ["mouseMoved", 0],
      ["mousePressed", 1],
      ["mouseMoved", 1],
      ["mouseMoved", 1],
      ["mouseReleased", 0],
    ]);
  });
  it.each([
    { delta_x: NaN },
    { delta_y: Infinity },
    { delta_x: 4001 },
    { delta_x: 0, delta_y: 0 },
    { steps: 0 },
    { steps: 121 },
    { steps: 1.5 },
    { duration_ms: 49 },
    { duration_ms: 5001 },
    { timeout_ms: 10 },
    { timeout_ms: 30001 },
    { delta_x: "100" },
  ])("rejects malformed parameters without input %j", async (invalid) => {
    const f = await fixture();
    const result = await handleDrag(f.manager, { ...f.params, ...invalid } as DragParams, f.deps);
    expect(result).toMatchObject({ code: "invalid_params" });
    expect(f.mouse).toEqual([]);
  });
  it("denies unborrowed user-window input", async () => {
    const f = await fixture();
    expect(await handleDrag(f.manager, { ...f.params, tab_id: 9 }, f.deps)).toMatchObject({
      code: "permission_denied",
    });
    expect(f.mouse).toEqual([]);
  });
  it("rejects stale refs and ambiguous ref+selector", async () => {
    const f = await fixture();
    expect(await handleDrag(f.manager, { ...f.params, ref: "@e99" }, f.deps)).toMatchObject({
      code: "not_found",
    });
    expect(await handleDrag(f.manager, { ...f.params, selector: ".other" }, f.deps)).toMatchObject({
      code: "invalid_params",
    });
    expect(f.mouse).toEqual([]);
  });
  it("rejects out-of-viewport paths before any mouse input", async () => {
    const f = await fixture();
    expect(await handleDrag(f.manager, { ...f.params, delta_x: -100 }, f.deps)).toMatchObject({
      code: "invalid_params",
    });
    expect(f.mouse).toEqual([]);
  });
  it("cancels before press without any input", async () => {
    const f = await fixture();
    f.controller.abort();
    expect(await handleDrag(f.manager, f.params, f.deps)).toMatchObject({ code: "cancelled" });
    expect(f.mouse).toEqual([]);
  });
  it.each([
    "press",
    "move",
    "press-error",
    "move-error",
    "document-change",
  ])("releases after interruption: %s", async (reason) => {
    const f = await fixture();
    f.hook(async (p) => {
      if (p.type === "mousePressed") {
        if (reason === "press") f.controller.abort();
        if (reason === "press-error") throw new Error("lost press acknowledgement");
        if (reason === "document-change") f.ctx.refStore.invalidateTab(4);
      }
      if (p.type === "mouseMoved" && p.buttons === 1) {
        if (reason === "move") f.controller.abort();
        if (reason === "move-error") throw new Error("move failed");
      }
    });
    expect(await handleDrag(f.manager, f.params, f.deps)).toHaveProperty("code");
    expect(f.mouse.at(-1)).toMatchObject({ type: "mouseReleased", buttons: 0 });
    expect(f.mouse.filter((p) => p.type === "mousePressed")).toHaveLength(1);
    expect(f.mouse.filter((p) => p.type === "mouseMoved" && p.buttons === 1).length).toBeLessThan(
      2,
    );
  });
  it("does not report success if release fails", async () => {
    const f = await fixture();
    f.hook(async (p) => {
      if (p.type === "mouseReleased") throw new Error("release failed");
    });
    expect(await handleDrag(f.manager, f.params, f.deps)).toMatchObject({
      code: "cdp_failed",
      data: { effect_state: "unknown", cleanup_error: expect.any(String) },
    });
  });
  it("releases on deadline and does not issue later movement", async () => {
    const f = await fixture();
    const now = Date.now();
    let elapsed = 0;
    vi.spyOn(Date, "now").mockImplementation(() => now + elapsed);
    f.hook(async (p) => {
      if (p.type === "mousePressed") elapsed = 200;
    });
    expect(await handleDrag(f.manager, { ...f.params, timeout_ms: 100 }, f.deps)).toMatchObject({
      code: "timeout",
    });
    expect(f.mouse.map((p) => p.type)).toEqual(["mouseMoved", "mousePressed", "mouseReleased"]);
  });
  it("serializes concurrent drag calls on one tab", async () => {
    const f = await fixture();
    const first = handleDrag(f.manager, f.params, f.deps);
    await vi.waitFor(() => expect(f.mouse.some((p) => p.type === "mousePressed")).toBe(true));
    expect(await handleDrag(f.manager, f.params, f.deps)).toMatchObject({ code: "invalid_params" });
    expect(await first).toMatchObject({ released: true });
  });
  it("uses existing cooperation authority while allowing its own cleanup after cancellation", async () => {
    const f = await fixture();
    f.hook(async (p) => {
      if (p.type === "mousePressed") f.controller.abort();
    });
    f.deps.cdp = guardedRunner(f.deps.cdp, {
      prepare: async () => {
        if (f.controller.signal.aborted) throw new Error("authority stopped");
      },
    });
    expect(await handleDrag(f.manager, f.params, f.deps)).toMatchObject({ code: "cancelled" });
    expect(f.mouse.at(-1)).toMatchObject({ type: "mouseReleased" });
  });
});
