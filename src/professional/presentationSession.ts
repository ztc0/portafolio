import {
  createPresentationCoordinator,
  type PresentationCoordinator,
  type PresentationCoordinatorOptions,
  type WorldPresentationIntent,
} from "./PresentationCoordinator";
import type { WorldBootstrapController } from "./world/bootstrapWorld";

export interface WorldCopy {
  readonly ready: string;
  readonly paused: string;
  readonly fallback: string;
  readonly pause: string;
  readonly resume: string;
}

interface WorldControls {
  readonly canvasHost: HTMLElement;
  readonly status: HTMLElement;
  readonly start: HTMLButtonElement;
  readonly pause: HTMLButtonElement;
  readonly exit: HTMLButtonElement;
}

interface PresentationSession {
  readonly coordinator: PresentationCoordinator;
  controller: WorldBootstrapController | null;
  startup: Promise<void> | null;
  cancelStartup: (() => void) | null;
  stopPresenting: (() => void) | null;
  stopOuterTeardown: (() => void) | null;
}

interface RetainedStartupInputs {
  readonly options: PresentationCoordinatorOptions;
  readonly copy: WorldCopy;
}

const sessions = new WeakMap<HTMLElement, PresentationSession>();

export function getPresentationSession(
  host: HTMLElement,
  options: PresentationCoordinatorOptions,
): PresentationCoordinator {
  const existing = sessions.get(host);
  if (existing) {
    return existing.coordinator;
  }

  const session: PresentationSession = {
    coordinator: createPresentationCoordinator(options),
    controller: null,
    startup: null,
    cancelStartup: null,
    stopPresenting: null,
    stopOuterTeardown: null,
  };
  sessions.set(host, session);
  return session.coordinator;
}

export function startPresentationSession(
  host: HTMLElement,
  options: PresentationCoordinatorOptions,
  copy: WorldCopy,
): void {
  const coordinator = getPresentationSession(host, options);
  const session = sessions.get(host);
  if (!session || session.startup || session.controller) {
    return;
  }

  const controls = getWorldControls(host);
  session.stopPresenting = coordinator.subscribeWorldIntents((intent) => {
    presentWorldIntent(controls, copy, intent);
  });
  session.stopOuterTeardown = installOuterTeardown(host, { options, copy });

  session.startup = new Promise((resolve) => {
    const frameId = window.requestAnimationFrame(() => {
      session.cancelStartup = null;
      void import("./world/bootstrapWorld")
        .then(({ bootstrapWorld }) => {
          if (sessions.get(host) !== session) {
            return;
          }
          session.controller = bootstrapWorld({
            controls,
            coordinator,
            capabilities: {
              supportsWebGL: supportsWebGL(),
              prefersReducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
            },
          });
        })
        .catch(() => {
          coordinator.reportWorldIntent("fallback");
        })
        .finally(resolve);
    });
    session.cancelStartup = () => {
      window.cancelAnimationFrame(frameId);
      resolve();
    };
  });
}

export function disposePresentationSession(host: HTMLElement): void {
  const session = sessions.get(host);
  if (!session) {
    return;
  }

  sessions.delete(host);
  safelyRun(session.cancelStartup);
  session.cancelStartup = null;
  safelyRun(session.controller?.dispose);
  session.controller = null;
  safelyRun(session.stopPresenting);
  session.stopPresenting = null;
  safelyRun(session.stopOuterTeardown);
  session.stopOuterTeardown = null;
}

function presentWorldIntent(
  controls: WorldControls,
  copy: WorldCopy,
  intent: WorldPresentationIntent,
): void {
  if (intent === "ready" || intent === "resumed") {
    controls.status.textContent = copy.ready;
    controls.pause.disabled = false;
    controls.pause.textContent = copy.pause;
    return;
  }
  if (intent === "paused") {
    controls.status.textContent = copy.paused;
    controls.pause.disabled = false;
    controls.pause.textContent = copy.resume;
    return;
  }
  controls.status.textContent = copy.fallback;
  controls.pause.disabled = true;
  controls.pause.textContent = copy.pause;
}

function installOuterTeardown(
  host: HTMLElement,
  retainedInputs: RetainedStartupInputs,
): () => void {
  let awaitingPersistedRestore = false;
  const onPageShow = (event: PageTransitionEvent) => {
    if (event.persisted && host.isConnected) {
      startPresentationSession(host, retainedInputs.options, retainedInputs.copy);
    }
  };
  const onPageHide = (event: PageTransitionEvent) => {
    if (event.persisted) {
      awaitingPersistedRestore = true;
      window.addEventListener("pageshow", onPageShow, { once: true });
    }
    disposePresentationSession(host);
  };
  window.addEventListener("pagehide", onPageHide, { once: true });
  const observer = new MutationObserver(() => {
    if (!host.isConnected) {
      disposePresentationSession(host);
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  return () => {
    window.removeEventListener("pagehide", onPageHide);
    if (!awaitingPersistedRestore) {
      window.removeEventListener("pageshow", onPageShow);
    }
    observer.disconnect();
  };
}

function getWorldControls(host: HTMLElement): WorldControls {
  const canvasHost = host.querySelector<HTMLElement>("[data-world-canvas]");
  const status = host.querySelector<HTMLElement>("[data-world-status]");
  const start = host.querySelector<HTMLButtonElement>("[data-world-start]");
  const pause = host.querySelector<HTMLButtonElement>("[data-world-pause]");
  const exit = host.querySelector<HTMLButtonElement>("[data-world-exit]");

  if (!canvasHost || !status || !start || !pause || !exit) {
    throw new Error("The semantic world controls are incomplete.");
  }

  return { canvasHost, status, start, pause, exit };
}

function supportsWebGL(): boolean {
  const canvas = document.createElement("canvas");
  return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
}

function safelyRun(callback: (() => void) | null | undefined): void {
  try {
    callback?.();
  } catch {
    // Teardown remains deterministic even when an individual browser API fails.
  }
}
