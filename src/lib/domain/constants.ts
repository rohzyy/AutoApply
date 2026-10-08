import type { ApplicationStatus, AuthStatus, FactorRating, PipelineStage, ReviewStatus, Seniority } from "./types";

export const COUNTRIES: Record<string, string> = {
  US: "United States",
  CA: "Canada",
  GB: "United Kingdom",
  IE: "Ireland",
  DE: "Germany",
  NL: "Netherlands",
  FR: "France",
  ES: "Spain",
  PT: "Portugal",
  SE: "Sweden",
  CH: "Switzerland",
  AE: "United Arab Emirates",
  SG: "Singapore",
  AU: "Australia",
  NZ: "New Zealand",
  JP: "Japan",
  IN: "India",
  BR: "Brazil",
  MX: "Mexico",
  NG: "Nigeria",
  KE: "Kenya",
  PL: "Poland",
  TW: "Taiwan",
  EG: "Egypt",
  ZA: "South Africa",
  PK: "Pakistan",
  PH: "Philippines",
  VN: "Vietnam",
};

export const countryName = (code: string) => COUNTRIES[code] ?? code;

export const SENIORITY_LABEL: Record<Seniority, string> = {
  entry: "Entry",
  mid: "Mid-level",
  senior: "Senior",
  lead: "Lead / Staff",
  executive: "Executive",
};

export const SENIORITY_RANK: Record<Seniority, number> = {
  entry: 0,
  mid: 1,
  senior: 2,
  lead: 3,
  executive: 4,
};

export const AUTH_STATUS_LABEL: Record<AuthStatus, string> = {
  citizen: "Citizen",
  permanent_resident: "Permanent resident",
  work_visa: "Work visa",
  student_visa: "Student visa",
  none: "No authorization",
};

export const STATUS_META: Record<ApplicationStatus, { label: string; tone: Tone; description: string }> = {
  saved: { label: "Saved", tone: "neutral", description: "Shortlisted for later" },
  preparing: { label: "Preparing", tone: "accent", description: "Tailoring materials" },
  human_review: { label: "Human review", tone: "warning", description: "A specialist is checking it" },
  applied: { label: "Applied", tone: "accent", description: "Submitted to the employer" },
  screening: { label: "Screening", tone: "accent", description: "Recruiter screen in progress" },
  interview: { label: "Interview", tone: "success", description: "Interviewing with the team" },
  offer: { label: "Offer", tone: "success", description: "Offer received" },
  rejected: { label: "Closed", tone: "danger", description: "Not moving forward" },
};

export const STAGE_META: Record<PipelineStage, { label: string; short: string }> = {
  discovered: { label: "AI discovered", short: "Discovered" },
  matched: { label: "AI matched", short: "Matched" },
  tailored: { label: "AI tailored", short: "Tailored" },
  reviewed: { label: "Human reviewed", short: "Reviewed" },
  applied: { label: "Applied", short: "Applied" },
};

export const REVIEW_STATUS_META: Record<ReviewStatus, { label: string; tone: Tone }> = {
  queued: { label: "Queued", tone: "neutral" },
  in_review: { label: "In review", tone: "warning" },
  approved: { label: "Approved", tone: "success" },
  changes_requested: { label: "Changes requested", tone: "danger" },
};

export const RATING_META: Record<FactorRating, { label: string; tone: Tone }> = {
  strong: { label: "Strong", tone: "success" },
  moderate: { label: "Moderate", tone: "accent" },
  weak: { label: "Weak", tone: "warning" },
  blocked: { label: "Blocked", tone: "danger" },
};

export type Tone = "neutral" | "accent" | "success" | "warning" | "danger";

export const DEFAULT_REVIEW_CHECKLIST = [
  { key: "eligibility", label: "Work authorization and sponsorship verified" },
  { key: "resume", label: "Tailored resume is accurate and truthful" },
  { key: "cover_letter", label: "Cover letter is specific to the role" },
  { key: "requirements", label: "Hard requirements met or addressed" },
  { key: "submission", label: "Application portal details confirmed" },
];

export const REVIEW_SLA_HOURS = 24;

/**
 * Which moves a candidate may make on their own board. Moving into human review goes
 * through submitForReview (it needs an approved document); human_review → applied is
 * performed by a reviewer once the application is actually submitted.
 */
export const CANDIDATE_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  saved: ["preparing", "rejected"],
  preparing: ["saved", "applied", "rejected"],
  human_review: ["preparing"],
  applied: ["screening", "interview", "offer", "rejected"],
  screening: ["interview", "offer", "rejected", "applied"],
  interview: ["offer", "rejected", "screening"],
  offer: ["rejected", "interview"],
  rejected: ["saved"],
};
