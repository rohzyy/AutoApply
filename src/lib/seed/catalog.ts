import type { Company, Plan, Seniority, SponsorshipPolicy, WorkMode } from "@/lib/domain/types";
import { seedId } from "./ids";

/* All companies are fictional. */
type CompanySeed = Omit<Company, "id"> & { key: string };

const COMPANY_SEEDS: CompanySeed[] = [
  { key: "helix", name: "Helix Payments", domain: "helixpay.example", industry: "Fintech", size: "500–1,000", headquarters: { city: "Amsterdam", country: "NL" }, description: "Real-time payment infrastructure for marketplaces across Europe and LATAM. Processes €40B annually.", sponsorshipHistory: "frequent", website: "https://helixpay.example", brandColor: "#6E8BFF" },
  { key: "orbital", name: "Orbital Health", domain: "orbitalhealth.example", industry: "Health tech", size: "200–500", headquarters: { city: "Berlin", country: "DE" }, description: "Clinical data platform connecting 1,200 European hospitals to research networks.", sponsorshipHistory: "frequent", website: "https://orbitalhealth.example", brandColor: "#3DD68C" },
  { key: "kestrel", name: "Kestrel Analytics", domain: "kestrel.example", industry: "Data & AI", size: "1,000–5,000", headquarters: { city: "London", country: "GB" }, description: "Decision intelligence for supply chains. Series D, profitable since 2024.", sponsorshipHistory: "frequent", website: "https://kestrel.example", brandColor: "#F5B544" },
  { key: "fernway", name: "Fernway", domain: "fernway.example", industry: "Climate", size: "50–200", headquarters: { city: "Toronto", country: "CA" }, description: "Carbon accounting software used by 3,000 mid-market manufacturers.", sponsorshipHistory: "occasional", website: "https://fernway.example", brandColor: "#5CC8A1" },
  { key: "monolith", name: "Monolith Robotics", domain: "monolith.example", industry: "Robotics", size: "200–500", headquarters: { city: "Munich", country: "DE" }, description: "Autonomous inspection robots for energy and heavy industry.", sponsorshipHistory: "frequent", website: "https://monolith.example", brandColor: "#B5B9C2" },
  { key: "saltmarsh", name: "Saltmarsh Commerce", domain: "saltmarsh.example", industry: "E-commerce", size: "1,000–5,000", headquarters: { city: "Dublin", country: "IE" }, description: "Headless commerce platform powering 9,000 direct-to-consumer brands.", sponsorshipHistory: "frequent", website: "https://saltmarsh.example", brandColor: "#FF8A65" },
  { key: "quanta", name: "Quanta Freight", domain: "quanta.example", industry: "Logistics", size: "500–1,000", headquarters: { city: "Singapore", country: "SG" }, description: "Digital freight forwarding across 40 APAC trade lanes.", sponsorshipHistory: "occasional", website: "https://quanta.example", brandColor: "#4FC3F7" },
  { key: "arclight", name: "Arclight Security", domain: "arclight.example", industry: "Security", size: "200–500", headquarters: { city: "Austin", country: "US" }, description: "Cloud detection and response for regulated industries. Fully distributed team.", sponsorshipHistory: "none", website: "https://arclight.example", brandColor: "#FF6369" },
  { key: "verdant", name: "Verdant Energy", domain: "verdant.example", industry: "Energy", size: "50–200", headquarters: { city: "Lisbon", country: "PT" }, description: "Grid-scale battery optimization software for utilities in Southern Europe.", sponsorshipHistory: "occasional", website: "https://verdant.example", brandColor: "#9CCC65" },
  { key: "parallax", name: "Parallax Studio", domain: "parallax.example", industry: "Design tools", size: "50–200", headquarters: { city: "Stockholm", country: "SE" }, description: "Collaborative motion design tools for product teams.", sponsorshipHistory: "frequent", website: "https://parallax.example", brandColor: "#C792EA" },
  { key: "cobalt", name: "Cobalt Ledger", domain: "cobalt.example", industry: "Fintech", size: "200–500", headquarters: { city: "Zurich", country: "CH" }, description: "Treasury and digital asset custody for private banks.", sponsorshipHistory: "occasional", website: "https://cobalt.example", brandColor: "#5A8FFF" },
  { key: "meridian", name: "Meridian Mobility", domain: "meridian.example", industry: "Mobility", size: "500–1,000", headquarters: { city: "Dubai", country: "AE" }, description: "Fleet electrification and routing for Gulf logistics operators.", sponsorshipHistory: "frequent", website: "https://meridian.example", brandColor: "#FFD54F" },
  { key: "nimbus", name: "Nimbus Data", domain: "nimbus.example", industry: "Infrastructure", size: "200–500", headquarters: { city: "Sydney", country: "AU" }, description: "Managed streaming data platform for APAC enterprises.", sponsorshipHistory: "frequent", website: "https://nimbus.example", brandColor: "#80CBC4" },
  { key: "kiteandkey", name: "Kite & Key", domain: "kiteandkey.example", industry: "Proptech", size: "50–200", headquarters: { city: "New York", country: "US" }, description: "Leasing operations software for multifamily operators.", sponsorshipHistory: "occasional", website: "https://kiteandkey.example", brandColor: "#F48FB1" },
];

export const COMPANIES: Company[] = COMPANY_SEEDS.map(({ key, ...c }) => ({ id: seedId(`company:${key}`), ...c }));
export const companyIdByKey = (key: string) => seedId(`company:${key}`);

/* ---------- Jobs ---------- */

export interface JobSeed {
  key: string;
  company: string;
  title: string;
  department: string;
  seniority: Seniority;
  workMode: WorkMode;
  locations: [string, string][];
  remoteCountries?: string[];
  salary?: [number, number, string];
  required: string[];
  nice: string[];
  minYears: number;
  sponsorship: SponsorshipPolicy;
  postedDaysAgo: number;
  template: keyof typeof ROLE_TEMPLATES;
}

export const ROLE_TEMPLATES = {
  fullstack: {
    description: "own product surfaces end to end — from data model and APIs to the interface customers touch every day",
    responsibilities: [
      "Design, build and ship full-stack features across our TypeScript services and React front end",
      "Partner with product and design to shape scope, trade-offs and rollout plans",
      "Raise the bar on reliability with tests, observability and thoughtful code review",
      "Mentor engineers and contribute to architecture decisions",
    ],
  },
  frontend: {
    description: "craft fast, accessible interfaces and the design-system primitives behind them",
    responsibilities: [
      "Build high-quality UI with React, TypeScript and a shared component library",
      "Own front-end performance budgets and Core Web Vitals",
      "Collaborate closely with designers on interaction details and motion",
      "Drive accessibility standards across the product",
    ],
  },
  backend: {
    description: "design resilient services and data pipelines that scale with our customers",
    responsibilities: [
      "Build and operate distributed services with strong SLAs",
      "Model data and evolve schemas safely in PostgreSQL",
      "Improve observability, on-call health and incident response",
      "Lead technical design reviews across teams",
    ],
  },
  data: {
    description: "turn messy operational data into models and products customers rely on",
    responsibilities: [
      "Build production ML and analytics pipelines",
      "Partner with product teams to frame problems and measure impact",
      "Own data quality, lineage and model monitoring",
      "Communicate findings clearly to technical and business stakeholders",
    ],
  },
  product: {
    description: "set direction for a core product area and translate strategy into shipped outcomes",
    responsibilities: [
      "Own the roadmap for your area and align stakeholders around it",
      "Run discovery with customers and synthesize insight into clear bets",
      "Define success metrics and hold the team accountable to outcomes",
      "Work hand in hand with engineering and design leads",
    ],
  },
  design: {
    description: "shape how customers experience the product, from systems thinking to pixel detail",
    responsibilities: [
      "Lead end-to-end design for complex workflows",
      "Evolve the design system with engineering",
      "Prototype in high fidelity, including motion",
      "Run usability research and share insight broadly",
    ],
  },
  platform: {
    description: "build the paved road our engineers use to ship safely and quickly",
    responsibilities: [
      "Operate Kubernetes and cloud infrastructure with infrastructure as code",
      "Improve CI/CD speed, reliability and developer experience",
      "Own platform security baselines and cost efficiency",
      "Partner with product teams on scaling and reliability",
    ],
  },
} as const;

export const JOB_SEEDS: JobSeed[] = [
  { key: "helix-sfe", company: "helix", title: "Senior Full-Stack Engineer, Payouts", department: "Engineering", seniority: "senior", workMode: "hybrid", locations: [["Amsterdam", "NL"]], salary: [85000, 110000, "EUR"], required: ["TypeScript", "React", "Node.js", "PostgreSQL", "AWS"], nice: ["Kafka", "GraphQL"], minYears: 5, sponsorship: "yes", postedDaysAgo: 1, template: "fullstack" },
  { key: "helix-fe", company: "helix", title: "Staff Frontend Engineer, Dashboard", department: "Engineering", seniority: "lead", workMode: "hybrid", locations: [["Amsterdam", "NL"]], salary: [105000, 135000, "EUR"], required: ["TypeScript", "React", "Next.js", "Design Systems"], nice: ["Figma", "Accessibility"], minYears: 8, sponsorship: "yes", postedDaysAgo: 4, template: "frontend" },
  { key: "orbital-sfe", company: "orbital", title: "Senior Software Engineer, Clinical Data", department: "Engineering", seniority: "senior", workMode: "hybrid", locations: [["Berlin", "DE"]], salary: [80000, 100000, "EUR"], required: ["TypeScript", "Node.js", "PostgreSQL", "Docker"], nice: ["Python", "FHIR"], minYears: 5, sponsorship: "yes", postedDaysAgo: 2, template: "backend" },
  { key: "orbital-pm", company: "orbital", title: "Product Manager, Research Network", department: "Product", seniority: "senior", workMode: "hybrid", locations: [["Berlin", "DE"]], salary: [85000, 105000, "EUR"], required: ["Product Strategy", "Product Discovery", "SQL", "Stakeholder Management"], nice: ["Healthcare"], minYears: 5, sponsorship: "yes", postedDaysAgo: 6, template: "product" },
  { key: "kestrel-ml", company: "kestrel", title: "Machine Learning Engineer, Forecasting", department: "Data", seniority: "senior", workMode: "hybrid", locations: [["London", "GB"]], salary: [95000, 125000, "GBP"], required: ["Python", "PyTorch", "SQL", "AWS"], nice: ["Kubernetes", "Spark"], minYears: 5, sponsorship: "yes", postedDaysAgo: 3, template: "data" },
  { key: "kestrel-sfe", company: "kestrel", title: "Senior Full-Stack Engineer, Planning", department: "Engineering", seniority: "senior", workMode: "hybrid", locations: [["London", "GB"]], salary: [85000, 110000, "GBP"], required: ["TypeScript", "React", "Python", "PostgreSQL"], nice: ["GraphQL", "Redis"], minYears: 5, sponsorship: "unknown", postedDaysAgo: 2, template: "fullstack" },
  { key: "fernway-fs", company: "fernway", title: "Full-Stack Engineer", department: "Engineering", seniority: "mid", workMode: "remote", locations: [["Toronto", "CA"]], remoteCountries: ["CA"], salary: [120000, 150000, "CAD"], required: ["TypeScript", "React", "Node.js", "PostgreSQL"], nice: ["Climate"], minYears: 3, sponsorship: "unknown", postedDaysAgo: 5, template: "fullstack" },
  { key: "fernway-design", company: "fernway", title: "Senior Product Designer", department: "Design", seniority: "senior", workMode: "remote", locations: [["Toronto", "CA"]], remoteCountries: ["CA", "US"], salary: [125000, 155000, "CAD"], required: ["Figma", "Design Systems", "Prototyping", "User Research"], nice: ["Framer"], minYears: 5, sponsorship: "no", postedDaysAgo: 9, template: "design" },
  { key: "monolith-platform", company: "monolith", title: "Senior Platform Engineer", department: "Infrastructure", seniority: "senior", workMode: "onsite", locations: [["Munich", "DE"]], salary: [85000, 105000, "EUR"], required: ["Kubernetes", "Terraform", "AWS", "Go"], nice: ["Rust"], minYears: 5, sponsorship: "yes", postedDaysAgo: 7, template: "platform" },
  { key: "monolith-fe", company: "monolith", title: "Frontend Engineer, Fleet Console", department: "Engineering", seniority: "mid", workMode: "hybrid", locations: [["Munich", "DE"]], salary: [65000, 82000, "EUR"], required: ["TypeScript", "React", "WebGL"], nice: ["Three.js"], minYears: 3, sponsorship: "yes", postedDaysAgo: 11, template: "frontend" },
  { key: "saltmarsh-sfe", company: "saltmarsh", title: "Senior Software Engineer, Checkout", department: "Engineering", seniority: "senior", workMode: "hybrid", locations: [["Dublin", "IE"]], salary: [90000, 120000, "EUR"], required: ["TypeScript", "Node.js", "React", "PostgreSQL", "Redis"], nice: ["GraphQL", "AWS"], minYears: 5, sponsorship: "yes", postedDaysAgo: 1, template: "fullstack" },
  { key: "saltmarsh-em", company: "saltmarsh", title: "Engineering Manager, Storefront", department: "Engineering", seniority: "lead", workMode: "hybrid", locations: [["Dublin", "IE"]], salary: [125000, 150000, "EUR"], required: ["People Management", "TypeScript", "System Design"], nice: ["Next.js"], minYears: 8, sponsorship: "yes", postedDaysAgo: 8, template: "fullstack" },
  { key: "quanta-be", company: "quanta", title: "Backend Engineer, Rates Engine", department: "Engineering", seniority: "senior", workMode: "onsite", locations: [["Singapore", "SG"]], salary: [110000, 140000, "SGD"], required: ["Go", "PostgreSQL", "Kafka", "AWS"], nice: ["TypeScript"], minYears: 5, sponsorship: "unknown", postedDaysAgo: 3, template: "backend" },
  { key: "quanta-data", company: "quanta", title: "Data Analyst, Trade Lanes", department: "Data", seniority: "mid", workMode: "hybrid", locations: [["Singapore", "SG"]], salary: [70000, 90000, "SGD"], required: ["SQL", "Python", "Tableau"], nice: ["dbt"], minYears: 2, sponsorship: "unknown", postedDaysAgo: 12, template: "data" },
  { key: "arclight-sfe", company: "arclight", title: "Senior Software Engineer, Detection", department: "Engineering", seniority: "senior", workMode: "remote", locations: [["Austin", "US"]], remoteCountries: ["US"], salary: [170000, 210000, "USD"], required: ["Go", "Kubernetes", "AWS", "Security"], nice: ["Rust"], minYears: 6, sponsorship: "no", postedDaysAgo: 2, template: "backend" },
  { key: "arclight-fe", company: "arclight", title: "Frontend Engineer, Analyst Console", department: "Engineering", seniority: "mid", workMode: "remote", locations: [["Austin", "US"]], remoteCountries: [], salary: [130000, 160000, "USD"], required: ["TypeScript", "React", "Data Visualization"], nice: ["D3"], minYears: 3, sponsorship: "no", postedDaysAgo: 4, template: "frontend" },
  { key: "verdant-fs", company: "verdant", title: "Full-Stack Engineer, Grid Optimization", department: "Engineering", seniority: "mid", workMode: "hybrid", locations: [["Lisbon", "PT"]], salary: [55000, 72000, "EUR"], required: ["TypeScript", "React", "Python", "PostgreSQL"], nice: ["TimescaleDB"], minYears: 3, sponsorship: "yes", postedDaysAgo: 5, template: "fullstack" },
  { key: "parallax-design", company: "parallax", title: "Product Designer, Motion", department: "Design", seniority: "mid", workMode: "hybrid", locations: [["Stockholm", "SE"]], salary: [55000, 70000, "EUR"], required: ["Figma", "Prototyping", "Motion Design"], nice: ["Framer", "After Effects"], minYears: 3, sponsorship: "yes", postedDaysAgo: 6, template: "design" },
  { key: "parallax-fe", company: "parallax", title: "Senior Frontend Engineer, Canvas", department: "Engineering", seniority: "senior", workMode: "hybrid", locations: [["Stockholm", "SE"]], salary: [70000, 90000, "EUR"], required: ["TypeScript", "React", "WebGL", "Performance"], nice: ["Rust", "WebAssembly"], minYears: 5, sponsorship: "yes", postedDaysAgo: 2, template: "frontend" },
  { key: "cobalt-be", company: "cobalt", title: "Senior Backend Engineer, Custody", department: "Engineering", seniority: "senior", workMode: "onsite", locations: [["Zurich", "CH"]], salary: [140000, 170000, "CHF"], required: ["Kotlin", "PostgreSQL", "Security", "Kafka"], nice: ["Go"], minYears: 6, sponsorship: "unknown", postedDaysAgo: 10, template: "backend" },
  { key: "meridian-fs", company: "meridian", title: "Senior Full-Stack Engineer, Routing", department: "Engineering", seniority: "senior", workMode: "onsite", locations: [["Dubai", "AE"]], salary: [300000, 380000, "AED"], required: ["TypeScript", "React", "Node.js", "PostgreSQL", "Maps"], nice: ["Python"], minYears: 5, sponsorship: "yes", postedDaysAgo: 1, template: "fullstack" },
  { key: "meridian-pm", company: "meridian", title: "Senior Product Manager, Fleet", department: "Product", seniority: "senior", workMode: "onsite", locations: [["Dubai", "AE"]], salary: [360000, 440000, "AED"], required: ["Product Strategy", "Roadmapping", "SQL"], nice: ["Logistics"], minYears: 6, sponsorship: "yes", postedDaysAgo: 4, template: "product" },
  { key: "nimbus-platform", company: "nimbus", title: "Platform Engineer, Streaming", department: "Infrastructure", seniority: "mid", workMode: "hybrid", locations: [["Sydney", "AU"]], salary: [150000, 180000, "AUD"], required: ["Kafka", "Kubernetes", "Terraform", "Java"], nice: ["Go"], minYears: 3, sponsorship: "yes", postedDaysAgo: 3, template: "platform" },
  { key: "nimbus-sfe", company: "nimbus", title: "Senior Software Engineer, Console", department: "Engineering", seniority: "senior", workMode: "hybrid", locations: [["Sydney", "AU"]], salary: [170000, 200000, "AUD"], required: ["TypeScript", "React", "Node.js", "AWS"], nice: ["Kafka"], minYears: 5, sponsorship: "yes", postedDaysAgo: 7, template: "fullstack" },
  { key: "kk-fs", company: "kiteandkey", title: "Senior Full-Stack Engineer", department: "Engineering", seniority: "senior", workMode: "hybrid", locations: [["New York", "US"]], salary: [175000, 205000, "USD"], required: ["TypeScript", "React", "Node.js", "PostgreSQL"], nice: ["Next.js"], minYears: 5, sponsorship: "unknown", postedDaysAgo: 2, template: "fullstack" },
  { key: "kk-data", company: "kiteandkey", title: "Analytics Engineer", department: "Data", seniority: "mid", workMode: "remote", locations: [["New York", "US"]], remoteCountries: ["US", "CA"], salary: [130000, 155000, "USD"], required: ["SQL", "dbt", "Python", "Looker"], nice: ["Snowflake"], minYears: 3, sponsorship: "no", postedDaysAgo: 13, template: "data" },
  { key: "helix-platform", company: "helix", title: "Site Reliability Engineer", department: "Infrastructure", seniority: "senior", workMode: "hybrid", locations: [["Amsterdam", "NL"]], salary: [85000, 108000, "EUR"], required: ["Kubernetes", "AWS", "Terraform", "Go"], nice: ["PostgreSQL"], minYears: 5, sponsorship: "yes", postedDaysAgo: 9, template: "platform" },
  { key: "kestrel-pm", company: "kestrel", title: "Principal Product Manager, AI", department: "Product", seniority: "lead", workMode: "hybrid", locations: [["London", "GB"]], salary: [130000, 160000, "GBP"], required: ["Product Strategy", "Machine Learning", "Roadmapping"], nice: ["SQL"], minYears: 9, sponsorship: "yes", postedDaysAgo: 5, template: "product" },
  { key: "orbital-fe", company: "orbital", title: "Frontend Engineer, Researcher Tools", department: "Engineering", seniority: "mid", workMode: "remote", locations: [["Berlin", "DE"]], remoteCountries: ["DE", "NL", "PT", "ES", "IE", "PL"], salary: [65000, 80000, "EUR"], required: ["TypeScript", "React", "Accessibility"], nice: ["Next.js"], minYears: 3, sponsorship: "unknown", postedDaysAgo: 3, template: "frontend" },
  { key: "saltmarsh-ml", company: "saltmarsh", title: "Senior Data Scientist, Personalization", department: "Data", seniority: "senior", workMode: "hybrid", locations: [["Dublin", "IE"]], salary: [95000, 120000, "EUR"], required: ["Python", "SQL", "Machine Learning", "Experimentation"], nice: ["PyTorch"], minYears: 5, sponsorship: "yes", postedDaysAgo: 6, template: "data" },
];

export const jobIdByKey = (key: string) => seedId(`job:${key}`);

/* ---------- Plans (also stored in the plans table; the DB is the source of truth) ---------- */

export const PLANS: Plan[] = [
  {
    id: "entry",
    name: "Entry",
    tagline: "For a focused search in one or two markets.",
    priceMonthly: 19,
    priceYearly: 180,
    currency: "USD",
    features: [
      "25 AI-ranked matches per week",
      "Eligibility & sponsorship screening",
      "5 tailored applications per month",
      "Application tracker",
    ],
    limits: { matchesPerWeek: 25, tailoredPerMonth: 5, humanReviewsPerMonth: 0 },
    highlighted: false,
    sortOrder: 1,
    active: true,
  },
  {
    id: "professional",
    name: "Professional",
    tagline: "For an active international search with human support.",
    priceMonthly: 49,
    priceYearly: 468,
    currency: "USD",
    features: [
      "Unlimited AI-ranked matches",
      "30 tailored applications per month",
      "10 human-reviewed applications per month",
      "Cover letters and skill-gap plans",
      "Sponsorship likelihood insights",
    ],
    limits: { matchesPerWeek: null, tailoredPerMonth: 30, humanReviewsPerMonth: 10 },
    highlighted: true,
    sortOrder: 2,
    active: true,
  },
  {
    id: "executive",
    name: "Executive",
    tagline: "For senior leaders who want a dedicated specialist.",
    priceMonthly: 149,
    priceYearly: 1428,
    currency: "USD",
    features: [
      "Everything in Professional",
      "Unlimited tailored applications",
      "40 human-reviewed applications per month",
      "Dedicated application specialist",
      "Executive positioning review",
    ],
    limits: { matchesPerWeek: null, tailoredPerMonth: null, humanReviewsPerMonth: 40 },
    highlighted: false,
    sortOrder: 3,
    active: true,
  },
];
