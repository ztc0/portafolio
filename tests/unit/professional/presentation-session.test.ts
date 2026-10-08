import { describe, expect, it } from "vitest";

import {
  disposePresentationSession,
  getPresentationSession,
} from "../../../src/professional/presentationSession";
import {
  PROFESSIONAL_LOCALE,
  PROFESSIONAL_RECORD_ID,
  PROFESSIONAL_ZONE,
} from "../../../src/professional/schema";

function createOptions() {
  return {
    locale: PROFESSIONAL_LOCALE.EN,
    currentFunctionId: PROFESSIONAL_RECORD_ID.IDENTITY_PRIMARY,
    currentZoneId: PROFESSIONAL_ZONE.CAMPFIRE_CABIN,
  };
}

describe("presentation session", () => {
  it("creates one bounded coordinator per semantic host and isolates hosts", () => {
    const firstHost = {} as HTMLElement;
    const secondHost = {} as HTMLElement;
    const first = getPresentationSession(firstHost, createOptions());
    const repeated = getPresentationSession(firstHost, createOptions());
    const second = getPresentationSession(secondHost, createOptions());

    expect(repeated).toBe(first);
    expect(second).not.toBe(first);

    first.selectFunction(PROFESSIONAL_RECORD_ID.CONTACT_PRIMARY, PROFESSIONAL_ZONE.CONTACT_PAPER);

    expect(second.store.getState().currentZoneId).toBe(PROFESSIONAL_ZONE.CAMPFIRE_CABIN);
    expect(second.store.getState().selectedFunctionId).toBeNull();

    disposePresentationSession(firstHost);
    disposePresentationSession(secondHost);
  });
});
