import { execFileSync } from "node:child_process";
import { mkdir, readdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { brotliCompressSync, gzipSync } from "node:zlib";

import { expect, test } from "@playwright/test";

const BUILD_ROOT = "dist";
const PRODUCTION_EVIDENCE_PATH = "test-results/professional-production-evidence.json";
const VIEWPORT = { width: 1280, height: 720 };
const CHUNK_SIGNATURES = {
  bootstrap: "replaceChildren",
  "presentation-rail": "data-presentation-rail",
  react: "__COMPILER_RUNTIME",
  "react-dom-client": "createPortal",
  runtime: "proceduralWorld",
  "semantic-entry": "data-presentation-session",
  session: "data-world-canvas",
  three: "REVISION",
} as const;

interface RequestEvidence {
  readonly order: number;
  readonly resourceType: string;
  readonly url: string;
}

interface ScenarioEvidence {
  readonly name: string;
  readonly requests: readonly RequestEvidence[];
  readonly resourceTiming: unknown;
}

interface EmittedFileEvidence {
  readonly file: string;
  readonly rawBytes: number;
  readonly gzipBytes: number;
  readonly brotliBytes: number;
  readonly attribution: readonly string[];
}

async function collectScenario(
  browser: import("@playwright/test").Browser,
  name: string,
  options: {
    readonly javaScriptEnabled?: boolean;
    readonly noWebGL?: boolean;
    readonly reducedMotion?: boolean;
  },
): Promise<ScenarioEvidence> {
  const context = await browser.newContext({
    deviceScaleFactor: 1,
    extraHTTPHeaders: { "Cache-Control": "no-cache" },
    javaScriptEnabled: options.javaScriptEnabled,
    locale: "en-US",
    timezoneId: "UTC",
    viewport: VIEWPORT,
  });
  const page = await context.newPage();
  const requests: RequestEvidence[] = [];
  page.on("request", (request) => {
    requests.push({
      order: requests.length + 1,
      resourceType: request.resourceType(),
      url: new URL(request.url()).pathname,
    });
  });
  if (options.noWebGL) {
    await page.addInitScript(() => {
      HTMLCanvasElement.prototype.getContext = () => null;
    });
  }
  if (options.reducedMotion) {
    await page.emulateMedia({ reducedMotion: "reduce" });
  }

  const response = await page.goto("/en/");
  expect(response?.ok()).toBeTruthy();
  if (options.javaScriptEnabled === false || options.noWebGL || options.reducedMotion) {
    await expect(page.locator("canvas[data-procedural-world]")).toHaveCount(0);
  } else {
    await expect(page.locator("canvas[data-procedural-world]")).toHaveCount(1);
  }
  const resourceTiming = await page.evaluate(() =>
    performance.getEntriesByType("resource").map((entry) => {
      const resource = entry as PerformanceResourceTiming;
      return {
        duration: resource.duration,
        encodedBodySize: resource.encodedBodySize,
        initiatorType: resource.initiatorType,
        name: new URL(resource.name).pathname,
        startTime: resource.startTime,
        transferSize: resource.transferSize,
      };
    }),
  );
  await context.close();
  return { name, requests, resourceTiming };
}

async function filesIn(directory: string): Promise<string[]> {
  const entries = await readdir(directory);
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry);
      return (await stat(path)).isDirectory() ? filesIn(path) : [path];
    }),
  );
  return files.flat();
}

function attributeChunk(content: string, allJavaScript: readonly string[]): readonly string[] {
  const matches = Object.entries(CHUNK_SIGNATURES)
    .filter(([, signature]) => content.includes(signature))
    .filter(
      ([, signature]) =>
        allJavaScript.filter((candidate) => candidate.includes(signature)).length === 1,
    )
    .map(([name]) => name);
  return matches.length === 1 ? matches : ["unclassified"];
}

async function emittedFileEvidence(): Promise<readonly EmittedFileEvidence[]> {
  const files = (await filesIn(BUILD_ROOT))
    .filter((file) => /\.(?:css|html|js)$/.test(file))
    .sort();
  const contents = await Promise.all(
    files.map(async (file) => ({ file, content: await readFile(file) })),
  );
  const allJavaScript = contents
    .filter(({ file }) => file.endsWith(".js"))
    .map(({ content }) => content.toString("utf8"));

  return contents.map(({ file, content }) => ({
    file: relative(BUILD_ROOT, file),
    rawBytes: content.byteLength,
    gzipBytes: gzipSync(content).byteLength,
    brotliBytes: brotliCompressSync(content).byteLength,
    attribution: file.endsWith(".js")
      ? attributeChunk(content.toString("utf8"), allJavaScript)
      : ["unclassified"],
  }));
}

async function writeProductionEvidence(evidence: unknown): Promise<void> {
  await mkdir(dirname(PRODUCTION_EVIDENCE_PATH), { recursive: true });
  const temporaryPath = `${PRODUCTION_EVIDENCE_PATH}.tmp`;
  const serialized = JSON.stringify(evidence, null, 2);
  await writeFile(temporaryPath, serialized);
  await rename(temporaryPath, PRODUCTION_EVIDENCE_PATH);
}

test("attributes only uniquely discriminating generated-chunk signatures", () => {
  expect(attributeChunk("data-presentation-rail", ["data-presentation-rail", "other"])).toEqual([
    "presentation-rail",
  ]);
  expect(
    attributeChunk("data-presentation-rail proceduralWorld", [
      "data-presentation-rail proceduralWorld",
    ]),
  ).toEqual(["unclassified"]);
  expect(attributeChunk("replaceChildren", ["replaceChildren", "replaceChildren"])).toEqual([
    "unclassified",
  ]);
});

test("captures bounded production document, request-chain, timing, and emitted-size evidence", async ({
  browser,
}, testInfo) => {
  const documentContext = await browser.newContext({
    deviceScaleFactor: 1,
    extraHTTPHeaders: { "Cache-Control": "no-cache" },
    javaScriptEnabled: false,
    locale: "en-US",
    timezoneId: "UTC",
    viewport: VIEWPORT,
  });
  const documentPage = await documentContext.newPage();
  const documentResponse = await documentPage.goto("/en/");
  expect(documentResponse?.ok()).toBeTruthy();
  const rawDocument = await documentResponse?.body();
  await documentContext.close();

  const [initial, hydrated, noWebGL, capableWebGL, emitted] = await Promise.all([
    collectScenario(browser, "initial-no-javascript", { javaScriptEnabled: false }),
    collectScenario(browser, "hydrated-reduced-motion", { reducedMotion: true }),
    collectScenario(browser, "no-webgl", { noWebGL: true }),
    collectScenario(browser, "capable-webgl", {}),
    emittedFileEvidence(),
  ]);
  const htmlFiles = emitted.filter((entry) => entry.file.endsWith(".html"));
  const htmlReferences = await Promise.all(
    htmlFiles.map(async ({ file }) => {
      const html = await readFile(join(BUILD_ROOT, file), "utf8");
      return {
        file,
        references: [...html.matchAll(/(?:href|src)="([^"?]+\.(?:css|js))(?:\?[^"]*)?"/g)].map(
          (match) => match[1],
        ),
      };
    }),
  );
  const packageManifest = JSON.parse(await readFile("package.json", "utf8")) as {
    readonly dependencies: Record<string, string>;
    readonly devDependencies: Record<string, string>;
    readonly packageManager: string;
  };
  const git = (arguments_: readonly string[]) =>
    execFileSync("git", arguments_, { encoding: "utf8" }).trim();
  const metadata = {
    browser: { name: testInfo.project.name, version: browser.version() },
    cachePolicy: "fresh browser context per scenario with Cache-Control: no-cache",
    environment: {
      deviceScaleFactor: 1,
      locale: "en-US",
      reducedMotion: "no-preference except hydrated-reduced-motion",
      timezone: "UTC",
      viewport: VIEWPORT,
      webgl: { capableScenario: true, noWebGLScenario: false },
    },
    git: {
      head: git(["rev-parse", "HEAD"]),
      treeStatus: git(["status", "--porcelain"]) || "clean",
    },
    runtime: { node: process.version, packageManager: packageManifest.packageManager },
    packagePins: { ...packageManifest.dependencies, ...packageManifest.devDependencies },
  };

  const evidence = {
    htmlReferences,
    metadata,
    scenarios: [initial, hydrated, noWebGL, capableWebGL],
    emitted,
  };
  await writeProductionEvidence(evidence);
  await testInfo.attach("professional-production-evidence.json", {
    body: JSON.stringify(evidence, null, 2),
    contentType: "application/json",
  });
  await testInfo.attach("professional-document-en.html", {
    body: rawDocument ?? Buffer.alloc(0),
    contentType: "text/html",
  });
});
