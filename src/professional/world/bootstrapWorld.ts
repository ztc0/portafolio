import type { PresentationCoordinator } from "../PresentationCoordinator";
import type { BrowserWorldRuntimeOptions, WorldRuntime } from "./createWorldRuntime";

export interface WorldControls {
  readonly canvasHost: HTMLElement;
  readonly start: HTMLButtonElement;
  readonly pause: HTMLButtonElement;
  readonly exit: HTMLButtonElement;
}

export interface WorldCapabilities {
  readonly supportsWebGL: boolean;
  readonly prefersReducedMotion: boolean;
}

export type WorldRuntimeFactory = (
  options: BrowserWorldRuntimeOptions,
) => WorldRuntime | Promise<WorldRuntime>;

export interface BootstrapWorldOptions {
  readonly controls: WorldControls;
  readonly coordinator: PresentationCoordinator;
  readonly capabilities: WorldCapabilities;
  readonly loadRuntime?: () => Promise<WorldRuntimeFactory>;
}

export interface WorldBootstrapController {
  readonly ready: Promise<void>;
  readonly exit: () => void;
  readonly dispose: () => void;
}

export function bootstrapWorld({
  controls,
  coordinator,
  capabilities,
  loadRuntime = loadBrowserRuntime,
}: BootstrapWorldOptions): WorldBootstrapController {
  let runtime: WorldRuntime | null = null;
  let disposed = false;
  let paused = false;
  let loading: Promise<void> | null = null;
  let requestVersion = 0;

  const report = coordinator.reportWorldIntent;

  const safelyDisposeRuntime = (candidate: WorldRuntime | null) => {
    try {
      candidate?.dispose();
    } catch {
      // The semantic presenter still receives fallback intent after a partial runtime cleanup.
    }
  };

  const safelyClearCanvas = () => {
    try {
      controls.canvasHost.replaceChildren();
    } catch {
      // A detached host cannot prevent the semantic fallback from remaining available.
    }
  };

  const exit = (fallback = false) => {
    requestVersion += 1;
    const activeRuntime = runtime;
    runtime = null;
    paused = false;
    safelyDisposeRuntime(activeRuntime);
    safelyClearCanvas();
    report(fallback ? "fallback" : "exited");
  };

  const start = async (visitorIntent = false) => {
    if (
      disposed ||
      !capabilities.supportsWebGL ||
      (capabilities.prefersReducedMotion && !visitorIntent)
    ) {
      report("fallback");
      return;
    }

    if (runtime) {
      if (paused && visitorIntent) {
        try {
          runtime.resume();
          paused = false;
          report("resumed");
        } catch {
          exit(true);
        }
      }
      return;
    }

    if (loading) {
      return loading;
    }

    const attemptVersion = requestVersion;
    const pending = (async () => {
      try {
        const factory = await loadRuntime();
        if (disposed || requestVersion !== attemptVersion) {
          return;
        }
        const presentation = coordinator.getCurrentPresentation();
        const lateRuntime = await factory({
          canvasHost: controls.canvasHost,
          ...presentation,
          onContextLost: () => {
            exit(true);
          },
          onFailure: () => {
            exit(true);
          },
        });
        if (disposed || requestVersion !== attemptVersion) {
          safelyDisposeRuntime(lateRuntime);
          return;
        }
        runtime = lateRuntime;
        report("ready");
      } catch {
        if (!disposed && requestVersion === attemptVersion) {
          exit(true);
        }
      }
    })();
    loading = pending;
    void pending.finally(() => {
      if (loading === pending) {
        loading = null;
      }
    });
    return pending;
  };

  const onStart = () => {
    void start(true);
  };
  const onPause = () => {
    if (!runtime) {
      return;
    }
    try {
      if (paused) {
        runtime.resume();
        paused = false;
        report("resumed");
        return;
      }
      runtime.pause();
      paused = true;
      report("paused");
    } catch {
      exit(true);
    }
  };
  const onExit = () => {
    exit();
  };

  controls.start.addEventListener("click", onStart);
  controls.pause.addEventListener("click", onPause);
  controls.exit.addEventListener("click", onExit);

  const ready = start();

  return {
    ready,
    exit: () => exit(),
    dispose: () => {
      if (disposed) {
        return;
      }
      disposed = true;
      try {
        controls.start.removeEventListener("click", onStart);
      } catch {
        // Continue through all cleanup steps.
      }
      try {
        controls.pause.removeEventListener("click", onPause);
      } catch {
        // Continue through all cleanup steps.
      }
      try {
        controls.exit.removeEventListener("click", onExit);
      } catch {
        // Continue through all cleanup steps.
      }
      exit();
    },
  };
}

async function loadBrowserRuntime(): Promise<WorldRuntimeFactory> {
  const { createBrowserWorldRuntime } = await import("./createWorldRuntime");
  return createBrowserWorldRuntime;
}
