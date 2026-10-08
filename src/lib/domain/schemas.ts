import { z } from "zod";
import { APPLICATION_STATUSES } from "./types";

const country = z.string().regex(/^[A-Z]{2}$/, "Use a 2-letter country code");
const shortText = (max: number) => z.string().trim().max(max);

export const SignUpSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(80),
  email: z.email("Enter a valid email").max(254).transform((v) => v.toLowerCase()),
  password: z
    .string()
    .min(10, "Use at least 10 characters")
    .max(128)
    .regex(/[a-zA-Z]/, "Include a letter")
    .regex(/[0-9]/, "Include a number"),
});

export const SignInSchema = z.object({
  email: z.email("Enter a valid email").transform((v) => v.toLowerCase()),
  password: z.string().min(1, "Enter your password").max(128),
});

export const SkillSchema = z.object({
  name: z.string().trim().min(1).max(40),
  level: z.number().int().min(1).max(5).transform((v) => v as 1 | 2 | 3 | 4 | 5),
  years: z.number().min(0).max(40),
});

export const ExperienceSchema = z.object({
  id: z.string().min(1).max(64),
  company: z.string().trim().min(1, "Company is required").max(80),
  title: z.string().trim().min(1, "Title is required").max(80),
  startDate: z.string().regex(/^\d{4}-\d{2}$/, "Use YYYY-MM"),
  endDate: z.string().regex(/^\d{4}-\d{2}$/, "Use YYYY-MM").nullable(),
  description: shortText(500),
  highlights: z.array(z.string().trim().min(1).max(300)).max(8),
  skills: z.array(z.string().trim().max(40)).max(20),
});

export const ProfileSchema = z.object({
  headline: shortText(140),
  summary: shortText(2000),
  location: z.object({ city: shortText(80), country: country.or(z.literal("")) }),
  citizenship: z.array(country).max(4),
  workAuthorizations: z.array(z.object({ country, status: z.enum(["citizen", "permanent_resident", "work_visa", "student_visa", "none"]) })).max(10),
  requiresSponsorship: z.boolean(),
  willingToRelocate: z.boolean(),
  relocationCountries: z.array(country).max(20),
  remotePreference: z.enum(["remote", "hybrid", "onsite", "any"]),
  preferredRoles: z.array(z.string().trim().min(2).max(60)).max(8),
  preferredCountries: z.array(country).max(12),
  seniority: z.enum(["entry", "mid", "senior", "lead", "executive"]),
  yearsExperience: z.number().int().min(0).max(60),
  skills: z.array(SkillSchema).max(40),
  experience: z.array(ExperienceSchema).max(15),
  education: z.array(z.object({ id: z.string(), school: shortText(120), degree: shortText(60), field: shortText(80), year: z.number().int().min(1950).max(2040) })).max(6),
  salaryExpectation: z.object({ min: z.number().int().min(0).max(5_000_000), currency: z.string().regex(/^[A-Z]{3}$/) }).nullable(),
  links: z.object({ linkedin: z.url().optional().or(z.literal("")), github: z.url().optional().or(z.literal("")), portfolio: z.url().optional().or(z.literal("")) }),
});
export type ProfileInput = z.infer<typeof ProfileSchema>;

export const ApplicationStatusSchema = z.enum(APPLICATION_STATUSES);

export const SettingsSchema = z.object({
  emailDigest: z.enum(["daily", "weekly", "off"]),
  notifyNewMatches: z.boolean(),
  notifyReviewComplete: z.boolean(),
  notifyApplicationUpdates: z.boolean(),
  minMatchScore: z.number().int().min(0).max(100),
  timezone: z.string().min(1).max(64),
});

export const PlanUpdateSchema = z.object({
  name: z.string().trim().min(2).max(40),
  tagline: z.string().trim().max(140),
  priceMonthly: z.number().min(0).max(10_000),
  priceYearly: z.number().min(0).max(100_000),
  features: z.array(z.string().trim().min(2).max(120)).min(1).max(12),
  highlighted: z.boolean(),
  active: z.boolean(),
});
