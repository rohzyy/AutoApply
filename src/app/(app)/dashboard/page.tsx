import { ArrowRight, ArrowUpRight, CalendarClock, CheckCircle2, Circle, FileText, Inbox, Radar, Sparkles, UserCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EligibilityBadge, FactorChips, StatusBadge } from "@/components/app/match";
import { RematchButton, SaveJobButton } from "@/components/app/job-actions";
import { Button } from "@/components/ui/button";
import { Stagger, StaggerItem } from "@/components/ui/reveal";
import { PageHeader, Panel, PanelHeader } from "@/components/ui/panel";
import { ScoreBar, ScoreRing } from "@/components/ui/score";
import { PageSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/states";
import { requireCandidate } from "@/lib/auth/dal";
import { countryName, STAGE_META } from "@/lib/domain/constants";
import type { ApplicationEvent } from "@/lib/domain/types";
import { dashboardData, type DashboardTask } from "@/lib/services/dashboard";
import { cn, formatDate, formatSalaryRange, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  const user = await requireCandidate();
  const d = await dashboardData(user);
  const first = user.fullName.split(" ")[0];
  const nextUp = d.upcoming[0];

  const summary = [
    d.stats.highFit ? `${d.stats.highFit} high-fit ${d.stats.highFit === 1 ? "match" : "matches"} waiting` : "Your matches are up to date",
    nextUp ? `${nextUp.nextStep!.label.toLowerCase()} ${timeAgo(nextUp.nextStep!.at)}` : null,
  ].filter(Boolean);

  return (
    <>
      <PageHeader
        eyebrow="Command center"
        title={user.onboardedAt && Date.now() - new Date(user.onboardedAt).getTime() < 3_600_000 ? `Welcome to AutoApply, ${first}` : `Welcome back, ${first}`}
        description={summary.join(" · ")}
        actions={
          <>
            <RematchButton />
            <Button asChild size="sm">
              <Link href="/jobs">
                <Radar /> Explore matches
              </Link>
            </Button>
          </>
        }
      />

      {/* KPI strip: one panel, hairline dividers — not four floating cards */}
      <Panel className="grid grid-cols-2 gap-px overflow-hidden bg-line lg:grid-cols-4">
        {[
          { label: "New matches", value: d.stats.newMatches, sub: `${d.stats.highFit} scored 85+`, href: "/jobs" },
          { label: "Active applications", value: d.stats.active, sub: `${d.stats.inReview} in human review`, href: "/applications" },
          { label: "Interviews", value: d.stats.interviews, sub: d.stats.offers ? `${d.stats.offers} offer${d.stats.offers > 1 ? "s" : ""} pending` : "Keep going", href: "/applications" },
          { label: "Response rate", value: `${d.stats.responseRate}%`, sub: "of submitted applications", href: "/applications" },
        ].map((k) => (
          <Link key={k.label} href={k.href} className="group bg-surface px-5 py-4 transition-colors hover:bg-surface-2">
            <p className="flex items-center justify-between text-[13px] text-muted">
              {k.label}
              <ArrowUpRight className="size-3.5 text-subtle opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
            </p>
            <p className="mt-2 text-[28px] font-semibold leading-none tracking-[-0.03em] tabular">{k.value}</p>
            <p className="mt-2 text-xs text-subtle">{k.sub}</p>
          </Link>
        ))}
      </Panel>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* Top matches */}
        <Panel>
          <PanelHeader
            title="Top matches for you"
            description="Ranked by fit, eligibility and recency"
            action={
              <Link href="/jobs" className="flex items-center gap-1 text-[13px] text-muted hover:text-fg">
                View all <ArrowRight className="size-3.5" />
              </Link>
            }
          />
          {d.topMatches.length === 0 ? (
            <EmptyState icon={<Radar />} title="No new matches right now" description="We re-rank as new roles arrive. Broaden target countries or roles to see more." action={<Button asChild size="sm" variant="secondary"><Link href="/profile#preferences">Edit preferences</Link></Button>} />
          ) : (
            <Stagger as="ul" className="divide-y divide-line">
              {d.topMatches.map((m) => (
                <StaggerItem as="li" key={m.id} className="group relative flex gap-4 px-5 py-4 transition-colors hover:bg-surface-2/40">
                    <ScoreRing score={m.score} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <Link href={`/jobs/${m.jobId}`} prefetch className="truncate text-sm font-medium text-fg after:absolute after:inset-0 group-hover:text-white">
                          {m.job.title}
                        </Link>
                        <EligibilityBadge eligibility={m.breakdown.eligibility} />
                      </div>
                      <p className="mt-0.5 truncate text-[13px] text-muted">
                        {m.job.company.name} · {m.job.locations.map((l) => `${l.city}, ${countryName(l.country)}`).join(" / ")} · <span className="capitalize">{m.job.workMode}</span>
                        {m.job.salary && <> · {formatSalaryRange(m.job.salary)}</>}
                      </p>
                      <FactorChips factors={m.breakdown.factors} className="mt-2.5" />
                    </div>
                    <div className="relative z-10 hidden shrink-0 self-center sm:block">
                      <SaveJobButton jobId={m.jobId} saved={false} iconOnly />
                    </div>
                </StaggerItem>
              ))}
            </Stagger>
          )}
        </Panel>

        <div className="space-y-6">
          {/* Profile strength */}
          <Panel>
            <div className="flex items-center gap-4 px-5 py-4">
              <ScoreRing score={d.completeness.score} size={52} />
              <div>
                <p className="text-sm font-semibold">Profile strength</p>
                <p className="text-[13px] text-muted">{d.completeness.score === 100 ? "Complete — matching at full accuracy" : `${d.completeness.missing.length} steps to full accuracy`}</p>
              </div>
            </div>
            {d.completeness.missing.length > 0 && (
              <ul className="border-t border-line px-2 py-2">
                {d.completeness.missing.slice(0, 3).map((i) => (
                  <li key={i.key}>
                    <Link href={i.href} className="flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-muted transition-colors hover:bg-surface-2 hover:text-fg">
                      <Circle className="size-3.5 text-subtle" aria-hidden /> {i.label}
                      <span className="ml-auto text-xs text-subtle">+{i.weight}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {/* Up next */}
          <Panel>
            <PanelHeader title="Up next" />
            {d.upcoming.length === 0 ? (
              <EmptyState className="py-8" icon={<CalendarClock />} title="Nothing scheduled" description="Interviews and deadlines you add to applications show up here." />
            ) : (
              <ul className="divide-y divide-line">
                {d.upcoming.map((a) => (
                  <li key={a.id}>
                    <Link href={`/applications?open=${a.id}`} className="flex gap-3 px-5 py-3.5 transition-colors hover:bg-surface-2/40">
                      <div className="w-11 shrink-0 rounded-md border border-line bg-surface-2 py-1 text-center">
                        <p className="text-[10px] uppercase text-subtle">{formatDate(a.nextStep!.at, { month: "short" })}</p>
                        <p className="text-base font-semibold leading-tight tabular">{formatDate(a.nextStep!.at, { day: "numeric" })}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-fg">{a.nextStep!.label}</p>
                        <p className="truncate text-xs text-subtle">
                          {a.job.company.name} · {timeAgo(a.nextStep!.at)}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* Pipeline */}
        <Panel>
          <PanelHeader title="Your pipeline" description="AI discovered → AI matched → AI tailored → Human reviewed → Applied" />
          <div className="space-y-3.5 px-5 py-5">
            {(Object.keys(d.pipeline) as (keyof typeof d.pipeline)[]).map((k, i) => {
              const max = Math.max(1, d.pipeline.discovered);
              const human = k === "reviewed" || k === "applied";
              return (
                <div key={k} className="grid grid-cols-[120px_1fr_40px] items-center gap-4">
                  <span className="flex items-center gap-2 text-[13px] text-muted">
                    {human ? <UserCheck className="size-3.5 text-success" aria-hidden /> : <Sparkles className="size-3.5 text-accent" aria-hidden />}
                    {STAGE_META[k].short}
                  </span>
                  <ScoreBar value={(d.pipeline[k] / max) * 100} tone={human ? "success" : i === 0 ? "neutral" : "accent"} className="h-1.5" />
                  <span className="text-right text-sm font-medium tabular">{d.pipeline[k]}</span>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-px border-t border-line bg-line sm:grid-cols-4">
            {(["preparing", "human_review", "applied", "interview"] as const).map((s) => {
              const apps = d.applications.filter((a) => a.status === s);
              return (
                <Link key={s} href="/applications" className="bg-surface px-5 py-3.5 transition-colors hover:bg-surface-2/60">
                  <StatusBadge status={s} />
                  <p className="mt-2 text-xl font-semibold tabular">{apps.length}</p>
                </Link>
              );
            })}
          </div>
        </Panel>

        {/* Tasks */}
        <Panel>
          <PanelHeader title="Tasks" description="What moves your search forward today" />
          {d.tasks.length === 0 ? (
            <EmptyState className="py-8" icon={<CheckCircle2 />} title="All clear" description="No open tasks. Nice." />
          ) : (
            <ul className="px-2 py-2">
              {d.tasks.map((t) => (
                <TaskRow key={t.id} task={t} />
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* Activity */}
      <Panel className="mt-6">
        <PanelHeader title="Recent activity" description="Everything AI, specialists and you did on your applications" />
        {d.activity.length === 0 ? (
          <EmptyState icon={<Inbox />} title="No activity yet" description="Save or tailor a job to start your pipeline." />
        ) : (
          <ol className="px-5 py-4">
            {d.activity.map((e, i) => (
              <ActivityRow key={e.id} event={e} last={i === d.activity.length - 1} />
            ))}
          </ol>
        )}
      </Panel>
    </>
  );
}

function TaskRow({ task }: { task: DashboardTask }) {
  const tone = task.kind === "offer" ? "text-success" : task.kind === "interview" ? "text-accent" : "text-subtle";
  return (
    <li>
      <Link href={task.href} className="group flex items-start gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-surface-2">
        <Circle className={cn("mt-0.5 size-3.5 shrink-0", tone)} aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] text-fg">{task.label}</span>
          <span className="block truncate text-xs text-subtle">
            {task.detail}
            {task.due && ` · ${timeAgo(task.due)}`}
          </span>
        </span>
        <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-subtle opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
      </Link>
    </li>
  );
}

const ACTOR_STYLE: Record<ApplicationEvent["actor"], { icon: React.ComponentType<{ className?: string }>; cls: string; label: string }> = {
  ai: { icon: Sparkles, cls: "text-accent", label: "AI" },
  reviewer: { icon: UserCheck, cls: "text-success", label: "Specialist" },
  candidate: { icon: FileText, cls: "text-muted", label: "You" },
  system: { icon: Circle, cls: "text-subtle", label: "System" },
};

function ActivityRow({ event, last }: { event: ApplicationEvent & { jobTitle: string; companyName: string }; last: boolean }) {
  const a = ACTOR_STYLE[event.actor];
  return (
    <li className="relative flex gap-3 pb-4 last:pb-0">
      {!last && <span className="absolute left-[11px] top-6 h-[calc(100%-16px)] w-px bg-line" aria-hidden />}
      <span className="grid size-6 shrink-0 place-items-center rounded-full border border-line bg-surface-2">
        <a.icon className={cn("size-3", a.cls)} aria-hidden />
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-[13px] text-fg">
          <span className="text-subtle">{a.label} · </span>
          {event.message}
        </p>
        <p className="mt-0.5 truncate text-xs text-subtle">
          {event.jobTitle} at {event.companyName} · {timeAgo(event.createdAt)}
        </p>
      </div>
    </li>
  );
}
