import { describe, expect, it, vi } from "vitest";

import {
  createPresentationCoordinator,
  WORLD_PRESENTATION_INTENT,
} from "../../../../src/professional/PresentationCoordinator";
import { bootstrapWorld } from "../../../../src/professional/world/bootstrapWorld";
import {
  PROFESSIONAL_LOCALE,
  PROFESSIONAL_RECORD_ID,
  PROFESSIONAL_ZONE,
} from "../../../../src/professional/schema";

function createCoordinator() {
  return createPresentationCoordinator({
    locale: PROFESSIONAL_LOCALE.EN,
    currentFunctionId: PROFESSIONAL_RECORD_ID.IDENTITY_PRIMARY,
    currentZoneId: PROFESSIONAL_ZONE.CAMPFIRE_CABIN,
  });
}

function createControls() {
  const listeners = new Map<string, EventListener>();
  const replaceChildren = vi.fn();
  const canvasHost = { replaceChildren } as unknown as HTMLElement;
  const removeStart = vi.fn();
  const removePause = vi.fn();
  const removeExit = vi.fn();
  const start = {
    addEventListener: vi.fn((_: string, listener: EventListener) =>
      listeners.set("start", listener),
    ),
    removeEventListener: removeStart,
  } as unknown as HTMLButtonElement;
  const pause = {
    addEventListener: vi.fn((_: string, listener: EventListener) =>
      listeners.set("pause", listener),
    ),
    removeEventListener: removePause,
  } as unknown as HTMLButtonElement;
  const exit = {
    addEventListener: vi.fn((_: string, listener: EventListener) =>
      listeners.set("exit", listener),
    ),
    removeEventListener: removeExit,
  } as unknown as HTMLButtonElement;

  return {
    canvasHost,
    start,
    pause,
    exit,
    listeners,
    removeStart,
    removePause,
    removeExit,
    replaceChildren,
  };
}

describe("world bootstrap", () => {
  it("gates lazy loading for reduced motion but permits an explicit visitor override", async () => {
    const controls = createControls();
    const coordinator = createCoordinator();
    const intents = vi.fn();
    coordinator.subscribeWorldIntents(intents);
    const loader = vi
      .fn()
      .mockResolvedValue(() => ({ pause: vi.fn(), resume: vi.fn(), dispose: vi.fn() }));
    const controller = bootstrapWorld({
      controls,
      coordinator,
      capabilities: { supportsWebGL: true, prefersReducedMotion: true },
      loadRuntime: loader,
    });

    await controller.ready;
    expect(loader).not.toHaveBeenCalled();
    expect(intents).toHaveBeenCalledWith(WORLD_PRESENTATION_INTENT.FALLBACK);

    controls.listeners.get("start")?.(new Event("click"));
    await Promise.resolve();
    await Promise.resolve();
    expect(loader).toHaveBeenCalledTimes(1);
    expect(intents).toHaveBeenCalledWith(WORLD_PRESENTATION_INTENT.READY);
    controller.dispose();
  });

  it("uses host-coordinator continuity and restores fallback when the runtime fails", async () => {
    const controls = createControls();
    const coordinator = createCoordinator();
    coordinator.selectFunction(
      PROFESSIONAL_RECORD_ID.PROJECT_ZERO,
      PROFESSIONAL_ZONE.PROJECTS_BOOK,
    );
    const intents = vi.fn();
    coordinator.subscribeWorldIntents(intents);
    let runtimeOptions: unknown;
    const controller = bootstrapWorld({
      controls,
      coordinator,
      capabilities: { supportsWebGL: true, prefersReducedMotion: false },
      loadRuntime: vi.fn().mockResolvedValue((options: unknown) => {
        runtimeOptions = options;
        return { pause: vi.fn(), resume: vi.fn(), dispose: vi.fn() };
      }),
    });

    await controller.ready;
    expect(runtimeOptions).toMatchObject({
      currentFunctionId: PROFESSIONAL_RECORD_ID.PROJECT_ZERO,
      currentZoneId: PROFESSIONAL_ZONE.PROJECTS_BOOK,
    });
    const failure = (runtimeOptions as { onFailure: (error: Error) => void }).onFailure;
    failure(new Error("render failed"));
    expect(intents).toHaveBeenLastCalledWith(WORLD_PRESENTATION_INTENT.FALLBACK);
    expect(controls.replaceChildren).toHaveBeenCalledTimes(1);
  });

  it("disposes a runtime that resolves after session disposal without becoming ready", async () => {
    const controls = createControls();
    const coordinator = createCoordinator();
    const intents = vi.fn();
    coordinator.subscribeWorldIntents(intents);
    let resolveRuntime!: (runtime: {
      pause: () => void;
      resume: () => void;
      dispose: () => void;
    }) => void;
    const runtimePromise = new Promise<{
      pause: () => void;
      resume: () => void;
      dispose: () => void;
    }>((resolve) => {
      resolveRuntime = resolve;
    });
    const dispose = vi.fn();
    const controller = bootstrapWorld({
      controls,
      coordinator,
      capabilities: { supportsWebGL: true, prefersReducedMotion: false },
      loadRuntime: vi.fn().mockResolvedValue(() => runtimePromise),
    });

    await Promise.resolve();
    controller.dispose();
    resolveRuntime({ pause: vi.fn(), resume: vi.fn(), dispose });
    await controller.ready;

    expect(dispose).toHaveBeenCalledTimes(1);
    expect(intents).not.toHaveBeenCalledWith(WORLD_PRESENTATION_INTENT.READY);
    expect(controls.replaceChildren).toHaveBeenCalledTimes(1);
  });

  it("removes listeners and disposes only once even when cleanup throws", async () => {
    const controls = createControls();
    const coordinator = createCoordinator();
    const dispose = vi.fn(() => {
      throw new Error("dispose failed");
    });
    const controller = bootstrapWorld({
      controls,
      coordinator,
      capabilities: { supportsWebGL: true, prefersReducedMotion: false },
      loadRuntime: vi.fn().mockResolvedValue(() => ({ pause: vi.fn(), resume: vi.fn(), dispose })),
    });

    await controller.ready;
    expect(() => controller.dispose()).not.toThrow();
    controller.dispose();
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(controls.removeStart).toHaveBeenCalledTimes(1);
    expect(controls.removePause).toHaveBeenCalledTimes(1);
    expect(controls.removeExit).toHaveBeenCalledTimes(1);
  });
});
