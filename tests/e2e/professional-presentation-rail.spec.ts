import { expect, test } from "@playwright/test";

const LOCALE_CASES = [
  {
    locale: "es",
    railLabel: "Presentación profesional",
    projectsLabel: "Proyectos",
    retractLabel: "Retraer presentación",
    restoreLabel: "Restaurar presentación",
  },
  {
    locale: "en",
    railLabel: "Professional presentation",
    projectsLabel: "Projects",
    retractLabel: "Retract presentation",
    restoreLabel: "Restore presentation",
  },
] as const;

for (const localeCase of LOCALE_CASES) {
  test(`${localeCase.locale} presents a hydrated rail without replacing semantic access`, async ({
    page,
  }) => {
    await page.goto(`/${localeCase.locale}/`);

    await expect(page.locator("[data-lightweight-fallback]")).toBeVisible();
    await expect(page.locator("[data-direct-navigation]")).toBeVisible();

    const rail = page.getByRole("complementary", { name: localeCase.railLabel, exact: true });
    const projectLink = rail.getByRole("link", { name: localeCase.projectsLabel, exact: true });
    const railToggle = rail.getByRole("button", { name: localeCase.retractLabel, exact: true });

    await expect(rail).toBeVisible();
    await expect(rail).toHaveAttribute("data-hydrated", "true");
    await expect(projectLink).toHaveAttribute("href", "#projects");

    await projectLink.focus();
    await expect(page).toHaveURL(`/${localeCase.locale}/`);
    await expect(projectLink).toHaveAttribute("data-previewed", "true");

    await page.keyboard.press("Escape");
    await expect(projectLink).not.toHaveAttribute("data-previewed", "true");
    await expect(page).toHaveURL(`/${localeCase.locale}/`);

    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(`/${localeCase.locale}/#projects`);

    await railToggle.focus();
    await railToggle.click();
    const restoreRailToggle = rail.getByRole("button", {
      name: localeCase.restoreLabel,
      exact: true,
    });
    await expect(restoreRailToggle).toHaveAttribute("aria-expanded", "false");
    await expect(restoreRailToggle).toBeFocused();
    await expect(page).toHaveURL(`/${localeCase.locale}/#projects`);

    await restoreRailToggle.click();
    await expect(railToggle).toHaveAttribute("aria-expanded", "true");
    await expect(railToggle).toBeFocused();
    await expect(page).toHaveURL(`/${localeCase.locale}/#projects`);
  });
}
