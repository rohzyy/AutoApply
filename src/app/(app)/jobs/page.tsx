import { Radar, SearchX } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { RematchButton } from "@/components/app/job-actions";
import { JobFiltersShell } from "@/components/app/jobs/job-filters";
import { JobRow } from "@/components/app/jobs/job-row";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, PanelHeader } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/states";
import { requireCandidate } from "@/lib/auth/dal";
import { countryName } from "@/lib/domain/constants";
import { jobFeed, parseJobFilters, type FeedItem } from "@/lib/services/jobs";
import Link from "next/link";

export const metadata: Metadata = { title: "Job intelligence" };

export default function JobsPage({ searchParams }: PageProps<"/jobs">) {
  return (
    <>
      <PageHeader eyebrow="Job intelligence" title="Matched for you" description="Every role is scored on skills, experience, eligibility, location, sponsorship and your preferences." actions={<RematchButton />} />
      <Suspense fallback={<JobsSkeleton />}>
        <Jobs searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Jobs({ searchParams }: { searchParams: PageProps<"/jobs">["searchParams"] }) {
  const user = await requireCandidate();
  const filters = parseJobFilters(await searchParams);
  const feed = await jobFeed(user, filters);

  return (
    <JobFiltersShell initial={filters} countries={feed.countries}>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Panel>
          <div className="flex items-center justify-between border-b border-line px-5 py-3 text-[13px] text-muted">
            <span>
              <span className="font-medium tabular text-fg">{feed.items.length}</span> of {feed.total} roles
            </span>
            <span className="hidden text-xs text-subtle sm:inline">Sorted by {filters.sort === "fit" ? "best fit" : filters.sort === "recent" ? "most recent" : "highest salary"}</span>
          </div>
          {feed.items.length === 0 ? (
            filters.view === "dismissed" ? (
              <EmptyState icon={<Radar />} title="Nothing hidden" description="Roles you mark as not interested will appear here so you can restore them." />
            ) : feed.total === 0 ? (
              <EmptyState icon={<Radar />} title="No matches yet" description="Finish your profile — skills, work authorization and target countries — and we'll rank roles for you." action={<Button asChild size="sm"><Link href="/profile">Complete profile</Link></Button>} />
            ) : (
              <EmptyState icon={<SearchX />} title="No roles match these filters" description="Try widening the country, eligibility or minimum fit filters." />
            )
          ) : (
            <ul className="divide-y divide-line">
              {feed.items.map((item) => (
                <JobRow key={item.id} item={item} />
              ))}
            </ul>
          )}
        </Panel>
        <Insights items={feed.items} />
      </div>
    </JobFiltersShell>
  );
}

function Insights({ items }: { items: FeedItem[] }) {
  const buckets = [
    { label: "85+", min: 85, max: 101, cls: "bg-accent" },
    { label: "70–84", min: 70, max: 85, cls: "bg-accent/70" },
    { label: "55–69", min: 55, max: 70, cls: "bg-accent/45" },
    { label: "<55", min: 0, max: 55, cls: "bg-accent/25" },
  ].map((b) => ({ ...b, count: items.filter((i) => i.score >= b.min && i.score < b.max).length }));
  const maxCount = Math.max(1, ...buckets.map((b) => b.count));

  const gaps = new Map<string, number>();
  items.filter((i) => i.score >= 55).forEach((i) => i.breakdown.missingSkills.forEach((s) => gaps.set(s, (gaps.get(s) ?? 0) + 1)));
  const topGaps = [...gaps.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const elig = { eligible: 0, needs_sponsorship: 0, ineligible: 0 };
  items.forEach((i) => elig[i.breakdown.eligibility]++);

  const countries = new Map<string, number>();
  items.forEach((i) => i.job.locations.forEach((l) => countries.set(l.country, (countries.get(l.country) ?? 0) + 1)));

  return (
    <aside className="space-y-6" aria-label="Insights">
      <Panel>
        <PanelHeader title="Fit distribution" />
        <div className="flex h-36 items-end gap-3 px-5 pb-4 pt-5">
          {buckets.map((b) => (
            <div key={b.label} className="flex flex-1 flex-col items-center gap-2">
              <span className="text-xs font-medium tabular text-fg">{b.count}</span>
              <div className="flex h-20 w-full items-end">
                <div className={`w-full rounded-t-[4px] ${b.cls}`} style={{ height: `${Math.max(4, (b.count / maxCount) * 100)}%` }} />
              </div>
              <span className="text-[11px] text-subtle">{b.label}</span>
            </div>
          ))}
        </div>
      </Panel>
      <Panel>
        <PanelHeader title="Eligibility mix" />
        <dl className="space-y-2.5 px-5 py-4 text-[13px]">
          {[
            ["No visa needed", elig.eligible, "bg-success"],
            ["Via sponsorship", elig.needs_sponsorship, "bg-warning"],
            ["Not eligible", elig.ineligible, "bg-danger"],
          ].map(([label, n, cls]) => (
            <div key={label as string} className="flex items-center gap-2.5">
              <span className={`size-1.5 rounded-full ${cls}`} aria-hidden />
              <dt className="flex-1 text-muted">{label}</dt>
              <dd className="font-medium tabular">{n}</dd>
            </div>
          ))}
        </dl>
      </Panel>
      <Panel>
        <PanelHeader title="Skill gaps across matches" description="Most requested skills you haven't listed" />
        {topGaps.length === 0 ? (
          <p className="px-5 py-4 text-[13px] text-muted">No recurring gaps — your skills cover these roles well.</p>
        ) : (
          <ul className="space-y-2 px-5 py-4">
            {topGaps.map(([skill, n]) => (
              <li key={skill} className="flex items-center justify-between text-[13px]">
                <span className="text-fg">{skill}</span>
                <span className="text-xs text-subtle">{n} role{n > 1 ? "s" : ""}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      {countries.size > 0 && (
        <Panel>
          <PanelHeader title="Where the roles are" />
          <ul className="space-y-2 px-5 py-4">
            {[...countries.entries()]
              .sort((a, b) => b[1] - a[1])
              .slice(0, 6)
              .map(([c, n]) => (
                <li key={c} className="flex items-center justify-between text-[13px]">
                  <span className="text-muted">{countryName(c)}</span>
                  <span className="tabular text-fg">{n}</span>
                </li>
              ))}
          </ul>
        </Panel>
      )}
    </aside>
  );
}

function JobsSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading jobs">
      <Skeleton className="h-10 w-full" />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
        <div className="hidden space-y-4 xl:block">
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-36 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
