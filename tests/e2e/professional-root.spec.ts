import { expect, test } from "@playwright/test";

const SECTIONS = ["identity", "projects", "skills", "contact", "close"] as const;

for (const locale of ["en-US", "fr-FR"] as const) {
  test(`root remains an English professional page for ${locale}`, async ({ browser }) => {
    const context = await browser.newContext({ locale });
    try {
      const page = await context.newPage();
      const response = await page.goto("/");
      expect(response?.status()).toBe(200);
      await expect(page).toHaveURL("/");
      await expect(page.locator("html")).toHaveAttribute("lang", "en");
      await expect(page.locator("#identity")).toContainText("Óscar Arango");
      await expect(page.locator("#projects")).toContainText(
        "Project Zero — The house that does not exist yet",
      );
    } finally {
      await context.close();
    }
  });
}

test("Spanish primary browser language routes to Spanish without losing query or fragment", async ({
  browser,
}) => {
  const context = await browser.newContext({ locale: "es-AR" });
  try {
    const page = await context.newPage();
    const response = await page.goto("/?source=portfolio&tag=a%2Bb#contact");
    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL(/\/es\/\?source=portfolio&tag=a%2Bb#contact$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    await expect(page.locator("#contact")).toContainText("El contacto sigue sin resolverse.");
  } finally {
    await context.close();
  }
});

test("root is usable English semantic content without JavaScript or meta refresh", async ({
  browser,
}) => {
  const context = await browser.newContext({ locale: "es-AR", javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator('meta[http-equiv="refresh" i]')).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Skip to professional content" })).toHaveAttribute(
      "href",
      "#main-content",
    );
    expect(
      await page.locator("main > section").evaluateAll((sections) => sections.map((s) => s.id)),
    ).toEqual(SECTIONS);
    await expect(page.locator("#identity")).toContainText("Óscar Arango");
    await expect(page.locator("#projects")).toContainText(
      "Project Zero — The house that does not exist yet",
    );
    await expect(page.locator("#contact")).toContainText("Contact remains unresolved.");
  } finally {
    await context.close();
  }
});

for (const [route, browserLocale, language, projectTitle] of [
  ["/es/", "en-US", "es", "Project Zero — La casa que todavía no existe"],
  ["/en/", "es-AR", "en", "Project Zero — The house that does not exist yet"],
] as const) {
  test(`${route} remains an explicit locale choice despite ${browserLocale}`, async ({
    browser,
  }) => {
    const context = await browser.newContext({ locale: browserLocale });
    try {
      const page = await context.newPage();
      const response = await page.goto(route);
      expect(response?.status()).toBe(200);
      await expect(page).toHaveURL(route);
      await expect(page.locator("html")).toHaveAttribute("lang", language);
      await expect(page.locator("#projects")).toContainText(projectTitle);
    } finally {
      await context.close();
    }
  });
}
