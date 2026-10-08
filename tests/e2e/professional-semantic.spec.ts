import { expect, test } from "@playwright/test";

const LOCALE_CASES = [
  {
    locale: "es",
    alternateLocale: "en",
    identityName: "Óscar Arango",
    projectTitle: "Project Zero — La casa que todavía no existe",
    cvLabel: "CV en revisión",
    contactStatus: "El contacto sigue sin resolverse.",
    placeholderLabel: "Enlace provisional a Google (no es contacto)",
    fallbackHeading: "Presentación ligera",
    skipLinkText: "Saltar al contenido profesional",
  },
  {
    locale: "en",
    alternateLocale: "es",
    identityName: "Óscar Arango",
    projectTitle: "Project Zero — The house that does not exist yet",
    cvLabel: "CV under review",
    contactStatus: "Contact remains unresolved.",
    placeholderLabel: "Temporary Google link (not a contact link)",
    fallbackHeading: "Lightweight presentation",
    skipLinkText: "Skip to professional content",
  },
] as const;

const FUNCTION_IDS = ["identity", "projects", "skills", "contact", "close"] as const;
test.use({ javaScriptEnabled: false });

for (const localeCase of LOCALE_CASES) {
  test(`${localeCase.locale} exposes the professional route without JavaScript`, async ({
    page,
  }) => {
    const response = await page.goto(`/${localeCase.locale}/`);

    expect(response?.ok()).toBeTruthy();
    await expect(page.locator("html")).toHaveAttribute("lang", localeCase.locale);
    await expect(
      page.getByRole("link", { name: localeCase.skipLinkText, exact: true }),
    ).toHaveAttribute("href", "#main-content");
    expect(
      await page
        .locator("main > section")
        .evaluateAll((sections) => sections.map((section) => section.id)),
    ).toEqual(FUNCTION_IDS);

    const directNavigation = page.locator("nav[data-direct-navigation]");
    await expect(directNavigation).toBeVisible();

    for (const functionId of FUNCTION_IDS) {
      await expect(directNavigation.locator(`a[href="#${functionId}"]`)).toBeVisible();
      await expect(page.locator(`main > section#${functionId}`)).toBeVisible();

      const localeSwitcher = page.locator(`#${functionId} [data-locale-switcher]`);
      await expect(
        localeSwitcher.locator(`a[href="/${localeCase.locale}/#${functionId}"]`),
      ).toHaveAttribute("aria-current", "page");
      await expect(
        localeSwitcher.locator(`a[href="/${localeCase.alternateLocale}/#${functionId}"]`),
      ).toBeVisible();
    }

    await expect(page.locator("#identity")).toContainText(localeCase.identityName);
    await expect(page.locator("#projects article")).toHaveCount(1);
    await expect(page.locator("#projects")).toContainText(localeCase.projectTitle);
    await expect(page.locator("#skills")).toContainText(localeCase.cvLabel);
    await expect(page.locator("#contact")).toContainText(localeCase.contactStatus);
    const placeholder = page.locator("#contact").getByRole("link", {
      name: localeCase.placeholderLabel,
      exact: true,
    });
    await expect(placeholder).toHaveAttribute("href", "https://www.google.com/");
    await expect(placeholder).not.toHaveAttribute("target", "_blank");
    await expect(page.locator('#contact a[href^="mailto:"], #contact a[href^="tel:"]')).toHaveCount(
      0,
    );
    await expect(
      page.locator('#contact a[href^="http://"], #contact a[href^="https://"]'),
    ).toHaveCount(1);
    await expect(page.locator("form")).toHaveCount(0);
    await expect(page.locator("a[download]")).toHaveCount(0);

    const fallback = page.locator("[data-lightweight-fallback]");
    await expect(fallback).toBeVisible();
    await expect(fallback).toContainText(localeCase.fallbackHeading);

    await page
      .locator(
        `#projects [data-locale-switcher] a[href="/${localeCase.alternateLocale}/#projects"]`,
      )
      .click();
    await expect(page).toHaveURL(`/${localeCase.alternateLocale}/#projects`);
    await expect(page.locator("html")).toHaveAttribute("lang", localeCase.alternateLocale);
  });
}
