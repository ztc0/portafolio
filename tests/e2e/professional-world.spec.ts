import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const COPY = {
  en: {
    directNavigation: "Direct professional navigation",
    rail: "Professional presentation",
    status: "World ready",
    paused: "World paused",
    fallback: "Lightweight presentation",
    pause: "Pause world",
    resume: "Resume world",
    exit: "Exit world",
    start: "Enter world",
  },
  es: {
    directNavigation: "Navegación profesional directa",
    rail: "Presentación profesional",
    status: "Mundo listo",
    paused: "Mundo en pausa",
    fallback: "Presentación ligera",
    pause: "Pausar mundo",
    resume: "Reanudar mundo",
    exit: "Salir del mundo",
    start: "Entrar al mundo",
  },
} as const;

async function expectNoAxeViolations(page: import("@playwright/test").Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

for (const locale of ["en", "es"] as const) {
  test(`${locale} has no axe violations with semantic SSR content, a hydrated rail, and a ready world`, async ({
    page,
  }) => {
    const copy = COPY[locale];
    await page.goto(`/${locale}/`);

    await expect(page.locator("main > section")).toHaveCount(5);
    await expect(page.getByRole("complementary", { name: copy.rail, exact: true })).toHaveAttribute(
      "data-hydrated",
      "true",
    );
    await expect(page.getByRole("status")).toHaveText(copy.status);
    await expect(page.locator("canvas[data-procedural-world]")).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test(`${locale} has no axe violations when WebGL is unavailable`, async ({ page }) => {
    const copy = COPY[locale];
    await page.addInitScript(() => {
      HTMLCanvasElement.prototype.getContext = () => null;
    });
    await page.goto(`/${locale}/`);

    await expect(page.getByRole("status")).toHaveText(copy.fallback);
    await expect(page.locator("canvas[data-procedural-world]")).toHaveCount(0);
    await expect(
      page.getByRole("navigation", { name: copy.directNavigation, exact: true }),
    ).toBeVisible();
    await expectNoAxeViolations(page);
  });
}

interface RuntimeMetrics {
  activeObservers: number;
  activeRafs: number;
  cancelledRafs: number;
  completedRafs: number;
  disconnectedObservers: number;
  observedObservers: number;
  registeredListeners: number;
  removedListeners: number;
  requestedRafs: number;
}

async function runtimeMetrics(page: import("@playwright/test").Page): Promise<RuntimeMetrics> {
  return page.evaluate(() => {
    return Reflect.get(window, "__professionalWorldRuntimeMetrics") as RuntimeMetrics;
  });
}

test("three complete lifecycle cycles balance owned browser runtime resources", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const metricsKey = "__professionalWorldRuntimeMetrics";
    const metrics: RuntimeMetrics = {
      activeObservers: 0,
      activeRafs: 0,
      cancelledRafs: 0,
      completedRafs: 0,
      disconnectedObservers: 0,
      observedObservers: 0,
      registeredListeners: 0,
      removedListeners: 0,
      requestedRafs: 0,
    };
    Reflect.set(window, metricsKey, metrics);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    const addEventListener = EventTarget.prototype.addEventListener;
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const removeEventListener = EventTarget.prototype.removeEventListener;
    EventTarget.prototype.addEventListener = function (
      this: EventTarget,
      type: string,
      listener: EventListenerOrEventListenerObject | null,
      options?: boolean | AddEventListenerOptions,
    ): void {
      if (type === "webglcontextlost" && this instanceof HTMLCanvasElement) {
        metrics.registeredListeners += 1;
      }
      Reflect.apply(addEventListener, this, [type, listener, options]);
    };
    EventTarget.prototype.removeEventListener = function (
      this: EventTarget,
      type: string,
      listener: EventListenerOrEventListenerObject | null,
      options?: boolean | EventListenerOptions,
    ): void {
      if (type === "webglcontextlost" && this instanceof HTMLCanvasElement) {
        metrics.removedListeners += 1;
      }
      Reflect.apply(removeEventListener, this, [type, listener, options]);
    };

    const pendingRafs = new Set<number>();
    const requestAnimationFrame = window.requestAnimationFrame.bind(window);
    const cancelAnimationFrame = window.cancelAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback: FrameRequestCallback): number => {
      let identifier = 0;
      identifier = requestAnimationFrame((timestamp) => {
        if (pendingRafs.delete(identifier)) {
          metrics.completedRafs += 1;
        }
        metrics.activeRafs = pendingRafs.size;
        callback(timestamp);
      });
      pendingRafs.add(identifier);
      metrics.activeRafs = pendingRafs.size;
      metrics.requestedRafs += 1;
      return identifier;
    };
    window.cancelAnimationFrame = (identifier: number): void => {
      if (pendingRafs.delete(identifier)) {
        metrics.cancelledRafs += 1;
      }
      metrics.activeRafs = pendingRafs.size;
      cancelAnimationFrame(identifier);
    };

    const observedResizeObservers = new WeakSet<ResizeObserver>();
    const ResizeObserverConstructor = window.ResizeObserver;
    window.ResizeObserver = class extends ResizeObserverConstructor {
      constructor(callback: ResizeObserverCallback) {
        super(callback);
      }

      observe(target: Element, options?: ResizeObserverOptions): void {
        if (!observedResizeObservers.has(this)) {
          observedResizeObservers.add(this);
          metrics.observedObservers += 1;
          metrics.activeObservers += 1;
        }
        super.observe(target, options);
      }

      disconnect(): void {
        if (observedResizeObservers.delete(this)) {
          metrics.disconnectedObservers += 1;
          metrics.activeObservers -= 1;
        }
        super.disconnect();
      }
    };
  });
  const copy = COPY.en;
  await page.goto("/en/");
  const host = page.locator("[data-presentation-session]");
  const status = host.getByRole("status");
  const directProjects = page
    .getByRole("navigation", { name: copy.directNavigation, exact: true })
    .getByRole("link", { name: "Projects", exact: true });

  for (let cycle = 0; cycle < 3; cycle += 1) {
    await expect(status).toHaveText(copy.status);
    await expect(host.locator("canvas[data-procedural-world]")).toHaveCount(1);

    await page.getByRole("button", { name: copy.pause, exact: true }).click();
    await expect(status).toHaveText(copy.paused);
    await page.getByRole("button", { name: copy.resume, exact: true }).click();
    await expect(status).toHaveText(copy.status);

    await page.getByRole("button", { name: copy.exit, exact: true }).click();
    await expect(host.locator("canvas[data-procedural-world]")).toHaveCount(0);
    await directProjects.focus();
    await expect(directProjects).toBeFocused();
    await expect(directProjects).toHaveAttribute("href", "#projects");

    const metrics = await runtimeMetrics(page);
    expect(metrics.activeObservers).toBe(0);
    expect(metrics.activeRafs).toBe(0);
    expect(metrics.observedObservers).toBe(cycle + 1);
    expect(metrics.disconnectedObservers).toBe(metrics.observedObservers);
    expect(metrics.registeredListeners).toBe((cycle + 1) * 2);
    expect(metrics.removedListeners).toBe(metrics.registeredListeners);
    expect(metrics.requestedRafs).toBeGreaterThan(0);
    expect(metrics.requestedRafs).toBe(metrics.completedRafs + metrics.cancelledRafs);

    if (cycle < 2) {
      await page.getByRole("button", { name: copy.start, exact: true }).click();
    }
  }

  expect((await runtimeMetrics(page)).cancelledRafs).toBeGreaterThanOrEqual(6);
});

test("context loss falls back locally without removing direct semantic navigation", async ({
  page,
}) => {
  const copy = COPY.en;
  await page.goto("/en/");
  const host = page.locator("[data-presentation-session]");
  const canvas = host.locator("canvas[data-procedural-world]");
  await expect(canvas).toBeVisible();

  await canvas.dispatchEvent("webglcontextlost");
  await expect(host.getByRole("status")).toHaveText(copy.fallback);
  await expect(canvas).toHaveCount(0);
  await expect(
    page
      .getByRole("navigation", { name: copy.directNavigation, exact: true })
      .getByRole("link", { name: "Projects", exact: true }),
  ).toBeVisible();
});

test("reduced motion defaults to fallback but the visitor can explicitly start the world", async ({
  page,
}) => {
  const copy = COPY.es;
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/es/");
  const host = page.locator("[data-presentation-session]");

  await expect(host.getByRole("status")).toHaveText(copy.fallback);
  await expect(host.locator("canvas[data-procedural-world]")).toHaveCount(0);
  await page.getByRole("button", { name: copy.start, exact: true }).click();
  await expect(host.getByRole("status")).toHaveText(copy.status);
  await expect(host.locator("canvas[data-procedural-world]")).toHaveCount(1);
});

test("simulated persisted pagehide/pageshow tears down and restores the bounded session", async ({
  page,
}) => {
  const copy = COPY.en;
  await page.goto("/en/");
  const host = page.locator("[data-presentation-session]");
  await expect(host.getByRole("status")).toHaveText(copy.status);
  await expect(host.locator("canvas[data-procedural-world]")).toHaveCount(1);

  await page.evaluate(() => {
    window.dispatchEvent(new PageTransitionEvent("pagehide", { persisted: true }));
    window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
  });

  await expect(host.getByRole("status")).toHaveText(copy.status);
  await expect(host.locator("canvas[data-procedural-world]")).toHaveCount(1);
  await expect(
    page.getByRole("navigation", { name: copy.directNavigation, exact: true }),
  ).toBeVisible();
});
