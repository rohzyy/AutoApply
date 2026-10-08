import { createHash } from "node:crypto";
import type { Job, Place, Salary, Seniority, SponsorshipPolicy, WorkMode } from "@/lib/domain/types";
import type { NewRow } from "@/lib/data/repository";
import { z } from "zod";

/** Shape every source adapter must emit. Loose on purpose: real boards are inconsistent. */
export const RawPostingSchema = z.object({
  source: z.string().min(1),
  externalId: z.string().min(1),
  url: z.string().url(),
  company: z.object({ name: z.string().min(1), domain: z.string().min(3) }),
  title: z.string().min(2).max(200),
  location: z.string().min(2).max(200),
  description: z.string().min(20).max(20_000),
  salaryText: z.string().max(120).optional(),
  department: z.string().max(80).optional(),
  postedAt: z.string(),
  tags: z.array(z.string()).optional(),
});
export type RawPosting = z.infer<typeof RawPostingSchema>;

const SKILL_VOCABULARY = [
  "TypeScript", "JavaScript", "React", "Next.js", "Vue", "Node.js", "Python", "Go", "Java", "Kotlin", "Rust",
  "PostgreSQL", "MySQL", "Redis", "Kafka", "GraphQL", "AWS", "GCP", "Azure", "Docker", "Kubernetes", "Terraform",
  "PyTorch", "TensorFlow", "SQL", "dbt", "Tableau", "Looker", "Figma", "Design Systems", "Accessibility",
  "Machine Learning", "Product Strategy", "Roadmapping", "Security", "WebGL", "Data Visualization",
];

const COUNTRY_ALIASES: Record<string, string> = {
  "united states": "US", usa: "US", "u.s.": "US", us: "US", "united kingdom": "GB", uk: "GB", england: "GB",
  germany: "DE", deutschland: "DE", netherlands: "NL", ireland: "IE", canada: "CA", singapore: "SG",
  portugal: "PT", sweden: "SE", switzerland: "CH", "united arab emirates": "AE", uae: "AE", australia: "AU",
  spain: "ES", france: "FR", poland: "PL", india: "IN",
};

const CITY_COUNTRY: Record<string, string> = {
  amsterdam: "NL", berlin: "DE", munich: "DE", london: "GB", dublin: "IE", toronto: "CA", vancouver: "CA",
  singapore: "SG", lisbon: "PT", stockholm: "SE", zurich: "CH", dubai: "AE", sydney: "AU", "new york": "US",
  austin: "US", "san francisco": "US", madrid: "ES", paris: "FR", warsaw: "PL",
};

export function normalizeTitle(title: string) {
  return title
    .replace(/\s*[\(\[].*?[\)\]]\s*/g, " ")
    .replace(/\s+-\s+(remote|hybrid|onsite).*$/i, "")
    .replace(/\bsr\b\.?/gi, "Senior")
    .replace(/\bjr\b\.?/gi, "Junior")
    .replace(/\beng\b/gi, "Engineer")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function inferSeniority(title: string): Seniority {
  const t = title.toLowerCase();
  if (/\b(vp|vice president|director|head of|chief)\b/.test(t)) return "executive";
  if (/\b(staff|principal|lead|manager)\b/.test(t)) return "lead";
  if (/\b(senior|sr)\b/.test(t)) return "senior";
  if (/\b(junior|graduate|intern|entry)\b/.test(t)) return "entry";
  return "mid";
}

export function parseLocation(text: string): { places: Place[]; workMode: WorkMode; remoteCountries: string[] } {
  const lower = text.toLowerCase();
  const workMode: WorkMode = /remote/.test(lower) ? "remote" : /hybrid/.test(lower) ? "hybrid" : "onsite";
  const places: Place[] = [];
  for (const segment of text.split(/[;|/]/)) {
    const parts = segment.split(",").map((s) => s.trim()).filter(Boolean);
    const cityRaw = parts[0]?.replace(/\b(remote|hybrid|onsite)\b/gi, "").replace(/[()]/g, "").trim() ?? "";
    const countryRaw = (parts[parts.length - 1] ?? "").toLowerCase().replace(/[()]/g, "").replace(/\b(remote|hybrid)\b/g, "").trim();
    const country = COUNTRY_ALIASES[countryRaw] ?? CITY_COUNTRY[cityRaw.toLowerCase()] ?? (countryRaw.length === 2 ? countryRaw.toUpperCase() : null);
    if (country && cityRaw) places.push({ city: cityRaw, country });
  }
  const remoteCountries = workMode === "remote" ? [...new Set(places.map((p) => p.country))] : [];
  return { places, workMode, remoteCountries: /anywhere|worldwide|global/.test(lower) ? [] : remoteCountries };
}

export function parseSalary(text?: string): Salary | null {
  if (!text) return null;
  const currency = /€|eur/i.test(text) ? "EUR" : /£|gbp/i.test(text) ? "GBP" : /cad/i.test(text) ? "CAD" : /aud/i.test(text) ? "AUD" : /sgd/i.test(text) ? "SGD" : "USD";
  const nums = [...text.matchAll(/(\d{2,3}(?:[,.]\d{3})*|\d+)\s*(k)?/gi)]
    .map((m) => Number(m[1]!.replace(/[,.]/g, "")) * (m[2] ? 1000 : 1))
    .filter((n) => n >= 10_000);
  if (nums.length === 0) return null;
  return { min: Math.min(...nums), max: Math.max(...nums), currency };
}

export function detectSponsorship(description: string): SponsorshipPolicy {
  const d = description.toLowerCase();
  if (/(unable to|cannot|can't|do not|does not|no) (provide |offer )?(visa )?sponsor/.test(d) || /must (already )?(have|hold) (the )?right to work/.test(d)) return "no";
  if (/(visa sponsorship (is )?(available|provided|offered)|we (can |will )?sponsor|relocation and visa support)/.test(d)) return "yes";
  return "unknown";
}

export function extractSkills(text: string) {
  const found = SKILL_VOCABULARY.filter((s) => new RegExp(`(^|[^a-z])${s.replace(/[.+]/g, "\\$&")}([^a-z]|$)`, "i").test(text));
  return found;
}

export function extractMinYears(text: string) {
  const m = text.match(/(\d{1,2})\+?\s*(?:years|yrs)/i);
  return m ? Math.min(Number(m[1]), 15) : 0;
}

/** Stable identity for the same role posted on several boards. */
export function jobFingerprint(companyDomain: string, title: string, country: string) {
  const key = [companyDomain.toLowerCase(), normalizeTitle(title).toLowerCase().replace(/[^a-z0-9]/g, ""), country.toUpperCase()].join("|");
  return createHash("sha256").update(key).digest("hex").slice(0, 32);
}

export function normalizePosting(raw: RawPosting, companyId: string, now: string): NewRow<Job> | null {
  const parsed = RawPostingSchema.safeParse(raw);
  if (!parsed.success) return null;
  const r = parsed.data;
  const title = normalizeTitle(r.title);
  const { places, workMode, remoteCountries } = parseLocation(r.location);
  if (places.length === 0) return null;
  const skills = extractSkills(`${r.title}\n${r.description}\n${(r.tags ?? []).join(" ")}`);
  const [required, nice] = [skills.slice(0, 6), skills.slice(6, 9)];
  const sentences = r.description.split(/(?<=\.)\s+/).filter((s) => s.length > 30);

  return {
    companyId,
    title,
    department: r.department ?? "Engineering",
    seniority: inferSeniority(title),
    employmentType: "full_time",
    locations: places,
    workMode,
    remoteCountries,
    salary: parseSalary(r.salaryText),
    description: sentences.slice(0, 2).join(" ") || r.description.slice(0, 400),
    responsibilities: sentences.slice(2, 6),
    requirements: required.map((s) => `Production experience with ${s}`),
    requiredSkills: required,
    niceToHaveSkills: nice,
    minYears: extractMinYears(r.description),
    visaSponsorship: detectSponsorship(r.description),
    source: r.source,
    sourceUrl: r.url,
    externalId: r.externalId,
    fingerprint: jobFingerprint(r.company.domain, title, places[0]!.country),
    status: "active",
    postedAt: r.postedAt,
    createdAt: now,
  };
}
