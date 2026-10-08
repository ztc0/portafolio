import { z } from "zod";

export const PROFESSIONAL_LOCALE = {
  ES: "es",
  EN: "en",
} as const;

export type ProfessionalLocale = (typeof PROFESSIONAL_LOCALE)[keyof typeof PROFESSIONAL_LOCALE];

export const PROFESSIONAL_RECORD_ID = {
  IDENTITY_PRIMARY: "identity.primary",
  PROJECT_ZERO: "project.project-zero",
  SKILLS_PRIMARY: "skills.primary",
  CV_PRIMARY: "cv.primary",
  CONTACT_PRIMARY: "contact.primary",
  CLOSE_PRIMARY: "close.primary",
} as const;

export type ProfessionalRecordId =
  (typeof PROFESSIONAL_RECORD_ID)[keyof typeof PROFESSIONAL_RECORD_ID];

export const PROFESSIONAL_ZONE = {
  CAMPFIRE_CABIN: "campfire-cabin",
  PROJECTS_BOOK: "projects-book",
  SKILLS_WORKSHOP: "skills-workshop",
  CONTACT_PAPER: "contact-paper",
  PROFESSIONAL_CLOSE: "professional-close",
} as const;

export type ProfessionalZone = (typeof PROFESSIONAL_ZONE)[keyof typeof PROFESSIONAL_ZONE];

export const PROJECT_STAGE = {
  PLANNING_DESIGN_IN_PROGRESS: "planning-design-in-progress",
} as const;

export type ProjectStage = (typeof PROJECT_STAGE)[keyof typeof PROJECT_STAGE];

export const CV_STATUS = {
  UNDER_REVIEW: "under-review",
} as const;

export type CvStatus = (typeof CV_STATUS)[keyof typeof CV_STATUS];

export const CONTACT_STATUS = {
  UNRESOLVED: "unresolved",
} as const;

export type ContactStatus = (typeof CONTACT_STATUS)[keyof typeof CONTACT_STATUS];

export interface ZoneOrderEntry {
  readonly id: ProfessionalRecordId;
  readonly zone: ProfessionalZone;
}

export interface IdentityRecord {
  readonly id: typeof PROFESSIONAL_RECORD_ID.IDENTITY_PRIMARY;
  readonly zone: typeof PROFESSIONAL_ZONE.CAMPFIRE_CABIN;
  readonly name: string;
  readonly knownAs: string;
  readonly role: string;
  readonly focus: string;
  readonly motivation: string;
}

export interface ProjectRecord {
  readonly id: typeof PROFESSIONAL_RECORD_ID.PROJECT_ZERO;
  readonly zone: typeof PROFESSIONAL_ZONE.PROJECTS_BOOK;
  readonly title: string;
  readonly stage: ProjectStage;
}

export interface SkillsRecord {
  readonly id: typeof PROFESSIONAL_RECORD_ID.SKILLS_PRIMARY;
  readonly zone: typeof PROFESSIONAL_ZONE.SKILLS_WORKSHOP;
  readonly skills: readonly string[];
}

export interface CvRecord {
  readonly id: typeof PROFESSIONAL_RECORD_ID.CV_PRIMARY;
  readonly zone: typeof PROFESSIONAL_ZONE.SKILLS_WORKSHOP;
  readonly label: string;
  readonly status: CvStatus;
}

export interface ContactRecord {
  readonly id: typeof PROFESSIONAL_RECORD_ID.CONTACT_PRIMARY;
  readonly zone: typeof PROFESSIONAL_ZONE.CONTACT_PAPER;
  readonly status: ContactStatus;
}

export interface CloseRecord {
  readonly id: typeof PROFESSIONAL_RECORD_ID.CLOSE_PRIMARY;
  readonly zone: typeof PROFESSIONAL_ZONE.PROFESSIONAL_CLOSE;
}

export interface ProfessionalLocaleRecordsInput {
  readonly locale: ProfessionalLocale;
  readonly zoneOrder: readonly ZoneOrderEntry[];
  readonly identity: IdentityRecord;
  readonly project: ProjectRecord;
  readonly skills: SkillsRecord;
  readonly cv: CvRecord;
  readonly contact: ContactRecord;
  readonly close: CloseRecord;
}

const professionalLocaleSchema = z.enum([PROFESSIONAL_LOCALE.ES, PROFESSIONAL_LOCALE.EN]);
const professionalRecordIdSchema = z.enum([
  PROFESSIONAL_RECORD_ID.IDENTITY_PRIMARY,
  PROFESSIONAL_RECORD_ID.PROJECT_ZERO,
  PROFESSIONAL_RECORD_ID.SKILLS_PRIMARY,
  PROFESSIONAL_RECORD_ID.CV_PRIMARY,
  PROFESSIONAL_RECORD_ID.CONTACT_PRIMARY,
  PROFESSIONAL_RECORD_ID.CLOSE_PRIMARY,
]);
const professionalZoneSchema = z.enum([
  PROFESSIONAL_ZONE.CAMPFIRE_CABIN,
  PROFESSIONAL_ZONE.PROJECTS_BOOK,
  PROFESSIONAL_ZONE.SKILLS_WORKSHOP,
  PROFESSIONAL_ZONE.CONTACT_PAPER,
  PROFESSIONAL_ZONE.PROFESSIONAL_CLOSE,
]);

const zoneOrderEntrySchema = z
  .object({
    id: professionalRecordIdSchema,
    zone: professionalZoneSchema,
  })
  .readonly();

const identityRecordSchema = z
  .object({
    id: z.literal(PROFESSIONAL_RECORD_ID.IDENTITY_PRIMARY),
    zone: z.literal(PROFESSIONAL_ZONE.CAMPFIRE_CABIN),
    name: z.string().min(1),
    knownAs: z.string().min(1),
    role: z.string().min(1),
    focus: z.string().min(1),
    motivation: z.string().min(1),
  })
  .readonly();

const projectRecordSchema = z
  .object({
    id: z.literal(PROFESSIONAL_RECORD_ID.PROJECT_ZERO),
    zone: z.literal(PROFESSIONAL_ZONE.PROJECTS_BOOK),
    title: z.string().min(1),
    stage: z.literal(PROJECT_STAGE.PLANNING_DESIGN_IN_PROGRESS),
  })
  .readonly();

const skillsRecordSchema = z
  .object({
    id: z.literal(PROFESSIONAL_RECORD_ID.SKILLS_PRIMARY),
    zone: z.literal(PROFESSIONAL_ZONE.SKILLS_WORKSHOP),
    skills: z.array(z.string().min(1)).min(1).readonly(),
  })
  .readonly();

const cvRecordSchema = z
  .object({
    id: z.literal(PROFESSIONAL_RECORD_ID.CV_PRIMARY),
    zone: z.literal(PROFESSIONAL_ZONE.SKILLS_WORKSHOP),
    label: z.string().min(1),
    status: z.literal(CV_STATUS.UNDER_REVIEW),
  })
  .readonly();

const contactRecordSchema = z
  .object({
    id: z.literal(PROFESSIONAL_RECORD_ID.CONTACT_PRIMARY),
    zone: z.literal(PROFESSIONAL_ZONE.CONTACT_PAPER),
    status: z.literal(CONTACT_STATUS.UNRESOLVED),
  })
  .readonly();

const closeRecordSchema = z
  .object({
    id: z.literal(PROFESSIONAL_RECORD_ID.CLOSE_PRIMARY),
    zone: z.literal(PROFESSIONAL_ZONE.PROFESSIONAL_CLOSE),
  })
  .readonly();

export const professionalLocaleRecordsSchema = z
  .object({
    locale: professionalLocaleSchema,
    zoneOrder: z.array(zoneOrderEntrySchema).length(6).readonly(),
    identity: identityRecordSchema,
    project: projectRecordSchema,
    skills: skillsRecordSchema,
    cv: cvRecordSchema,
    contact: contactRecordSchema,
    close: closeRecordSchema,
  })
  .readonly();

export type ProfessionalLocaleRecords = z.output<typeof professionalLocaleRecordsSchema>;
