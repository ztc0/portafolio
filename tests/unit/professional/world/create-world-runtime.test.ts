/* eslint-disable @typescript-eslint/unbound-method */
import { describe, expect, it, vi } from "vitest";

import { createWorldRuntime } from "../../../../src/professional/world/createWorldRuntime";

function createRuntimeFacades() {
  const contextLost = new EventTarget();
  const canvas = Object.assign(contextLost, {
    dataset: {},
    remove: vi.fn(),
    setAttribute: vi.fn(),
    removeEventListener: vi.fn(contextLost.removeEventListener.bind(contextLost)),
  }) as unknown as HTMLCanvasElement;
  const renderer = {
    render: vi.fn(),
    setSize: vi.fn(),
    setPixelRatio: vi.fn(),
    dispose: vi.fn(),
    forceContextLoss: vi.fn(),
  };
  const geometry = { dispose: vi.fn() };
  const material = { dispose: vi.fn() };
  const texture = { dispose: vi.fn() };
  const target = { dispose: vi.fn() };
  const opening = {
    detach: vi.fn(),
    resources: [geometry, material, texture, target],
  };
  const scheduledCallbacks: FrameRequestCallback[] = [];
  const scheduler = {
    request: vi.fn((callback: FrameRequestCallback) => {
      scheduledCallbacks.push(callback);
      return scheduledCallbacks.length;
    }),
    cancel: vi.fn(),
  };
  const observer = { observe: vi.fn(), disconnect: vi.fn() };
  const camera = { aspect: 1, updateProjectionMatrix: vi.fn() };
  const canvasHost = { append: vi.fn() } as unknown as HTMLElement;
  let viewport = { width: 320, height: 180 };
  let resizeCallback: (() => void) | null = null;

  return {
    canvasHost,
    renderer,
    geometry,
    material,
    texture,
    target,
    opening,
    scheduler,
    observer,
    canvas,
    camera,
    scheduledCallbacks,
    setViewport: (width: number, height: number) => {
      viewport = { width, height };
    },
    triggerObservedResize: () => {
      resizeCallback?.();
    },
    facades: {
      createCanvas: () => canvas,
      createRenderer: () => renderer,
      createScene: () => ({}),
      createCamera: () => camera,
      createOpening: () => opening,
      createResizeObserver: (callback: () => void) => {
        resizeCallback = callback;
        return observer;
      },
      scheduler,
      pixelRatio: () => 1,
      viewport: () => viewport,
    },
  };
}

describe("world runtime", () => {
  it("sizes from the measured host and directly releases registered resources once", () => {
    const fixture = createRuntimeFacades();
    const runtime = createWorldRuntime({
      canvasHost: fixture.canvasHost,
      facades: fixture.facades,
    });

    expect(fixture.renderer.setSize).toHaveBeenCalledWith(320, 180, false);
    expect(fixture.camera.aspect).toBeCloseTo(320 / 180);
    expect(fixture.camera.updateProjectionMatrix).toHaveBeenCalledTimes(1);
    runtime.dispose();
    runtime.dispose();

    expect(fixture.scheduler.cancel).toHaveBeenCalledWith(1);
    expect(fixture.observer.disconnect).toHaveBeenCalledTimes(1);
    expect(fixture.canvas.remove).toHaveBeenCalledTimes(1);
    expect(fixture.renderer.dispose).toHaveBeenCalledTimes(1);
    expect(fixture.renderer.forceContextLoss).toHaveBeenCalledTimes(1);
    expect(fixture.opening.detach).toHaveBeenCalledTimes(1);
    expect(fixture.geometry.dispose).toHaveBeenCalledTimes(1);
    expect(fixture.material.dispose).toHaveBeenCalledTimes(1);
    expect(fixture.texture.dispose).toHaveBeenCalledTimes(1);
    expect(fixture.target.dispose).toHaveBeenCalledTimes(1);
  });

  it("updates camera projection from the captured ResizeObserver callback and deduplicates unchanged host measurements", () => {
    const fixture = createRuntimeFacades();
    const runtime = createWorldRuntime({
      canvasHost: fixture.canvasHost,
      facades: fixture.facades,
    });

    expect(fixture.observer.observe).toHaveBeenCalledWith(fixture.canvasHost);
    fixture.setViewport(640, 320);
    fixture.triggerObservedResize();
    expect(fixture.renderer.setSize).toHaveBeenLastCalledWith(640, 320, false);
    expect(fixture.camera.aspect).toBeCloseTo(2);
    expect(fixture.camera.updateProjectionMatrix).toHaveBeenCalledTimes(2);

    fixture.triggerObservedResize();
    expect(fixture.renderer.setSize).toHaveBeenCalledTimes(2);
    expect(fixture.camera.updateProjectionMatrix).toHaveBeenCalledTimes(2);
    runtime.dispose();
  });

  it("notifies the boundary and stops after a render or RAF failure", () => {
    const fixture = createRuntimeFacades();
    const onFailure = vi.fn();
    fixture.renderer.render.mockImplementation(() => {
      throw new Error("render failed");
    });
    createWorldRuntime({ canvasHost: fixture.canvasHost, facades: fixture.facades, onFailure });

    fixture.scheduledCallbacks[0]?.(0);
    expect(onFailure).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ message: "render failed" }),
    );
    expect(fixture.scheduler.request).toHaveBeenCalledTimes(1);

    const rafFixture = createRuntimeFacades();
    const rafFailure = vi.fn();
    rafFixture.scheduler.request
      .mockImplementationOnce((callback) => {
        rafFixture.scheduledCallbacks.push(callback);
        return 1;
      })
      .mockImplementationOnce(() => {
        throw new Error("RAF failed");
      });
    createWorldRuntime({
      canvasHost: rafFixture.canvasHost,
      facades: rafFixture.facades,
      onFailure: rafFailure,
    });
    rafFixture.scheduledCallbacks[0]?.(0);
    expect(rafFailure).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ message: "RAF failed" }),
    );
  });

  it("attempts every cleanup exactly once when individual cleanup operations throw", () => {
    const fixture = createRuntimeFacades();
    fixture.scheduler.cancel.mockImplementation(() => {
      throw new Error("cancel failed");
    });
    fixture.canvas.removeEventListener = vi.fn(() => {
      throw new Error("listener failed");
    });
    fixture.observer.disconnect.mockImplementation(() => {
      throw new Error("observer failed");
    });
    fixture.geometry.dispose.mockImplementation(() => {
      throw new Error("geometry failed");
    });
    fixture.renderer.dispose.mockImplementation(() => {
      throw new Error("renderer failed");
    });
    fixture.renderer.forceContextLoss.mockImplementation(() => {
      throw new Error("context failed");
    });
    fixture.canvas.remove = vi.fn(() => {
      throw new Error("canvas failed");
    });
    const runtime = createWorldRuntime({
      canvasHost: fixture.canvasHost,
      facades: fixture.facades,
    });

    expect(() => runtime.dispose()).not.toThrow();
    runtime.dispose();
    expect(fixture.scheduler.cancel).toHaveBeenCalledTimes(1);
    expect(fixture.canvas.removeEventListener).toHaveBeenCalledTimes(1);
    expect(fixture.observer.disconnect).toHaveBeenCalledTimes(1);
    expect(fixture.geometry.dispose).toHaveBeenCalledTimes(1);
    expect(fixture.material.dispose).toHaveBeenCalledTimes(1);
    expect(fixture.texture.dispose).toHaveBeenCalledTimes(1);
    expect(fixture.target.dispose).toHaveBeenCalledTimes(1);
    expect(fixture.renderer.dispose).toHaveBeenCalledTimes(1);
    expect(fixture.renderer.forceContextLoss).toHaveBeenCalledTimes(1);
    expect(fixture.canvas.remove).toHaveBeenCalledTimes(1);
  });
});
