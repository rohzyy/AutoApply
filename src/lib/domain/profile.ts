import type { CandidateProfile } from "./types";

export interface CompletenessItem {
  key: string;
  label: string;
  done: boolean;
  weight: number;
  href: string;
}

export function profileCompleteness(profile: CandidateProfile | null, hasResume: boolean) {
  const p = profile;
  const items: CompletenessItem[] = [
    { key: "resume", label: "Upload a resume", done: hasResume, weight: 20, href: "/profile#documents" },
    { key: "headline", label: "Add a headline and summary", done: !!p?.headline && (p?.summary.length ?? 0) > 40, weight: 10, href: "/profile#basics" },
    { key: "skills", label: "List at least 6 skills", done: (p?.skills.length ?? 0) >= 6, weight: 15, href: "/profile#skills" },
    { key: "experience", label: "Add your work history", done: (p?.experience.length ?? 0) >= 1, weight: 15, href: "/profile#experience" },
    { key: "authorization", label: "Confirm work authorization", done: (p?.workAuthorizations.length ?? 0) >= 1, weight: 15, href: "/profile#eligibility" },
    { key: "roles", label: "Choose preferred roles", done: (p?.preferredRoles.length ?? 0) >= 1, weight: 10, href: "/profile#preferences" },
    { key: "countries", label: "Pick target countries", done: (p?.preferredCountries.length ?? 0) >= 1, weight: 10, href: "/profile#preferences" },
    { key: "salary", label: "Set salary expectations", done: !!p?.salaryExpectation, weight: 5, href: "/profile#preferences" },
  ];
  const score = items.reduce((acc, i) => acc + (i.done ? i.weight : 0), 0);
  return { score, items, missing: items.filter((i) => !i.done) };
}

/** Countries where the candidate can work without employer sponsorship. */
export function authorizedCountries(profile: CandidateProfile) {
  return new Set(
    profile.workAuthorizations
      .filter((a) => a.status === "citizen" || a.status === "permanent_resident" || a.status === "work_visa")
      .map((a) => a.country),
  );
}
