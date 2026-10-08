import type { RawPosting } from "./normalize";

/**
 * A job source adapter. Real integrations (Greenhouse/Lever/Ashby board APIs, partner feeds)
 * implement the same interface; the pipeline never knows which one it's talking to.
 */
export interface JobSource {
  id: string;
  name: string;
  fetchPostings(opts: { since: string; cursor?: string }): Promise<{ postings: RawPosting[]; nextCursor?: string }>;
}

/* ---------- Mock board: deterministic, realistic, includes cross-posted duplicates ---------- */

interface Template {
  company: { name: string; domain: string };
  title: string;
  location: string;
  salary?: string;
  body: string;
  department: string;
}

const POOL: Template[] = [
  { company: { name: "Helix Payments", domain: "helixpay.example" }, title: "Senior Backend Engineer, Ledger", location: "Amsterdam, Netherlands (Hybrid)", salary: "€90k–€115k", department: "Engineering", body: "Helix is scaling its ledger to new markets. You'll design double-entry systems in Go and PostgreSQL on AWS with Kafka for event streaming. 6+ years of backend experience. Visa sponsorship is available and we offer relocation support. You will own critical services end to end and partner with finance teams on correctness." },
  { company: { name: "Orbital Health", domain: "orbitalhealth.example" }, title: "Sr. Frontend Engineer (Hybrid)", location: "Berlin, Germany (Hybrid)", salary: "€75k–€95k", department: "Engineering", body: "Build researcher-facing tools in TypeScript, React and Next.js. Strong Accessibility and Design Systems skills matter here. 5+ years experience. We can sponsor visas for this role. You'll work closely with clinicians to make complex data legible." },
  { company: { name: "Kestrel Analytics", domain: "kestrel.example" }, title: "Data Engineer, Supply Graph", location: "London, United Kingdom", salary: "£80k–£100k", department: "Data", body: "Own pipelines in Python and SQL with dbt, orchestrated on Kubernetes in AWS. 4+ years building production data systems. Visa sponsorship is available. You will improve the freshness and reliability of the supply graph used by 400 enterprises." },
  { company: { name: "Saltmarsh Commerce", domain: "saltmarsh.example" }, title: "Staff Engineer, Platform APIs", location: "Dublin, Ireland", salary: "€130k–€160k", department: "Engineering", body: "Lead the evolution of our public GraphQL and REST APIs, built in TypeScript and Node.js on PostgreSQL and Redis. 9+ years of experience including technical leadership. Relocation and visa support is provided. You will set API standards used by 9,000 brands." },
  { company: { name: "Nimbus Data", domain: "nimbus.example" }, title: "Full-Stack Engineer, Developer Experience", location: "Sydney, Australia (Hybrid)", salary: "AUD 150k–175k", department: "Engineering", body: "Shape the console our customers use every day with React, TypeScript and Node.js on AWS. 3+ years experience. We sponsor visas. You'll talk to developers weekly and ship improvements fast." },
  { company: { name: "Arclight Security", domain: "arclight.example" }, title: "Detection Engineer", location: "Austin, United States (Remote)", salary: "$160k–$190k", department: "Security", body: "Write detections in Python and Go across AWS and Kubernetes telemetry. 5+ years in security engineering. Candidates must already have the right to work in the US; we are unable to sponsor visas. You will tune signal for regulated customers." },
  { company: { name: "Fernway", domain: "fernway.example" }, title: "Senior Data Scientist, Emissions", location: "Toronto, Canada (Remote)", salary: "CAD 140k–165k", department: "Data", body: "Model supply-chain emissions with Python, SQL and Machine Learning. 5+ years. You will build estimation models customers rely on for compliance reporting and partner with climate scientists." },
  { company: { name: "Quanta Freight", domain: "quanta.example" }, title: "Frontend Engineer, Booking", location: "Singapore, Singapore", salary: "SGD 90k–120k", department: "Engineering", body: "Build the booking experience in React and TypeScript with Data Visualization for lane analytics. 3+ years. Visa sponsorship is available for strong candidates. You'll ship weekly to shippers across Asia." },
  { company: { name: "Verdant Energy", domain: "verdant.example" }, title: "Platform Engineer", location: "Lisbon, Portugal (Hybrid)", salary: "€60k–€78k", department: "Infrastructure", body: "Run our Kubernetes platform on GCP with Terraform. 4+ years in platform or SRE roles. We can sponsor visas and help with relocation. You'll own reliability for grid-critical workloads." },
  { company: { name: "Parallax Studio", domain: "parallax.example" }, title: "Design Engineer", location: "Stockholm, Sweden (Hybrid)", salary: "€65k–€85k", department: "Design", body: "Bridge design and code: prototype in Figma, ship in React and TypeScript with WebGL for the canvas. 4+ years. Visa sponsorship is available. You'll define how motion feels across the product." },
];

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export class MockBoardSource implements JobSource {
  constructor(
    public id: string,
    public name: string,
  ) {}

  async fetchPostings({ since }: { since: string }) {
    // Each board exposes a rotating, overlapping slice of the pool so runs surface duplicates.
    const seed = hash(`${this.id}:${since.slice(0, 13)}`);
    const count = 4 + (seed % 4);
    const postings: RawPosting[] = [];
    for (let i = 0; i < count; i++) {
      const t = POOL[(seed + i * 3) % POOL.length]!;
      postings.push({
        source: this.id,
        externalId: `${this.id}-${hash(t.title + t.company.domain).toString(36)}`,
        url: `https://jobs.${this.id}.example/${t.company.domain.split(".")[0]}/${hash(t.title).toString(36)}`,
        company: t.company,
        title: i % 3 === 0 ? `${t.title} - ${t.location.includes("Remote") ? "Remote" : "Hybrid"}` : t.title,
        location: t.location,
        description: t.body,
        salaryText: t.salary,
        department: t.department,
        postedAt: new Date(Date.now() - (i + 1) * 3_600_000).toISOString(),
      });
    }
    // A malformed posting, which normalization must reject without failing the run.
    postings.push({ source: this.id, externalId: `${this.id}-broken-${seed % 97}`, url: "https://example.com/x", company: { name: "?", domain: "unknown.example" }, title: "??", location: "", description: "n/a", postedAt: new Date().toISOString() } as RawPosting);
    return { postings };
  }
}

export const SOURCES: JobSource[] = [
  new MockBoardSource("greenhouse", "Greenhouse boards"),
  new MockBoardSource("lever", "Lever postings"),
  new MockBoardSource("ashby", "Ashby job boards"),
  new MockBoardSource("workable", "Workable feed"),
];

export const getSource = (id: string) => SOURCES.find((s) => s.id === id);
