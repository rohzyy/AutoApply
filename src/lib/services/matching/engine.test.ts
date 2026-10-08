import { describe, expect, it } from "vitest";
import type { CandidateProfile, Company, Job } from "@/lib/domain/types";
import { FACTOR_WEIGHTS, rankMatches, scoreMatch } from "./engine";

const company: Company = {
  id: "c1",
  name: "Acme",
  domain: "acme.example",
  industry: "Fintech",
  size: "200",
  headquarters: { city: "Amsterdam", country: "NL" },
  description: "Payments.",
  sponsorshipHistory: "frequent",
  website: "https://acme.example",
  brandColor: "#fff",
};

const job = (patch: Partial<Job> = {}): Job => ({
  id: "j1",
  companyId: "c1",
  title: "Senior Full-Stack Engineer",
  department: "Engineering",
  seniority: "senior",
  employmentType: "full_time",
  locations: [{ city: "Amsterdam", country: "NL" }],
  workMode: "hybrid",
  remoteCountries: [],
  salary: { min: 80000, max: 110000, currency: "EUR" },
  description: "",
  responsibilities: [],
  requirements: [],
  requiredSkills: ["TypeScript", "React", "PostgreSQL"],
  niceToHaveSkills: ["Kafka"],
  minYears: 5,
  visaSponsorship: "yes",
  source: "test",
  sourceUrl: "https://acme.example/j1",
  externalId: "j1",
  fingerprint: "fp",
  status: "active",
  postedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  ...patch,
});

const profile = (patch: Partial<CandidateProfile> = {}): CandidateProfile => ({
  userId: "u1",
  headline: "Engineer",
  summary: "",
  location: { city: "Bengaluru", country: "IN" },
  citizenship: ["IN"],
  workAuthorizations: [{ country: "IN", status: "citizen" }],
  requiresSponsorship: true,
  willingToRelocate: true,
  relocationCountries: ["NL"],
  remotePreference: "any",
  preferredRoles: ["Full-Stack Engineer"],
  preferredCountries: ["NL"],
  seniority: "senior",
  yearsExperience: 7,
  skills: [
    { name: "TypeScript", level: 5, years: 6 },
    { name: "React", level: 5, years: 6 },
    { name: "PostgreSQL", level: 4, years: 5 },
  ],
  experience: [],
  education: [],
  salaryExpectation: { min: 85000, currency: "EUR" },
  links: {},
  updatedAt: new Date().toISOString(),
  ...patch,
});

describe("scoreMatch", () => {
  it("weights sum to 1", () => {
    expect(Object.values(FACTOR_WEIGHTS).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });

  it("scores a strong, sponsorable fit highly with an explanation for every factor", () => {
    const { score, breakdown } = scoreMatch(profile(), job(), company);
    expect(score).toBeGreaterThanOrEqual(80);
    expect(breakdown.eligibility).toBe("needs_sponsorship");
    expect(breakdown.factors.map((f) => f.key)).toEqual(["skills", "experience", "eligibility", "location", "sponsorship", "preferences"]);
    expect(breakdown.factors.every((f) => f.reason.length > 10)).toBe(true);
    expect(breakdown.missingSkills).toEqual([]);
  });

  it("caps the score when the employer will not sponsor and the candidate lacks authorization", () => {
    const { score, breakdown } = scoreMatch(profile(), job({ visaSponsorship: "no" }), company);
    expect(breakdown.eligibility).toBe("ineligible");
    expect(score).toBeLessThanOrEqual(35);
    expect(breakdown.factors.find((f) => f.key === "eligibility")!.rating).toBe("blocked");
  });

  it("treats existing authorization as eligible regardless of sponsorship policy", () => {
    const { breakdown } = scoreMatch(profile({ workAuthorizations: [{ country: "NL", status: "permanent_resident" }] }), job({ visaSponsorship: "no" }), company);
    expect(breakdown.eligibility).toBe("eligible");
  });

  it("gives partial credit for transferable skills", () => {
    const { breakdown } = scoreMatch(profile(), job({ requiredSkills: ["Vue", "TypeScript"] }), company);
    expect(breakdown.transferableSkills).toEqual(["Vue"]);
    expect(breakdown.missingSkills).toEqual([]);
  });

  it("penalises on-site roles for remote-only candidates", () => {
    const remote = scoreMatch(profile({ remotePreference: "remote" }), job({ workMode: "onsite" }), company);
    const any = scoreMatch(profile(), job({ workMode: "onsite" }), company);
    const loc = (r: typeof remote) => r.breakdown.factors.find((f) => f.key === "location")!.score;
    expect(loc(remote)).toBeLessThan(loc(any));
  });
});

describe("rankMatches", () => {
  it("demotes ineligible roles below eligible ones with similar scores", () => {
    const base = scoreMatch(profile(), job(), company).breakdown;
    const items = [
      { score: 70, breakdown: { ...base, eligibility: "ineligible" as const }, job: { postedAt: "2026-01-02" } },
      { score: 66, breakdown: { ...base, eligibility: "eligible" as const }, job: { postedAt: "2026-01-01" } },
    ];
    expect(rankMatches(items)[0]!.score).toBe(66);
  });
});
