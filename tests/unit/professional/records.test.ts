import { describe, expect, it } from "vitest";

import {
  PROFESSIONAL_LOCALE_RECORDS,
  PROFESSIONAL_ZONE_ORDER,
} from "../../../src/professional/records";
import { professionalLocaleRecordsSchema } from "../../../src/professional/schema";

const expectedZoneOrder = [
  { id: "identity.primary", zone: "campfire-cabin" },
  { id: "project.project-zero", zone: "projects-book" },
  { id: "skills.primary", zone: "skills-workshop" },
  { id: "cv.primary", zone: "skills-workshop" },
  { id: "contact.primary", zone: "contact-paper" },
  { id: "close.primary", zone: "professional-close" },
] as const;

describe("professional canonical records", () => {
  it("parses each approved locale record set", () => {
    expect(professionalLocaleRecordsSchema.parse(PROFESSIONAL_LOCALE_RECORDS.es)).toEqual(
      PROFESSIONAL_LOCALE_RECORDS.es,
    );
    expect(professionalLocaleRecordsSchema.parse(PROFESSIONAL_LOCALE_RECORDS.en)).toEqual(
      PROFESSIONAL_LOCALE_RECORDS.en,
    );
  });

  it("rejects invalid and missing records", () => {
    const invalidContact = {
      ...PROFESSIONAL_LOCALE_RECORDS.es,
      contact: {
        ...PROFESSIONAL_LOCALE_RECORDS.es.contact,
        status: "available",
      },
    };
    const { cv: omittedCv, ...missingCv } = PROFESSIONAL_LOCALE_RECORDS.en;

    expect(professionalLocaleRecordsSchema.safeParse(invalidContact).success).toBe(false);
    expect(omittedCv).toBeDefined();
    expect(professionalLocaleRecordsSchema.safeParse(missingCv).success).toBe(false);
  });

  it("keeps Spanish and English IDs and deterministic zone order identical", () => {
    expect(PROFESSIONAL_ZONE_ORDER).toEqual(expectedZoneOrder);
    expect(PROFESSIONAL_LOCALE_RECORDS.es.zoneOrder).toEqual(expectedZoneOrder);
    expect(PROFESSIONAL_LOCALE_RECORDS.en.zoneOrder).toEqual(expectedZoneOrder);
    expect(PROFESSIONAL_LOCALE_RECORDS.es.close).toEqual({
      id: "close.primary",
      zone: "professional-close",
    });
    expect(PROFESSIONAL_LOCALE_RECORDS.en.close).toEqual({
      id: "close.primary",
      zone: "professional-close",
    });
  });

  it("marks the CV as under review in both locales", () => {
    expect(PROFESSIONAL_LOCALE_RECORDS.es.cv.status).toBe("under-review");
    expect(PROFESSIONAL_LOCALE_RECORDS.en.cv.status).toBe("under-review");
  });

  it("keeps contact unresolved without a value or URL", () => {
    for (const locale of [PROFESSIONAL_LOCALE_RECORDS.es, PROFESSIONAL_LOCALE_RECORDS.en]) {
      expect(locale.contact.status).toBe("unresolved");
      expect(Object.keys(locale.contact).sort()).toEqual(["id", "status", "zone"]);
      expect(JSON.stringify(locale.contact)).not.toMatch(/https?:|mailto:|tel:/i);
    }
  });

  it("keeps framework and renderer ownership out of the record shape", () => {
    const serializedRecords = JSON.stringify(PROFESSIONAL_LOCALE_RECORDS);

    expect(serializedRecords).not.toMatch(/astro|react|zustand|three|dom|renderer|canvas|world/i);
  });
});
