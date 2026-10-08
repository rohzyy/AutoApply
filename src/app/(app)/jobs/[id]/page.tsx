import { ArrowLeft, ArrowUpRight, Building2, Check, Clock, ExternalLink, Globe, MapPin, Minus, Plane, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EligibilityBadge, FactorBreakdown, PipelineStepper, StatusBadge } from "@/components/app/match";
import { SaveJobButton, TailorButton } from "@/components/app/job-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CompanyMark } from "@/components/ui/marks";
import { Panel, PanelHeader, SectionLabel } from "@/components/ui/panel";
import { ScoreRing, scoreTone } from "@/components/ui/score";
import { PageSkeleton } from "@/components/ui/skeleton";
import { requireCandidate } from "@/lib/auth/dal";
import { AUTH_STATUS_LABEL, countryName, SENIORITY_LABEL } from "@/lib/domain/constants";
import { AppError } from "@/lib/infra/errors";
import { jobDetail } from "@/lib/services/jobs";
import { formatSalaryRange, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Job detail" };

export default function JobPage({ params }: PageProps<"/jobs/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton rows={3} />}>
      <JobDetail params={params} />
    </Suspense>
  );
}

const SPONSOR = {
  yes: { label: "Offers visa sponsorship", tone: "success" as const },
  no: { label: "Does not sponsor", tone: "danger" as const },
  unknown: { label: "Not stated in listing", tone: "neutral" as const },
};
const HISTORY = { frequent: "Sponsors frequently", occasional: "Sponsors occasionally", none: "No sponsorship history", unknown: "History unknown" };

async function JobDetail({ params }: { params: PageProps<"/jobs/[id]">["params"] }) {
  const user = await requireCandidate();
  const { id } = await params;
  let data;
  try {
    data = await jobDetail(user, id);
  } catch (err) {
    if (err instanceof AppError && err.code === "not_found") notFound();
    throw err;
  }
  const { job, match, application, document, similar, profile } = data;
  const stage = application?.stage ?? (match ? "matched" : "discovered");
  const tone = match ? scoreTone(match.score) : null;

  return (
    <>
      <Link href="/jobs" className="mb-5 inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-fg">
        <ArrowLeft className="size-3.5" /> Back to matches
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-5 border-b border-line pb-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 gap-4">
          <CompanyMark name={job.company.name} color={job.company.brandColor} size="lg" />
          <div className="min-w-0">
            <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.02em] md:text-[26px]">{job.title}</h1>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
              <span className="flex items-center gap-1.5 text-fg/85">
                <Building2 className="size-3.5 text-subtle" /> {job.company.name}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="size-3.5 text-subtle" /> {job.locations.map((l) => `${l.city}, ${countryName(l.country)}`).join(" / ")}
              </span>
              <span className="capitalize">{job.workMode}</span>
              {job.salary && (
                <span className="flex items-center gap-1.5 tabular">
                  <Wallet className="size-3.5 text-subtle" /> {formatSalaryRange(job.salary)}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Clock className="size-3.5 text-subtle" /> Posted {timeAgo(job.postedAt)}
              </span>
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {match && <EligibilityBadge eligibility={match.breakdown.eligibility} />}
              <Badge>{SENIORITY_LABEL[job.seniority]}</Badge>
              <Badge>{job.department}</Badge>
              {application && <StatusBadge status={application.status} />}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {!application && <SaveJobButton jobId={job.id} saved={match?.status === "saved"} size="md" />}
          {application && !["preparing", "saved"].includes(application.status) ? (
            <Button asChild variant="secondary">
              <Link href={`/applications?open=${application.id}`}>
                View application <ArrowUpRight />
              </Link>
            </Button>
          ) : (
            <TailorButton jobId={job.id} hasDocument={!!document} size="md" />
          )}
        </div>
      </div>

      <Panel className="mt-6 overflow-x-auto px-5 py-4 no-scrollbar">
        <PipelineStepper stage={stage} className="min-w-[620px]" />
      </Panel>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          {match && (
            <Panel>
              <div className="flex flex-col gap-5 border-b border-line p-5 sm:flex-row sm:items-center">
                <ScoreRing score={match.score} size={72} />
                <div className="min-w-0">
                  <SectionLabel>Why it matches</SectionLabel>
                  <p className="mt-1 text-[15px] font-medium">
                    <span className={tone!.text}>{tone!.label}</span> <span className="text-muted">— {match.breakdown.summary}</span>
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-subtle">Model {match.breakdown.modelVersion}</p>
                </div>
              </div>
              <div className="p-5">
                <FactorBreakdown factors={match.breakdown.factors} />
              </div>
            </Panel>
          )}

          {match && (
            <Panel>
              <PanelHeader title="Fit analysis" description="How your skills line up with the listing" />
              <div className="grid gap-px bg-line sm:grid-cols-3">
                {[
                  { title: "Matched", items: match.breakdown.matchedSkills, icon: Check, cls: "text-success", empty: "None yet" },
                  { title: "Transferable", items: match.breakdown.transferableSkills, icon: ArrowUpRight, cls: "text-accent", empty: "—" },
                  { title: "Missing", items: match.breakdown.missingSkills, icon: Minus, cls: "text-warning", empty: "Nothing missing" },
                ].map((col) => (
                  <div key={col.title} className="bg-surface p-5">
                    <p className="text-[13px] font-medium">
                      {col.title} <span className="text-subtle">· {col.items.length}</span>
                    </p>
                    {col.items.length ? (
                      <ul className="mt-3 space-y-1.5">
                        {col.items.map((s) => (
                          <li key={s} className="flex items-center gap-2 text-[13px] text-muted">
                            <col.icon className={`size-3.5 ${col.cls}`} aria-hidden /> {s}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-[13px] text-subtle">{col.empty}</p>
                    )}
                  </div>
                ))}
              </div>
              {match.breakdown.missingSkills.length > 0 && (
                <p className="border-t border-line px-5 py-3.5 text-[13px] text-muted">
                  Tailoring will suggest how to address{" "}
                  <span className="text-fg">{match.breakdown.missingSkills.join(", ")}</span> — through adjacent work, projects, or a candid note in your cover letter.
                </p>
              )}
            </Panel>
          )}

          <Panel>
            <PanelHeader title="About the role" />
            <div className="space-y-6 p-5 text-sm leading-relaxed text-muted">
              <p className="text-fg/90">{job.description}</p>
              {job.responsibilities.length > 0 && (
                <div>
                  <h3 className="mb-2.5 text-[13px] font-semibold text-fg">What you&apos;ll do</h3>
                  <ul className="space-y-2">
                    {job.responsibilities.map((r) => (
                      <li key={r} className="flex gap-2.5">
                        <span className="mt-2 size-1 shrink-0 rounded-full bg-subtle" aria-hidden />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <h3 className="mb-2.5 text-[13px] font-semibold text-fg">Requirements</h3>
                <ul className="space-y-2">
                  {job.requirements.map((r) => (
                    <li key={r} className="flex gap-2.5">
                      <span className="mt-2 size-1 shrink-0 rounded-full bg-subtle" aria-hidden />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
              {job.niceToHaveSkills.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[13px] text-subtle">Nice to have:</span>
                  {job.niceToHaveSkills.map((s) => (
                    <Badge key={s}>{s}</Badge>
                  ))}
                </div>
              )}
              <a href={job.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-fg">
                View original listing on {job.source} <ExternalLink className="size-3.5" />
              </a>
            </div>
          </Panel>
        </div>

        <aside className="space-y-6">
          <Panel>
            <PanelHeader title="Eligibility & sponsorship" />
            <dl className="divide-y divide-line text-[13px]">
              <div className="flex items-center justify-between gap-3 px-5 py-3">
                <dt className="text-muted">Listing</dt>
                <dd>
                  <Badge tone={SPONSOR[job.visaSponsorship].tone}>{SPONSOR[job.visaSponsorship].label}</Badge>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 px-5 py-3">
                <dt className="text-muted">Company history</dt>
                <dd className="text-fg">{HISTORY[job.company.sponsorshipHistory]}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 px-5 py-3">
                <dt className="text-muted">Work location</dt>
                <dd className="text-right text-fg">{job.workMode === "remote" ? (job.remoteCountries.length ? `Remote in ${job.remoteCountries.map(countryName).join(", ")}` : "Remote, global") : countryName(job.locations[0]!.country)}</dd>
              </div>
              <div className="px-5 py-3">
                <dt className="text-muted">Your authorization</dt>
                <dd className="mt-1.5 flex flex-wrap gap-1.5">
                  {profile?.workAuthorizations.length ? (
                    profile.workAuthorizations.map((a) => (
                      <Badge key={a.country}>
                        {countryName(a.country)} · {AUTH_STATUS_LABEL[a.status]}
                      </Badge>
                    ))
                  ) : (
                    <Link href="/profile#eligibility" className="text-accent hover:underline">
                      Add work authorization
                    </Link>
                  )}
                </dd>
              </div>
              {profile?.willingToRelocate && (
                <div className="flex items-center gap-2 px-5 py-3 text-muted">
                  <Plane className="size-3.5 text-subtle" /> You&apos;re open to relocating
                </div>
              )}
            </dl>
          </Panel>

          <Panel>
            <PanelHeader title={job.company.name} description={`${job.company.industry} · ${job.company.size} employees`} />
            <div className="space-y-3 px-5 py-4 text-[13px] text-muted">
              <p className="leading-relaxed">{job.company.description}</p>
              <p className="flex items-center gap-2">
                <MapPin className="size-3.5 text-subtle" /> HQ {job.company.headquarters.city}, {countryName(job.company.headquarters.country)}
              </p>
              <a href={job.company.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-fg">
                <Globe className="size-3.5 text-subtle" /> {job.company.domain}
              </a>
            </div>
          </Panel>

          {similar.length > 0 && (
            <Panel>
              <PanelHeader title="Similar roles" />
              <ul className="divide-y divide-line">
                {similar.map((s) => (
                  <li key={s.id}>
                    <Link href={`/jobs/${s.jobId}`} prefetch className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-2/40">
                      <ScoreRing score={s.score} size={34} />
                      <div className="min-w-0">
                        <p className="truncate text-[13px] text-fg">{s.job.title}</p>
                        <p className="truncate text-xs text-subtle">{s.job.company.name}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </aside>
      </div>
    </>
  );
}
