import { ArrowRight, Ban, Check, FileLock2, Globe2, KeyRound, Lock, ScrollText, Sparkles, UserCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FactorBreakdown } from "@/components/app/match";
import { HeroDemo } from "@/components/marketing/hero-demo";
import { PricingTable } from "@/components/marketing/pricing-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CompanyMark } from "@/components/ui/marks";
import { InView, Reveal } from "@/components/ui/reveal";
import { SectionLabel } from "@/components/ui/panel";
import { ScoreRing } from "@/components/ui/score";
import { Skeleton } from "@/components/ui/skeleton";
import type { MatchFactor } from "@/lib/domain/types";
import { FACTOR_WEIGHTS } from "@/lib/services/matching/engine";
import { publicPlans } from "@/lib/services/public";

export const metadata: Metadata = {
  title: { absolute: "AutoApply — Apply where you're actually eligible" },
};

const Container = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`mx-auto w-full max-w-[1200px] px-4 sm:px-6 ${className}`}>{children}</div>
);

function SectionHeading({ eyebrow, title, body, align = "left" }: { eyebrow: string; title: React.ReactNode; body?: string; align?: "left" | "center" }) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <SectionLabel>{eyebrow}</SectionLabel>
      <h2 className="mt-3 text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] sm:text-[40px]">{title}</h2>
      {body && <p className="mt-4 text-[15px] leading-relaxed text-muted sm:text-base">{body}</p>}
    </div>
  );
}

const STEPS = [
  { key: "Profile", title: "Build one profile", body: "Upload a resume. We extract skills and experience; you confirm work authorization, target countries and salary." },
  { key: "Match", title: "Get ranked matches", body: "Every role is scored on six explainable factors. Ineligible roles are filtered out before you see them." },
  { key: "Tailor", title: "Tailor in minutes", body: "AI rewrites bullets and drafts a cover letter for the specific role. Accept or reject every change." },
  { key: "Apply", title: "Human-reviewed apply", body: "A specialist checks eligibility, accuracy and fit, then submits through the employer's channel." },
  { key: "Track", title: "Track every reply", body: "Screening, interviews and offers in one board, with notes, next steps and a full history." },
];

const SAMPLE_FACTORS: MatchFactor[] = [
  { key: "skills", label: "Skills", rating: "strong", score: 94, weight: FACTOR_WEIGHTS.skills, reason: "Covers all 5 required skills — TypeScript, React, Node.js, PostgreSQL, AWS." },
  { key: "experience", label: "Experience", rating: "strong", score: 100, weight: FACTOR_WEIGHTS.experience, reason: "7 years of experience at the expected senior level." },
  { key: "eligibility", label: "Eligibility", rating: "moderate", score: 75, weight: FACTOR_WEIGHTS.eligibility, reason: "Eligible with an employer-sponsored visa for the Netherlands." },
  { key: "location", label: "Location", rating: "strong", score: 82, weight: FACTOR_WEIGHTS.location, reason: "Netherlands is one of your target countries." },
  { key: "sponsorship", label: "Sponsorship", rating: "strong", score: 90, weight: FACTOR_WEIGHTS.sponsorship, reason: "Listing explicitly offers visa sponsorship." },
];

const COUNTRIES = [
  { name: "Netherlands", roles: 14, status: "Sponsorship available", tone: "success" as const, share: 88 },
  { name: "Germany", roles: 11, status: "Sponsorship available", tone: "success" as const, share: 74 },
  { name: "Ireland", roles: 9, status: "Sponsorship available", tone: "success" as const, share: 61 },
  { name: "Canada", roles: 4, status: "Sponsorship sometimes", tone: "warning" as const, share: 32 },
  { name: "United States", roles: 0, status: "Requires existing authorization", tone: "danger" as const, share: 4 },
];

const SECURITY = [
  { icon: Lock, title: "Row-level security", body: "Every query runs as you. Postgres policies make other candidates' data unreachable, not just hidden." },
  { icon: FileLock2, title: "Private documents", body: "Resumes live in a private bucket, validated by file signature and served through short-lived signed links." },
  { icon: UserCheck, title: "You approve everything", body: "AI drafts. You accept or reject each change. Nothing is submitted without your sign-off and a human check." },
  { icon: ScrollText, title: "Full audit trail", body: "Sign-ins, edits, reviews and submissions are recorded with who did what and when." },
  { icon: Ban, title: "No mass-apply spam", body: "We apply selectively to roles you're eligible for — protecting your reputation with recruiters." },
  { icon: KeyRound, title: "Least privilege", body: "Service credentials never reach the browser. Staff access is role-gated and logged." },
];

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="bg-grid pointer-events-none absolute inset-0" aria-hidden />
        <div className="glow-top pointer-events-none absolute inset-0" aria-hidden />
        <Container className="relative pb-20 pt-16 sm:pt-24 md:pb-28">
          <Reveal className="flex justify-center">
            <Link href="#international" className="group inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface/80 py-1 pl-1 pr-3 text-xs text-muted transition-colors hover:border-white/20 hover:text-fg">
              <span className="rounded-full bg-accent-soft px-2 py-0.5 font-medium text-[#8FB3FF]">Visa-aware</span>
              Matching built for international candidates
              <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 className="mx-auto mt-7 max-w-[820px] text-center text-[40px] font-semibold leading-[1.02] tracking-[-0.045em] sm:text-[56px] lg:text-[64px]">
              <span className="text-gradient">Apply where you&apos;re</span>
              <br className="hidden sm:block" /> <span className="text-gradient">actually eligible.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mx-auto mt-6 max-w-[620px] text-center text-[15px] leading-relaxed text-muted sm:text-[17px]">
              AutoApply ranks roles by your skills, experience, work authorization and sponsorship needs — then tailors each application and has a specialist review it before it&apos;s sent.
            </p>
          </Reveal>
          <Reveal delay={0.15} className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/signup">
                Start your search <ArrowRight aria-hidden />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto">
              <Link href="#how-it-works">See how it works</Link>
            </Button>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-5 text-center text-xs text-subtle">No auto-spam. Nothing is submitted without your approval.</p>
          </Reveal>
          <Reveal delay={0.3} y={24} className="mt-16 md:mt-20">
            <HeroDemo />
          </Reveal>
        </Container>
      </section>

      {/* Facts */}
      <section aria-label="Product facts" className="border-y border-line bg-surface/40">
        <Container className="grid grid-cols-2 divide-line md:grid-cols-4 md:divide-x">
          {[
            ["6", "explainable match factors"],
            ["24h", "human review turnaround"],
            ["20+", "countries with visa-aware filters"],
            ["0", "applications sent without your OK"],
          ].map(([n, label]) => (
            <div key={label} className="px-2 py-8 md:px-8">
              <p className="text-3xl font-semibold tracking-[-0.03em] tabular">{n}</p>
              <p className="mt-1 text-[13px] text-muted">{label}</p>
            </div>
          ))}
        </Container>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-20 py-24 md:py-32">
        <Container>
          <InView>
            <SectionHeading eyebrow="How it works" title="Profile → Match → Tailor → Apply → Track" body="One profile powers the whole search. Every stage is visible, reversible and yours to approve." />
          </InView>
          <ol className="relative mt-14 grid gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-5">
            {STEPS.map((s, i) => (
                <li key={s.key} className="in-view flex h-full flex-col bg-bg p-6">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] text-subtle">0{i + 1}</span>
                    <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-accent">{s.key}</span>
                  </div>
                  <h3 className="mt-8 text-[15px] font-semibold tracking-tight">{s.title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-muted">{s.body}</p>
                </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* AI + Human */}
      <section className="border-t border-line py-24 md:py-32">
        <Container>
          <InView>
            <SectionHeading eyebrow="AI + human" title="AI does the volume. People do the judgment." body="Models are great at reading ten thousand listings. They shouldn't be the last word on your career." />
          </InView>
          <div className="mt-14 grid gap-4 lg:grid-cols-2">
            {[
              { icon: Sparkles, who: "AI", tone: "text-accent", items: ["Discovers roles across job boards and ATS feeds", "Normalizes, de-duplicates and enriches every listing", "Scores fit, eligibility and sponsorship likelihood", "Drafts tailored bullets and a role-specific cover letter"] },
              { icon: UserCheck, who: "Humans", tone: "text-success", items: ["You accept or reject every suggested change", "A specialist verifies eligibility and accuracy", "Applications are submitted through the right channel", "You decide what happens after each reply"] },
            ].map((col, i) => (
              <InView key={col.who} delay={i * 0.08} className="rounded-xl border border-line bg-surface p-6 md:p-8">
                <div className="flex items-center gap-2.5">
                  <col.icon className={`size-4 ${col.tone}`} aria-hidden />
                  <p className="text-sm font-semibold">{col.who}</p>
                </div>
                <ul className="mt-6 space-y-3.5">
                  {col.items.map((t) => (
                    <li key={t} className="flex gap-3 text-sm text-muted">
                      <Check className={`mt-0.5 size-4 shrink-0 ${col.tone}`} aria-hidden />
                      {t}
                    </li>
                  ))}
                </ul>
              </InView>
            ))}
          </div>
          <InView className="mt-4 overflow-x-auto rounded-xl border border-line bg-surface px-6 py-5 no-scrollbar">
            <ol className="flex min-w-[640px] items-center justify-between" aria-label="Application pipeline">
              {["AI discovered", "AI matched", "AI tailored", "Human reviewed", "Applied"].map((s, i, arr) => (
                <li key={s} className="flex flex-1 items-center last:flex-none">
                  <span className="flex items-center gap-2 text-[13px]">
                    <span className={`grid size-5 place-items-center rounded-full border text-[10px] font-semibold ${i < 3 ? "border-accent-line bg-accent-soft text-[#8FB3FF]" : "border-success/30 bg-success-soft text-success"}`}>{i + 1}</span>
                    <span className="whitespace-nowrap text-fg">{s}</span>
                  </span>
                  {i < arr.length - 1 && <span className="mx-4 h-px flex-1 bg-line-strong" aria-hidden />}
                </li>
              ))}
            </ol>
          </InView>
        </Container>
      </section>

      {/* Matching */}
      <section id="matching" className="scroll-mt-20 border-t border-line py-24 md:py-32">
        <Container className="grid items-start gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
          <InView>
            <SectionHeading eyebrow="Matching engine" title="Every score comes with its reasons." body="No black-box percentages. Each match is a weighted blend of six factors, and every factor tells you why — so you can decide fast and fix gaps deliberately." />
            <dl className="mt-10 grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-3">
              {Object.entries(FACTOR_WEIGHTS).map(([k, w]) => (
                <div key={k} className="border-l border-line-strong pl-3">
                  <dt className="text-[13px] capitalize text-muted">{k}</dt>
                  <dd className="mt-0.5 text-lg font-semibold tabular">{Math.round(w * 100)}%</dd>
                </div>
              ))}
            </dl>
          </InView>
          <InView delay={0.1} className="rounded-xl border border-line-strong bg-surface shadow-[0_30px_80px_-30px_rgb(0_0_0/0.7)]">
            <div className="flex items-center gap-3 border-b border-line p-5">
              <CompanyMark name="Helix Payments" color="#6E8BFF" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">Senior Full-Stack Engineer, Payouts</p>
                <p className="text-xs text-subtle">Helix Payments · Amsterdam · Hybrid · €85k–€110k</p>
              </div>
              <ScoreRing score={92} size={48} />
            </div>
            <div className="p-5">
              <FactorBreakdown factors={SAMPLE_FACTORS} />
            </div>
          </InView>
        </Container>
      </section>

      {/* International */}
      <section id="international" className="scroll-mt-20 border-t border-line py-24 md:py-32">
        <Container className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <InView className="order-2 lg:order-1">
            <div className="rounded-xl border border-line bg-surface">
              <div className="flex items-center justify-between border-b border-line px-5 py-4">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <Globe2 className="size-4 text-muted" aria-hidden /> Your eligibility map
                </p>
                <span className="text-xs text-subtle">Senior Full-Stack · needs sponsorship</span>
              </div>
              <ul className="divide-y divide-line">
                {COUNTRIES.map((c) => (
                  <li key={c.name} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-5 py-3.5">
                    <div>
                      <p className="text-sm text-fg">{c.name}</p>
                      <p className="text-xs text-subtle">{c.roles} eligible roles this week</p>
                    </div>
                    <Badge tone={c.tone} dot>
                      {c.status}
                    </Badge>
                    <div className="col-span-2 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                      <div className={`h-full rounded-full ${c.tone === "success" ? "bg-success" : c.tone === "warning" ? "bg-warning" : "bg-danger"}`} style={{ width: `${c.share}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </InView>
          <InView className="order-1 lg:order-2">
            <SectionHeading
              eyebrow="International by design"
              title="For people whose next job is in another country."
              body="Work authorization is a first-class filter, not a footnote. AutoApply knows where you can work today, where you'd need a visa, and which employers actually sponsor."
            />
            <ul className="mt-8 space-y-3.5">
              {[
                "Authorization and sponsorship needs checked on every role",
                "Employer sponsorship history used when listings are silent",
                "Relocation preferences and remote eligibility by country",
                "Salaries compared across currencies against your floor",
              ].map((t) => (
                <li key={t} className="flex gap-3 text-sm text-muted">
                  <Check className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden /> {t}
                </li>
              ))}
            </ul>
          </InView>
        </Container>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-20 border-t border-line py-24 md:py-32">
        <Container>
          <InView>
            <SectionHeading align="center" eyebrow="Pricing" title="Pay for outcomes, not spam." body="Every plan includes visa-aware matching. Upgrade when you want more tailoring and human review." />
          </InView>
          <div className="mt-12">
            <Suspense fallback={<div className="grid gap-4 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-[440px] rounded-xl" />)}</div>}>
              <Plans />
            </Suspense>
          </div>
        </Container>
      </section>

      {/* Security */}
      <section id="security" className="scroll-mt-20 border-t border-line py-24 md:py-32">
        <Container>
          <InView>
            <SectionHeading eyebrow="Trust & security" title="Your career data, handled like financial data." />
          </InView>
          <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {SECURITY.map((s) => (
              <div key={s.title} className="bg-bg p-6">
                <s.icon className="size-4 text-muted" aria-hidden />
                <h3 className="mt-5 text-sm font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{s.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden border-t border-line">
        <div className="glow-top pointer-events-none absolute inset-0 rotate-180" aria-hidden />
        <Container className="relative py-24 text-center md:py-32">
          <InView>
            <h2 className="mx-auto max-w-2xl text-[32px] font-semibold leading-[1.08] tracking-[-0.035em] sm:text-[44px]">Your next role might be in another country. Start there.</h2>
            <p className="mx-auto mt-4 max-w-md text-muted">Set up your profile in about five minutes. Your first ranked matches appear immediately.</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/signup">
                  Create your profile <ArrowRight aria-hidden />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/login">Try the demo account</Link>
              </Button>
            </div>
          </InView>
        </Container>
      </section>
    </>
  );
}

async function Plans() {
  const plans = await publicPlans();
  return <PricingTable plans={plans} />;
}
