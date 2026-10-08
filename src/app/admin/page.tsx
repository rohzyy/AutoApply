import { AlertTriangle, ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CategoryBars, DailyBars } from "@/components/admin/charts";
import { Badge } from "@/components/ui/badge";
import { CompanyMark } from "@/components/ui/marks";
import { PageHeader, Panel, PanelHeader } from "@/components/ui/panel";
import { PageSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/states";
import { requireStaff } from "@/lib/auth/dal";
import { REVIEW_STATUS_META, STATUS_META } from "@/lib/domain/constants";
import { APPLICATION_STATUSES } from "@/lib/domain/types";
import { overview } from "@/lib/services/admin";
import { cn, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Operations" };

export default function AdminOverviewPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Overview />
    </Suspense>
  );
}

async function Overview() {
  const user = await requireStaff();
  const { stats, reviews, runs, failedJobs, now } = await overview();

  const kpis = [
    { label: "Candidates", value: stats.candidates, href: "/admin/candidates" },
    { label: "Active jobs", value: stats.activeJobs, href: "/admin/jobs" },
    { label: "Applications", value: stats.applications, href: "/admin/jobs?tab=applications" },
    { label: "Review queue", value: stats.reviewQueue, href: "/admin/reviews", alert: stats.reviewsOverdue ? `${stats.reviewsOverdue} past SLA` : null },
    { label: "Failed jobs", value: stats.failedJobs, href: "/admin/pipeline", alert: stats.failedJobs ? "Needs attention" : null },
  ];

  return (
    <>
      <PageHeader eyebrow="Operations console" title="Overview" description={`Signed in as ${user.fullName} · ${user.role === "admin" ? "Administrator" : "Reviewer"}`} />

      <Panel className="grid grid-cols-2 gap-px overflow-hidden bg-line md:grid-cols-5">
        {kpis.map((k) => (
          <Link key={k.label} href={k.href} className="bg-surface px-5 py-4 transition-colors last:col-span-2 hover:bg-surface-2 md:last:col-span-1">
            <p className="text-[13px] text-muted">{k.label}</p>
            <p className="mt-2 text-[28px] font-semibold leading-none tracking-[-0.03em] tabular">{k.value}</p>
            <p className={cn("mt-2 flex items-center gap-1 text-xs", k.alert ? "text-warning" : "text-subtle")}>
              {k.alert ? (
                <>
                  <AlertTriangle className="size-3" /> {k.alert}
                </>
              ) : (
                "Healthy"
              )}
            </p>
          </Link>
        ))}
      </Panel>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel>
          <PanelHeader title="Applications started" />
          <div className="p-5">
            <DailyBars data={stats.applicationsPerDay} label="applications" />
          </div>
        </Panel>
        <Panel>
          <PanelHeader title="Matches generated" />
          <div className="p-5">
            <DailyBars data={stats.matchesPerDay} label="matches" />
          </div>
        </Panel>
        <Panel>
          <PanelHeader title="Applications by status" />
          <div className="p-5">
            <CategoryBars data={APPLICATION_STATUSES.map((s) => ({ label: STATUS_META[s].label, value: stats.applicationsByStatus[s] }))} />
          </div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Panel>
          <PanelHeader
            title="Review queue"
            description="Highest priority and nearest SLA first"
            action={
              <Link href="/admin/reviews" className="flex items-center gap-1 text-[13px] text-muted hover:text-fg">
                Open queue <ArrowRight className="size-3.5" />
              </Link>
            }
          />
          {reviews.length === 0 ? (
            <EmptyState icon={<CheckCircle2 />} title="Queue is clear" description="New review requests will appear here." />
          ) : (
            <ul className="divide-y divide-line">
              {reviews.map((r) => {
                const overdue = r.slaDueAt < now;
                return (
                  <li key={r.id}>
                    <Link href={`/admin/reviews/${r.id}`} className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-surface-2/40">
                      <CompanyMark name={r.application.job.company.name} color={r.application.job.company.brandColor} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium">
                          {r.candidate.fullName} <span className="font-normal text-muted">→ {r.application.job.title}</span>
                        </p>
                        <p className="truncate text-xs text-subtle">
                          {r.application.job.company.name} · {r.reviewerName ? `Claimed by ${r.reviewerName}` : "Unassigned"}
                        </p>
                      </div>
                      {r.priority === "high" && <Badge tone="accent">High</Badge>}
                      <Badge tone={REVIEW_STATUS_META[r.status].tone}>{REVIEW_STATUS_META[r.status].label}</Badge>
                      <span className={cn("hidden w-24 text-right text-xs sm:block", overdue ? "text-danger" : "text-subtle")}>{overdue ? `Overdue ${timeAgo(r.slaDueAt)}` : `Due ${timeAgo(r.slaDueAt)}`}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <div className="space-y-6">
          <Panel>
            <PanelHeader title="Recent ingestion" action={<Link href="/admin/pipeline" className="text-[13px] text-muted hover:text-fg">Pipeline</Link>} />
            <ul className="divide-y divide-line">
              {runs.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-5 py-3 text-[13px]">
                  {r.status === "succeeded" ? <CheckCircle2 className="size-4 text-success" /> : r.status === "failed" ? <XCircle className="size-4 text-danger" /> : <span className="size-4 animate-pulse rounded-full bg-accent/40" />}
                  <span className="w-20 capitalize text-fg">{r.source}</span>
                  <span className="flex-1 truncate text-xs text-subtle">{r.status === "failed" ? r.error : `${r.inserted} new · ${r.duplicates} dupes · ${r.fetched} fetched`}</span>
                  <span className="text-xs text-subtle">{timeAgo(r.startedAt)}</span>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel>
            <PanelHeader title="Failed background jobs" />
            {failedJobs.length === 0 ? (
              <p className="px-5 py-5 text-[13px] text-muted">No failures in the queue.</p>
            ) : (
              <ul className="divide-y divide-line">
                {failedJobs.map((j) => (
                  <li key={j.id} className="px-5 py-3">
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="font-mono text-xs text-fg">{j.type}</span>
                      <Badge tone={j.status === "dead" ? "danger" : "warning"}>{j.status === "dead" ? "Dead-lettered" : `Retry ${j.attempts}/${j.maxAttempts}`}</Badge>
                    </div>
                    <p className="mt-1 truncate text-xs text-subtle">{j.lastError}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
