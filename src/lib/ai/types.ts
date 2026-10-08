import type { BulletSuggestion, CandidateProfile, JobWithCompany, MatchBreakdown, SkillAlignment, Skill } from "@/lib/domain/types";

export interface TailoringInput {
  profile: CandidateProfile;
  candidateName: string;
  job: JobWithCompany;
  breakdown: MatchBreakdown;
  resumeText: string | null;
}

export interface TailoringOutput {
  summary: string;
  bullets: Omit<BulletSuggestion, "id" | "decision">[];
  coverLetter: string;
  skillAlignment: SkillAlignment[];
  recommendations: string[];
}

export interface ResumeExtraction {
  skills: Skill[];
  yearsExperience: number | null;
  headline: string | null;
}

/**
 * Every model-backed capability goes through this interface, so providers can be
 * swapped (or A/B tested) without touching product code.
 */
export interface AIProvider {
  readonly name: string;
  readonly model: string;
  tailor(input: TailoringInput): Promise<TailoringOutput>;
  extractResume(text: string): Promise<ResumeExtraction>;
}
