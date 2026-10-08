import { describe, expect, it, vi } from "vitest";

import {
  createPresentationCoordinator,
  PRESENTATION_RAIL_STATE,
  WORLD_PRESENTATION_INTENT,
} from "../../../src/professional/PresentationCoordinator";
import {
  PROFESSIONAL_LOCALE,
  PROFESSIONAL_RECORD_ID,
  PROFESSIONAL_ZONE,
} from "../../../src/professional/schema";

function createCoordinator() {
  return createPresentationCoordinator({
    locale: PROFESSIONAL_LOCALE.EN,
    currentFunctionId: PROFESSIONAL_RECORD_ID.IDENTITY_PRIMARY,
    currentZoneId: PROFESSIONAL_ZONE.CAMPFIRE_CABIN,
  });
}

function containsFunction(value: unknown, seen = new Set<unknown>()): boolean {
  if (typeof value === "function") {
    return true;
  }
  if (!value || typeof value !== "object" || seen.has(value)) {
    return false;
  }
  seen.add(value);
  return Object.values(value).some((entry) => containsFunction(entry, seen));
}

describe("presentation coordinator", () => {
  it("keeps serializable state separate from bounded presentation APIs", () => {
    const coordinator = createCoordinator();

    expect(coordinator.store.getState()).toMatchObject({
      locale: "en",
      currentFunctionId: "identity.primary",
      previewedFunctionId: null,
      selectedFunctionId: null,
      currentZoneId: "campfire-cabin",
      railState: PRESENTATION_RAIL_STATE.EXPANDED,
    });
    expect(Object.keys(coordinator.store.getState()).sort()).toEqual([
      "currentFunctionId",
      "currentZoneId",
      "locale",
      "previewedFunctionId",
      "railState",
      "selectedFunctionId",
    ]);
    expect(containsFunction(coordinator.store.getState())).toBe(false);

    coordinator.previewFunction(PROFESSIONAL_RECORD_ID.PROJECT_ZERO);
    expect(coordinator.store.getState().previewedFunctionId).toBe("project.project-zero");

    coordinator.dismissPreview();
    coordinator.selectFunction(
      PROFESSIONAL_RECORD_ID.PROJECT_ZERO,
      PROFESSIONAL_ZONE.PROJECTS_BOOK,
    );
    expect(coordinator.store.getState()).toMatchObject({
      currentFunctionId: "project.project-zero",
      previewedFunctionId: null,
      selectedFunctionId: "project.project-zero",
      currentZoneId: "projects-book",
    });

    coordinator.retractRail();
    expect(coordinator.store.getState().railState).toBe(PRESENTATION_RAIL_STATE.RETRACTED);
    coordinator.restoreRail();
    expect(coordinator.store.getState().railState).toBe(PRESENTATION_RAIL_STATE.EXPANDED);
  });

  it("shares bounded continuity and world presentation intents without storing callbacks", () => {
    const coordinator = createCoordinator();
    const report = vi.fn();
    const unsubscribe = coordinator.subscribeWorldIntents(report);

    expect(coordinator.getCurrentPresentation()).toEqual({
      currentFunctionId: PROFESSIONAL_RECORD_ID.IDENTITY_PRIMARY,
      currentZoneId: PROFESSIONAL_ZONE.CAMPFIRE_CABIN,
    });
    coordinator.reportWorldIntent(WORLD_PRESENTATION_INTENT.READY);
    unsubscribe();
    coordinator.reportWorldIntent(WORLD_PRESENTATION_INTENT.EXITED);

    expect(report).toHaveBeenCalledExactlyOnceWith(WORLD_PRESENTATION_INTENT.READY);
    expect(containsFunction(coordinator.store.getState())).toBe(false);
  });

  it("creates isolated page-session coordinators and unsubscribes store listeners", () => {
    const firstCoordinator = createCoordinator();
    const secondCoordinator = createCoordinator();
    const observedPreviewIds: Array<string | null> = [];
    const unsubscribe = firstCoordinator.store.subscribe((state) => {
      observedPreviewIds.push(state.previewedFunctionId);
    });

    firstCoordinator.selectFunction(
      PROFESSIONAL_RECORD_ID.CONTACT_PRIMARY,
      PROFESSIONAL_ZONE.CONTACT_PAPER,
    );
    unsubscribe();
    firstCoordinator.dismissPreview();

    expect(firstCoordinator.store.getState().selectedFunctionId).toBe("contact.primary");
    expect(secondCoordinator.store.getState().selectedFunctionId).toBeNull();
    expect(secondCoordinator.store.getState().currentZoneId).toBe("campfire-cabin");
    expect(observedPreviewIds).toEqual([null]);
  });
});
