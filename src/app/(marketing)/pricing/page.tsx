import type { Metadata } from "next";
import { Suspense } from "react";
import { PricingTable } from "@/components/marketing/pricing-table";
import { SectionLabel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";
import type { Plan } from "@/lib/domain/types";
import { publicPlans } from "@/lib/services/public";

export const metadata: Metadata = { title: "Pricing", description: "Entry, Professional and Executive plans for visa-aware, human-reviewed job search." };

const FAQ = [
  ["What counts as a tailored application?", "Each time AutoApply generates a role-specific resume revision and cover letter for a job. Regenerating for the same job creates a new version and counts once more."],
  ["What does human review include?", "A specialist checks work authorization and sponsorship against the listing, verifies the tailored resume is accurate, reviews the cover letter, then submits through the employer's channel."],
  ["Do you guarantee visa sponsorship?", "No. We use listing language and employers' sponsorship history to estimate likelihood and show our reasoning. The employer makes the final decision."],
  ["Can I change or cancel my plan?", "Yes, anytime from Settings. Upgrades apply immediately; cancellations take effect at the end of the billing period."],
];

const ROWS: { label: string; get: (p: Plan) => string }[] = [
  { label: "AI-ranked matches", get: (p) => (p.limits.matchesPerWeek === null ? "Unlimited" : `${p.limits.matchesPerWeek} / week`) },
  { label: "Tailored applications", get: (p) => (p.limits.tailoredPerMonth === null ? "Unlimited" : `${p.limits.tailoredPerMonth} / month`) },
  { label: "Human-reviewed applications", get: (p) => (p.limits.humanReviewsPerMonth === null ? "Unlimited" : p.limits.humanReviewsPerMonth === 0 ? "—" : `${p.limits.humanReviewsPerMonth} / month`) },
  { label: "Eligibility & sponsorship screening", get: () => "Included" },
  { label: "Application tracker", get: () => "Included" },
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 md:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <SectionLabel>Pricing</SectionLabel>
        <h1 className="mt-3 text-[36px] font-semibold leading-[1.05] tracking-[-0.035em] sm:text-[48px]">Simple plans for a serious search.</h1>
        <p className="mt-4 text-muted">Every plan includes visa-aware matching and the application tracker. Pricing is set by our operations team and always shown here first.</p>
      </div>
      <div className="mt-14">
        <Suspense fallback={<div className="grid gap-4 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-[440px] rounded-xl" />)}</div>}>
          <PlansAndComparison />
        </Suspense>
      </div>
      <div className="mx-auto mt-24 max-w-3xl">
        <h2 className="text-xl font-semibold tracking-tight">Questions</h2>
        <div className="mt-6 divide-y divide-line border-y border-line">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group py-5">
              <summary className="flex list-none items-center justify-between gap-4 text-sm font-medium text-fg [&::-webkit-details-marker]:hidden">
                <span>{q}</span>
                <span className="text-subtle transition-transform group-open:rotate-45" aria-hidden>
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}

async function PlansAndComparison() {
  const plans = await publicPlans();
  return (
    <>
      <PricingTable plans={plans} />
      <div className="mt-20 overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[640px] text-left text-sm">
          <caption className="sr-only">Plan comparison</caption>
          <thead>
            <tr className="border-b border-line bg-surface">
              <th scope="col" className="px-5 py-4 font-medium text-muted">
                Compare plans
              </th>
              {plans.map((p) => (
                <th key={p.id} scope="col" className="px-5 py-4 font-semibold">
                  {p.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {ROWS.map((r) => (
              <tr key={r.label}>
                <th scope="row" className="px-5 py-3.5 font-normal text-muted">
                  {r.label}
                </th>
                {plans.map((p) => (
                  <td key={p.id} className="px-5 py-3.5 tabular text-fg">
                    {r.get(p)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
