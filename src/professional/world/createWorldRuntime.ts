import type * as Three from "three";

import type { ProfessionalRecordId, ProfessionalZone } from "../schema";
import { createProceduralOpening } from "./createProceduralOpening";

export interface DisposableWorldResource {
  readonly dispose: () => void;
}

export interface WorldRenderer extends DisposableWorldResource {
  readonly render: (scene: object, camera: object) => void;
  readonly setSize: (width: number, height: number, updateStyle?: boolean) => void;
  readonly setPixelRatio: (ratio: number) => void;
  readonly forceContextLoss?: () => void;
}

export interface WorldOpening {
  readonly detach: () => void;
  readonly resources: readonly DisposableWorldResource[];
}

export interface WorldCamera {
  aspect: number;
  readonly updateProjectionMatrix: () => void;
}

export interface WorldResizeObserver {
  readonly observe: (target: Element) => void;
  readonly disconnect: () => void;
}

export interface WorldRuntimeFacades {
  readonly createCanvas: () => HTMLCanvasElement;
  readonly createRenderer: (canvas: HTMLCanvasElement) => WorldRenderer;
  readonly createScene: () => object;
  readonly createCamera: () => WorldCamera;
  readonly createOpening: (scene: object) => WorldOpening;
  readonly createResizeObserver: (callback: () => void) => WorldResizeObserver;
  readonly scheduler: {
    readonly request: (callback: FrameRequestCallback) => number;
    readonly cancel: (identifier: number) => void;
  };
  readonly pixelRatio: () => number;
  readonly viewport: (host: HTMLElement) => { readonly width: number; readonly height: number };
}

export interface CreateWorldRuntimeOptions {
  readonly canvasHost: HTMLElement;
  readonly onContextLost?: () => void;
  readonly onFailure?: (error: unknown) => void;
  readonly facades: WorldRuntimeFacades;
}

export interface BrowserWorldRuntimeOptions {
  readonly canvasHost: HTMLElement;
  readonly currentFunctionId: ProfessionalRecordId;
  readonly currentZoneId: ProfessionalZone;
  readonly onContextLost?: () => void;
  readonly onFailure?: (error: unknown) => void;
}

export interface WorldRuntime {
  readonly pause: () => void;
  readonly resume: () => void;
  readonly dispose: () => void;
}

export function createWorldRuntime({
  canvasHost,
  onContextLost = () => undefined,
  onFailure = () => undefined,
  facades,
}: CreateWorldRuntimeOptions): WorldRuntime {
  let canvas: HTMLCanvasElement | null = null;
  let renderer: WorldRenderer | null = null;
  let opening: WorldOpening | null = null;
  let observer: WorldResizeObserver | null = null;
  let frameId: number | null = null;
  let scene: object | null = null;
  let camera: WorldCamera | null = null;
  let measuredWidth = 0;
  let measuredHeight = 0;
  let measuredPixelRatio = 0;
  let disposed = false;
  let failureReported = false;

  const reportFailure = (error: unknown) => {
    if (failureReported) {
      return;
    }
    failureReported = true;
    try {
      onFailure(error);
    } catch {
      // A host boundary failure cannot reopen the animation loop.
    }
  };

  const resize = () => {
    if (!renderer || disposed) {
      return;
    }
    const viewport = facades.viewport(canvasHost);
    const width = Math.max(viewport.width, 1);
    const height = Math.max(viewport.height, 1);
    const pixelRatio = Math.min(facades.pixelRatio(), 2);
    if (width === measuredWidth && height === measuredHeight && pixelRatio === measuredPixelRatio) {
      return;
    }
    measuredWidth = width;
    measuredHeight = height;
    measuredPixelRatio = pixelRatio;
    try {
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(width, height, false);
      if (camera) {
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      }
    } catch (error) {
      reportFailure(error);
    }
  };

  const pause = () => {
    const scheduledFrame = frameId;
    frameId = null;
    if (scheduledFrame === null) {
      return;
    }
    try {
      facades.scheduler.cancel(scheduledFrame);
    } catch (error) {
      reportFailure(error);
    }
  };

  const renderFrame: FrameRequestCallback = () => {
    if (disposed || !renderer || !scene || !camera) {
      return;
    }
    try {
      renderer.render(scene, camera);
      frameId = facades.scheduler.request(renderFrame);
    } catch (error) {
      frameId = null;
      reportFailure(error);
    }
  };

  const resume = () => {
    if (disposed || frameId !== null) {
      return;
    }
    try {
      frameId = facades.scheduler.request(renderFrame);
    } catch (error) {
      reportFailure(error);
    }
  };

  const onWebglContextLost = (event: Event) => {
    event.preventDefault();
    pause();
    try {
      onContextLost();
    } catch (error) {
      reportFailure(error);
    }
  };

  const dispose = () => {
    if (disposed) {
      return;
    }
    disposed = true;

    const scheduledFrame = frameId;
    const ownedCanvas = canvas;
    const ownedObserver = observer;
    const ownedOpening = opening;
    const ownedRenderer = renderer;
    frameId = null;
    canvas = null;
    observer = null;
    opening = null;
    renderer = null;
    scene = null;
    camera = null;

    safelyRun(() => {
      if (scheduledFrame !== null) {
        facades.scheduler.cancel(scheduledFrame);
      }
    });
    safelyRun(() => ownedCanvas?.removeEventListener("webglcontextlost", onWebglContextLost));
    safelyRun(() => ownedObserver?.disconnect());
    safelyRun(() => ownedOpening?.detach());
    for (const resource of ownedOpening?.resources ?? []) {
      safelyRun(() => resource.dispose());
    }
    safelyRun(() => ownedRenderer?.dispose());
    safelyRun(() => ownedRenderer?.forceContextLoss?.());
    safelyRun(() => ownedCanvas?.remove());
  };

  try {
    canvas = facades.createCanvas();
    canvas.dataset.proceduralWorld = "true";
    canvas.setAttribute("aria-hidden", "true");
    canvasHost.append(canvas);
    renderer = facades.createRenderer(canvas);
    scene = facades.createScene();
    camera = facades.createCamera();
    opening = facades.createOpening(scene);
    observer = facades.createResizeObserver(resize);
    observer.observe(canvasHost);
    canvas.addEventListener("webglcontextlost", onWebglContextLost);
    resize();
    resume();
    return { pause, resume, dispose };
  } catch (error) {
    dispose();
    throw error;
  }
}

export async function createBrowserWorldRuntime(
  options: BrowserWorldRuntimeOptions,
): Promise<WorldRuntime> {
  const three = await import("three");
  return createWorldRuntime({ ...options, facades: createThreeFacades(three) });
}

function createThreeFacades(three: typeof Three): WorldRuntimeFacades {
  return {
    createCanvas: () => document.createElement("canvas"),
    createRenderer: (canvas) =>
      new three.WebGLRenderer({ alpha: true, antialias: true, canvas }) as unknown as WorldRenderer,
    createScene: () => new three.Scene(),
    createCamera: () => {
      const camera = new three.PerspectiveCamera(48, 1, 0.1, 100);
      camera.position.set(7, 4.5, 8);
      camera.lookAt(0, 1, 0);
      return camera;
    },
    createOpening: (scene) => createProceduralOpening({ three, scene: scene as Three.Scene }),
    createResizeObserver: (callback) => new ResizeObserver(callback),
    scheduler: {
      request: window.requestAnimationFrame.bind(window),
      cancel: window.cancelAnimationFrame.bind(window),
    },
    pixelRatio: () => window.devicePixelRatio,
    viewport: (host) => {
      const { height, width } = host.getBoundingClientRect();
      return { width, height };
    },
  };
}

function safelyRun(callback: () => void): void {
  try {
    callback();
  } catch {
    // Every owned cleanup step runs even if an earlier resource is already broken.
  }
}
