import { countryName } from "@/lib/domain/constants";
import type { CandidateProfile, Skill, SkillAlignment } from "@/lib/domain/types";
import { extractMinYears, extractSkills } from "@/lib/pipeline/normalize";
import { normalizeSkill } from "@/lib/utils";
import type { AIProvider, ResumeExtraction, TailoringInput, TailoringOutput } from "./types";

const WEAK_OPENERS = /^(worked on|responsible for|helped|was part of|involved in|assisted)\s+/i;
const HAS_METRIC = /\d+(\.\d+)?\s*(%|x\b|k\b|m\b|b\b|ms\b)|[$€£]\s?\d|\d{2,}/i;

const FRONTEND = new Set(["react", "nextjs", "vue", "svelte", "angular", "typescript", "javascript", "designsystems", "accessibility", "webgl", "figma", "datavisualization", "performance"]);
const BACKEND = new Set(["nodejs", "postgresql", "mysql", "go", "python", "java", "kotlin", "kafka", "redis", "aws", "gcp", "azure", "graphql", "docker", "kubernetes", "terraform", "typescript", "security", "sql"]);
const FRONTEND_HINT = /\b(ui|ux|frontend|front-end|dashboard|component|interface|checkout flow|design system|library|page|web app|accessib)/i;
const BACKEND_HINT = /\b(api|backend|back-end|database|service|pipeline|worker|queue|infra|ledger|reconciliation|gateway|caching|event|migrat|transfers|data)/i;

/** Pick the required skills that plausibly belong to this bullet's domain, so we never bolt React onto an API bullet. */
function relevantSkills(bullet: string, candidates: string[]) {
  const fe = FRONTEND_HINT.test(bullet);
  const be = BACKEND_HINT.test(bullet);
  if (fe === be) return candidates.filter((s) => FRONTEND.has(normalizeSkill(s)) === BACKEND.has(normalizeSkill(s)) || (fe && be));
  const pool = fe ? FRONTEND : BACKEND;
  return candidates.filter((s) => pool.has(normalizeSkill(s)));
}

const GERUND_PAST: Record<string, string> = {
  migrating: "Migrated",
  building: "Built",
  designing: "Designed",
  developing: "Developed",
  creating: "Created",
  improving: "Improved",
  implementing: "Implemented",
  scaling: "Scaled",
  maintaining: "Maintained",
  shipping: "Shipped",
  launching: "Launched",
  automating: "Automated",
  optimizing: "Optimized",
  rebuilding: "Rebuilt",
  refactoring: "Refactored",
};

function yearsLabel(start: string, end: string | null) {
  const s = start.slice(0, 4);
  return end ? `${s}–${end.slice(0, 4)}` : `${s}–present`;
}

function rewriteBullet(original: string, skillsToSurface: string[]) {
  let text = original.trim().replace(/\.$/, "");
  const opener = text.match(WEAK_OPENERS)?.[1]?.toLowerCase();
  if (opener) {
    const rest = text.slice(text.match(WEAK_OPENERS)![0].length);
    const [first, ...tail] = rest.split(" ");
    const past = first ? GERUND_PAST[first.toLowerCase()] : undefined;
    if (past) text = [past, ...tail].join(" ");
    else if (opener === "responsible for") text = `Owned ${rest}`;
    else if (opener === "helped" || opener === "assisted") text = `Co-led ${rest}`;
    else text = `Led ${rest}`;
  }
  const missing = skillsToSurface.filter((s) => !text.toLowerCase().includes(s.toLowerCase()));
  if (missing.length) text += `, using ${missing.slice(0, 2).join(" and ")}`;
  return `${text}.`;
}

export function heuristicTailor(input: TailoringInput): TailoringOutput {
  const { profile, job, breakdown, candidateName } = input;
  const company = job.company;
  const required = new Set(job.requiredSkills.map(normalizeSkill));
  const topSkills = breakdown.matchedSkills.slice(0, 3);
  const recent = [...profile.experience].sort((a, b) => b.startDate.localeCompare(a.startDate));

  const summary = `${profile.headline || "Engineer"} with ${profile.yearsExperience} years shipping production systems${
    topSkills.length ? `, strongest in ${topSkills.join(", ")}` : ""
  }. Brings ${recent[0] ? `recent ${recent[0].title.toLowerCase()} experience at ${recent[0].company}` : "hands-on delivery experience"} that maps directly to ${company.name}'s ${job.department.toLowerCase()} needs.`;

  const bullets: TailoringOutput["bullets"] = [];
  for (const exp of recent.slice(0, 2)) {
    const surfaced = new Set<string>();
    for (const h of exp.highlights.slice(0, 3)) {
      const unmentioned = exp.skills.filter((s) => required.has(normalizeSkill(s)) && !surfaced.has(s) && !h.toLowerCase().includes(s.toLowerCase()));
      const surface = relevantSkills(h, unmentioned).slice(0, 2);
      surface.forEach((s) => surfaced.add(s));
      const suggested = rewriteBullet(h, surface);
      if (suggested === `${h.replace(/\.$/, "")}.`) continue;
      const reasons: string[] = [];
      if (WEAK_OPENERS.test(h)) reasons.push("leads with ownership instead of a passive opener");
      if (surface.some((s) => !h.toLowerCase().includes(s.toLowerCase())))
        reasons.push(`surfaces ${surface.filter((s) => !h.toLowerCase().includes(s.toLowerCase())).slice(0, 2).join(" and ")}, required for this role`);
      if (!HAS_METRIC.test(h)) reasons.push("consider adding a measurable outcome");
      bullets.push({ original: h, suggested, reason: reasons.length ? `This version ${reasons.join("; ")}.` : "Tightened phrasing." });
    }
  }

  const ownedByName = new Map(profile.skills.map((s) => [normalizeSkill(s.name), s]));
  const skillAlignment: SkillAlignment[] = job.requiredSkills.map((skill) => {
    const key = normalizeSkill(skill);
    if (ownedByName.has(key)) {
      const exp = recent.find((e) => e.skills.some((s) => normalizeSkill(s) === key));
      return {
        skill,
        status: "matched",
        evidence: exp ? `Used at ${exp.company} (${yearsLabel(exp.startDate, exp.endDate)})` : `${ownedByName.get(key)!.years} yrs listed on profile`,
      };
    }
    if (breakdown.transferableSkills.includes(skill)) {
      return { skill, status: "transferable", evidence: "Closely related experience — call this out explicitly." };
    }
    return { skill, status: "missing", evidence: "No evidence on your profile yet." };
  });

  const recommendations: string[] = [];
  const missing = skillAlignment.filter((s) => s.status === "missing").map((s) => s.skill);
  if (missing.length) recommendations.push(`Address ${missing.join(", ")} directly — a side project, course, or adjacent work you can point to.`);
  const transferable = skillAlignment.filter((s) => s.status === "transferable").map((s) => s.skill);
  if (transferable.length) recommendations.push(`Frame your related experience as a bridge to ${transferable.join(", ")} in the summary.`);
  if (bullets.some((b) => !HAS_METRIC.test(b.original))) recommendations.push("Quantify at least two bullets with scale, latency, revenue or time saved.");
  if (breakdown.eligibility === "needs_sponsorship")
    recommendations.push(`State your sponsorship needs plainly and note your relocation readiness for ${countryName(job.locations[0]!.country)}.`);
  const exp = breakdown.factors.find((f) => f.key === "experience");
  if (exp && exp.score < 70) recommendations.push("Lead with scope and ownership to close the seniority gap.");

  const eligibilityLine =
    breakdown.eligibility === "eligible"
      ? "I'm authorized to work in the role's location and can start without sponsorship."
      : `I'm currently based in ${profile.location.city} and would require visa sponsorship; I'm fully prepared to relocate to ${job.locations[0]!.city}.`;

  const coverLetter = [
    `Dear ${company.name} hiring team,`,
    `I'm applying for the ${job.title} role. ${company.description.split(".")[0]} — that's the kind of problem I want to spend the next few years on.`,
    `Over ${profile.yearsExperience} years I've ${
      recent[0] ? `most recently worked as ${recent[0].title} at ${recent[0].company}, where I ${recent[0].highlights[0]?.charAt(0).toLowerCase()}${recent[0].highlights[0]?.slice(1).replace(/\.$/, "")}` : "built and shipped production software"
    }. ${topSkills.length ? `My day-to-day work in ${topSkills.join(", ")} lines up closely with what your team uses.` : ""}`,
    eligibilityLine,
    `I'd welcome the chance to talk about how I can contribute to ${company.name}.`,
    `Best regards,\n${candidateName}`,
  ].join("\n\n");

  return { summary, bullets: bullets.slice(0, 5), coverLetter, skillAlignment, recommendations };
}

export function heuristicExtract(text: string): ResumeExtraction {
  const skills: Skill[] = extractSkills(text).map((name) => ({ name, level: 3, years: 2 }));
  const yearsExperience = extractMinYears(text) || null;
  const firstLine = text.split("\n").map((l) => l.trim()).find((l) => l.length > 8 && l.length < 90 && /engineer|designer|manager|scientist|analyst|developer/i.test(l));
  return { skills, yearsExperience, headline: firstLine ?? null };
}

export class HeuristicProvider implements AIProvider {
  readonly name = "heuristic";
  readonly model = "autoapply-rules-v2";

  async tailor(input: TailoringInput) {
    return heuristicTailor(input);
  }

  async extractResume(text: string) {
    return heuristicExtract(text);
  }
}

export function emptyProfile(userId: string, now: string): CandidateProfile {
  return {
    userId,
    headline: "",
    summary: "",
    location: { city: "", country: "" },
    citizenship: [],
    workAuthorizations: [],
    requiresSponsorship: true,
    willingToRelocate: true,
    relocationCountries: [],
    remotePreference: "any",
    preferredRoles: [],
    preferredCountries: [],
    seniority: "mid",
    yearsExperience: 0,
    skills: [],
    experience: [],
    education: [],
    salaryExpectation: null,
    links: {},
    updatedAt: now,
  };
}
