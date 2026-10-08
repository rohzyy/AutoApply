import type { CandidateProfile, Role, Seniority, Skill } from "@/lib/domain/types";
import { seedId } from "./ids";

export interface PersonSeed {
  key: string;
  email: string;
  fullName: string;
  role: Role;
  createdDaysAgo: number;
}

export const DEMO_CANDIDATE_KEY = "demo";
export const DEMO_ADMIN_KEY = "ops";

export const PEOPLE: PersonSeed[] = [
  { key: DEMO_CANDIDATE_KEY, email: "demo@autoapply.dev", fullName: "Ananya Rao", role: "candidate", createdDaysAgo: 34 },
  { key: DEMO_ADMIN_KEY, email: "ops@autoapply.dev", fullName: "Jordan Ellis", role: "admin", createdDaysAgo: 210 },
  { key: "rev-sam", email: "sam.okoye@autoapply.dev", fullName: "Sam Okoye", role: "reviewer", createdDaysAgo: 160 },
  { key: "rev-lena", email: "lena.fischer@autoapply.dev", fullName: "Lena Fischer", role: "reviewer", createdDaysAgo: 120 },
  { key: "c-mateo", email: "mateo.silva@example.com", fullName: "Mateo Silva", role: "candidate", createdDaysAgo: 22 },
  { key: "c-wei", email: "wei.chen@example.com", fullName: "Wei Chen", role: "candidate", createdDaysAgo: 18 },
  { key: "c-fatima", email: "fatima.alsayed@example.com", fullName: "Fatima Al-Sayed", role: "candidate", createdDaysAgo: 15 },
  { key: "c-daniel", email: "daniel.kowalski@example.com", fullName: "Daniel Kowalski", role: "candidate", createdDaysAgo: 12 },
  { key: "c-aisha", email: "aisha.bello@example.com", fullName: "Aisha Bello", role: "candidate", createdDaysAgo: 9 },
  { key: "c-hiro", email: "hiro.tanaka@example.com", fullName: "Hiro Tanaka", role: "candidate", createdDaysAgo: 7 },
  { key: "c-priya", email: "priya.nair@example.com", fullName: "Priya Nair", role: "candidate", createdDaysAgo: 5 },
  { key: "c-lucas", email: "lucas.moreau@example.com", fullName: "Lucas Moreau", role: "candidate", createdDaysAgo: 3 },
];

export const userIdByKey = (key: string) => seedId(`user:${key}`);

const sk = (name: string, level: Skill["level"], years: number): Skill => ({ name, level, years });

export function demoProfile(now: string): CandidateProfile {
  const userId = userIdByKey(DEMO_CANDIDATE_KEY);
  return {
    userId,
    headline: "Senior Full-Stack Engineer",
    summary:
      "Full-stack engineer with seven years building payments and commerce platforms in India's fastest-growing fintech market. I care about reliable systems, clean interfaces and teams that ship. Looking to relocate to Europe or Canada with an employer that sponsors.",
    location: { city: "Bengaluru", country: "IN" },
    citizenship: ["IN"],
    workAuthorizations: [{ country: "IN", status: "citizen" }],
    requiresSponsorship: true,
    willingToRelocate: true,
    relocationCountries: ["NL", "DE", "IE", "GB", "CA", "SG", "AE", "SE", "PT"],
    remotePreference: "any",
    preferredRoles: ["Senior Full-Stack Engineer", "Senior Software Engineer", "Frontend Engineer"],
    preferredCountries: ["NL", "DE", "IE", "CA"],
    seniority: "senior",
    yearsExperience: 7,
    skills: [
      sk("TypeScript", 5, 6),
      sk("React", 5, 6),
      sk("Node.js", 4, 6),
      sk("Next.js", 4, 4),
      sk("PostgreSQL", 4, 5),
      sk("AWS", 3, 4),
      sk("Python", 3, 3),
      sk("GraphQL", 3, 3),
      sk("Redis", 3, 3),
      sk("Docker", 3, 4),
      sk("Kafka", 2, 2),
      sk("Design Systems", 3, 3),
      sk("Accessibility", 3, 3),
    ],
    experience: [
      {
        id: seedId("exp:demo:1"),
        company: "Paystream",
        title: "Senior Software Engineer",
        startDate: "2022-03",
        endDate: null,
        description: "Merchant payouts and reconciliation platform serving 180k merchants.",
        highlights: [
          "Led the rebuild of the payouts dashboard in React and TypeScript, cutting support tickets by 32%.",
          "Designed an idempotent payout API on Node.js and PostgreSQL processing 4M transfers a month.",
          "Worked on migrating reconciliation jobs to event-driven workers on AWS.",
          "Mentored four engineers and ran the frontend guild.",
        ],
        skills: ["TypeScript", "React", "Node.js", "PostgreSQL", "AWS", "Kafka", "Redis"],
      },
      {
        id: seedId("exp:demo:2"),
        company: "Cartwheel Commerce",
        title: "Software Engineer",
        startDate: "2019-06",
        endDate: "2022-02",
        description: "Headless storefront platform for D2C brands.",
        highlights: [
          "Built the checkout flow used by 1,200 storefronts, improving conversion by 6%.",
          "Responsible for the GraphQL gateway and its caching layer.",
          "Introduced a shared component library adopted by three product teams.",
        ],
        skills: ["React", "GraphQL", "Node.js", "Redis", "Design Systems"],
      },
      {
        id: seedId("exp:demo:3"),
        company: "Lumen Labs",
        title: "Associate Engineer",
        startDate: "2018-01",
        endDate: "2019-05",
        description: "Internal analytics tooling.",
        highlights: ["Helped build Python data pipelines for weekly business reporting."],
        skills: ["Python", "PostgreSQL"],
      },
    ],
    education: [{ id: seedId("edu:demo:1"), school: "National Institute of Technology Karnataka", degree: "B.Tech", field: "Computer Science", year: 2017 }],
    salaryExpectation: { min: 85000, currency: "EUR" },
    links: { linkedin: "https://linkedin.com/in/ananya-rao-demo", github: "https://github.com/ananya-rao-demo" },
    updatedAt: now,
  };
}

interface LiteProfile {
  key: string;
  headline: string;
  city: string;
  country: string;
  seniority: Seniority;
  years: number;
  skills: [string, Skill["level"]][];
  auth: string[];
  roles: string[];
  targets: string[];
}

const OTHERS: LiteProfile[] = [
  { key: "c-mateo", headline: "Product Designer", city: "São Paulo", country: "BR", seniority: "mid", years: 5, skills: [["Figma", 5], ["Prototyping", 4], ["Design Systems", 4], ["User Research", 3], ["Motion Design", 3], ["Framer", 3]], auth: ["BR", "PT"], roles: ["Product Designer"], targets: ["PT", "SE", "NL"] },
  { key: "c-wei", headline: "Backend Engineer", city: "Taipei", country: "TW", seniority: "senior", years: 8, skills: [["Go", 5], ["PostgreSQL", 4], ["Kafka", 4], ["AWS", 4], ["Kubernetes", 3], ["TypeScript", 3]], auth: [], roles: ["Backend Engineer", "Platform Engineer"], targets: ["SG", "AU", "NL"] },
  { key: "c-fatima", headline: "Senior Product Manager", city: "Cairo", country: "EG", seniority: "senior", years: 7, skills: [["Product Strategy", 5], ["Roadmapping", 4], ["SQL", 3], ["Product Discovery", 4], ["Stakeholder Management", 4]], auth: ["AE"], roles: ["Product Manager"], targets: ["AE", "DE", "GB"] },
  { key: "c-daniel", headline: "Platform Engineer", city: "Kraków", country: "PL", seniority: "senior", years: 6, skills: [["Kubernetes", 5], ["Terraform", 5], ["AWS", 4], ["Go", 3], ["Java", 3]], auth: ["PL"], roles: ["Platform Engineer", "SRE"], targets: ["DE", "NL", "IE"] },
  { key: "c-aisha", headline: "Data Scientist", city: "Lagos", country: "NG", seniority: "mid", years: 4, skills: [["Python", 5], ["SQL", 4], ["Machine Learning", 4], ["PyTorch", 3], ["Experimentation", 3]], auth: [], roles: ["Data Scientist", "ML Engineer"], targets: ["GB", "IE", "CA"] },
  { key: "c-hiro", headline: "Frontend Engineer", city: "Osaka", country: "JP", seniority: "mid", years: 4, skills: [["TypeScript", 4], ["React", 5], ["WebGL", 4], ["Accessibility", 3], ["Performance", 3]], auth: [], roles: ["Frontend Engineer"], targets: ["SE", "DE", "AU"] },
  { key: "c-priya", headline: "Machine Learning Engineer", city: "Chennai", country: "IN", seniority: "senior", years: 6, skills: [["Python", 5], ["PyTorch", 5], ["SQL", 4], ["AWS", 3], ["Kubernetes", 2]], auth: [], roles: ["Machine Learning Engineer"], targets: ["GB", "CA", "DE"] },
  { key: "c-lucas", headline: "Full-Stack Engineer", city: "Lyon", country: "FR", seniority: "mid", years: 3, skills: [["TypeScript", 4], ["React", 4], ["Python", 3], ["PostgreSQL", 3]], auth: ["FR"], roles: ["Full-Stack Engineer"], targets: ["PT", "NL", "IE"] },
];

export function otherProfiles(now: string): CandidateProfile[] {
  return OTHERS.map((o) => ({
    userId: userIdByKey(o.key),
    headline: o.headline,
    summary: `${o.headline} with ${o.years} years of experience, looking for international opportunities in ${o.targets.join(", ")}.`,
    location: { city: o.city, country: o.country },
    citizenship: o.auth.slice(0, 1),
    workAuthorizations: o.auth.map((country) => ({ country, status: "citizen" as const })),
    requiresSponsorship: true,
    willingToRelocate: true,
    relocationCountries: o.targets,
    remotePreference: "any",
    preferredRoles: o.roles,
    preferredCountries: o.targets,
    seniority: o.seniority,
    yearsExperience: o.years,
    skills: o.skills.map(([name, level]) => ({ name, level, years: Math.max(1, o.years - (5 - level)) })),
    experience: [
      {
        id: seedId(`exp:${o.key}:1`),
        company: "Previous employer",
        title: o.headline,
        startDate: `${2026 - o.years}-01`,
        endDate: null,
        description: "",
        highlights: [`Shipped core ${o.headline.toLowerCase()} work across ${o.skills.slice(0, 2).map((s) => s[0]).join(" and ")}.`],
        skills: o.skills.map((s) => s[0]),
      },
    ],
    education: [],
    salaryExpectation: null,
    links: {},
    updatedAt: now,
  }));
}
