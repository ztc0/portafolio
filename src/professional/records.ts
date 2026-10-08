import {
  CONTACT_STATUS,
  CV_STATUS,
  PROFESSIONAL_LOCALE,
  PROFESSIONAL_RECORD_ID,
  PROFESSIONAL_ZONE,
  PROJECT_STAGE,
  professionalLocaleRecordsSchema,
  type ProfessionalLocale,
  type ProfessionalLocaleRecords,
  type ProfessionalLocaleRecordsInput,
  type ZoneOrderEntry,
} from "./schema";

export const PROFESSIONAL_ZONE_ORDER = [
  {
    id: PROFESSIONAL_RECORD_ID.IDENTITY_PRIMARY,
    zone: PROFESSIONAL_ZONE.CAMPFIRE_CABIN,
  },
  {
    id: PROFESSIONAL_RECORD_ID.PROJECT_ZERO,
    zone: PROFESSIONAL_ZONE.PROJECTS_BOOK,
  },
  {
    id: PROFESSIONAL_RECORD_ID.SKILLS_PRIMARY,
    zone: PROFESSIONAL_ZONE.SKILLS_WORKSHOP,
  },
  {
    id: PROFESSIONAL_RECORD_ID.CV_PRIMARY,
    zone: PROFESSIONAL_ZONE.SKILLS_WORKSHOP,
  },
  {
    id: PROFESSIONAL_RECORD_ID.CONTACT_PRIMARY,
    zone: PROFESSIONAL_ZONE.CONTACT_PAPER,
  },
  {
    id: PROFESSIONAL_RECORD_ID.CLOSE_PRIMARY,
    zone: PROFESSIONAL_ZONE.PROFESSIONAL_CLOSE,
  },
] as const satisfies readonly ZoneOrderEntry[];

const spanishRecords = {
  locale: PROFESSIONAL_LOCALE.ES,
  zoneOrder: PROFESSIONAL_ZONE_ORDER,
  identity: {
    id: PROFESSIONAL_RECORD_ID.IDENTITY_PRIMARY,
    zone: PROFESSIONAL_ZONE.CAMPFIRE_CABIN,
    name: "Óscar Arango",
    knownAs: "Goba",
    role: "Trainee Backend Developer",
    focus: "TypeScript y Node.js",
    motivation: "Motivado por resolver problemas y automatizar procesos repetitivos o complejos.",
  },
  project: {
    id: PROFESSIONAL_RECORD_ID.PROJECT_ZERO,
    zone: PROFESSIONAL_ZONE.PROJECTS_BOOK,
    title: "Project Zero — La casa que todavía no existe",
    stage: PROJECT_STAGE.PLANNING_DESIGN_IN_PROGRESS,
  },
  skills: {
    id: PROFESSIONAL_RECORD_ID.SKILLS_PRIMARY,
    zone: PROFESSIONAL_ZONE.SKILLS_WORKSHOP,
    skills: [
      "HTML",
      "CSS",
      "JavaScript",
      "TypeScript",
      "Node.js",
      "Express",
      "Hono",
      "SQL",
      "PostgreSQL",
      "SQLite",
      "MongoDB",
      "Vitest",
      "Playwright",
      "Git",
      "GitHub",
      "GitHub Actions",
      "CI/CD",
      "Docker",
      "Linux",
      "Bash",
      "Pino",
      "AI-assisted development",
      "model/API integration",
      "agent automation",
      "local models",
    ],
  },
  cv: {
    id: PROFESSIONAL_RECORD_ID.CV_PRIMARY,
    zone: PROFESSIONAL_ZONE.SKILLS_WORKSHOP,
    label: "CV en revisión",
    status: CV_STATUS.UNDER_REVIEW,
  },
  contact: {
    id: PROFESSIONAL_RECORD_ID.CONTACT_PRIMARY,
    zone: PROFESSIONAL_ZONE.CONTACT_PAPER,
    status: CONTACT_STATUS.UNRESOLVED,
  },
  close: {
    id: PROFESSIONAL_RECORD_ID.CLOSE_PRIMARY,
    zone: PROFESSIONAL_ZONE.PROFESSIONAL_CLOSE,
  },
} as const satisfies ProfessionalLocaleRecordsInput;

const englishRecords = {
  locale: PROFESSIONAL_LOCALE.EN,
  zoneOrder: PROFESSIONAL_ZONE_ORDER,
  identity: {
    id: PROFESSIONAL_RECORD_ID.IDENTITY_PRIMARY,
    zone: PROFESSIONAL_ZONE.CAMPFIRE_CABIN,
    name: "Óscar Arango",
    knownAs: "Goba",
    role: "Trainee Backend Developer",
    focus: "TypeScript and Node.js",
    motivation: "Motivated to solve problems and automate repetitive or complex processes.",
  },
  project: {
    id: PROFESSIONAL_RECORD_ID.PROJECT_ZERO,
    zone: PROFESSIONAL_ZONE.PROJECTS_BOOK,
    title: "Project Zero — The house that does not exist yet",
    stage: PROJECT_STAGE.PLANNING_DESIGN_IN_PROGRESS,
  },
  skills: {
    id: PROFESSIONAL_RECORD_ID.SKILLS_PRIMARY,
    zone: PROFESSIONAL_ZONE.SKILLS_WORKSHOP,
    skills: [
      "HTML",
      "CSS",
      "JavaScript",
      "TypeScript",
      "Node.js",
      "Express",
      "Hono",
      "SQL",
      "PostgreSQL",
      "SQLite",
      "MongoDB",
      "Vitest",
      "Playwright",
      "Git",
      "GitHub",
      "GitHub Actions",
      "CI/CD",
      "Docker",
      "Linux",
      "Bash",
      "Pino",
      "AI-assisted development",
      "model/API integration",
      "agent automation",
      "local models",
    ],
  },
  cv: {
    id: PROFESSIONAL_RECORD_ID.CV_PRIMARY,
    zone: PROFESSIONAL_ZONE.SKILLS_WORKSHOP,
    label: "CV under review",
    status: CV_STATUS.UNDER_REVIEW,
  },
  contact: {
    id: PROFESSIONAL_RECORD_ID.CONTACT_PRIMARY,
    zone: PROFESSIONAL_ZONE.CONTACT_PAPER,
    status: CONTACT_STATUS.UNRESOLVED,
  },
  close: {
    id: PROFESSIONAL_RECORD_ID.CLOSE_PRIMARY,
    zone: PROFESSIONAL_ZONE.PROFESSIONAL_CLOSE,
  },
} as const satisfies ProfessionalLocaleRecordsInput;

function parseProfessionalLocaleRecords(
  records: ProfessionalLocaleRecordsInput,
): ProfessionalLocaleRecords {
  return professionalLocaleRecordsSchema.parse(records);
}

export type ProfessionalLocaleRecordMap = Readonly<
  Record<ProfessionalLocale, ProfessionalLocaleRecords>
>;

export const PROFESSIONAL_LOCALE_RECORDS: ProfessionalLocaleRecordMap = Object.freeze({
  es: parseProfessionalLocaleRecords(spanishRecords),
  en: parseProfessionalLocaleRecords(englishRecords),
});
