import { ArrowLeft, Check, FileText, Sparkles, UserCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ReviewControls } from "@/components/admin/review-actions";
import { EligibilityBadge, FactorBreakdown, PipelineStepper, StatusBadge } from "@/components/app/match";
import { Badge } from "@/components/ui/badge";
import { CompanyMark } from "@/components/ui/marks";
import { Panel, PanelHeader, SectionLabel } from "@/components/ui/panel";
import { ScoreRing } from "@/components/ui/score";
import { PageSkeleton } from "@/components/ui/skeleton";
import { requireStaff } from "@/lib/auth/dal";
import { AUTH_STATUS_LABEL, countryName, REVIEW_STATUS_META, SENIORITY_LABEL } from "@/lib/domain/constants";
import { AppError } from "@/lib/infra/errors";
import { reviewDetail } from "@/lib/services/reviews";
import { cn, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Review" };

export default function ReviewPage({ params }: PageProps<"/admin/reviews/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton rows={3} />}>
      <Review params={params} />
    </Suspense>
  );
}

async function Review({ params }: { params: PageProps<"/admin/reviews/[id]">["params"] }) {
  const staff = await requireStaff();
  const { id } = await params;
  let data;
  try {
    data = await reviewDetail(id);
  } catch (err) {
    if (err instanceof AppError && err.code === "not_found") notFound();
    throw err;
  }
  const { review, profile, events, document, match } = data;
  const app = review.application;
  const job = app.job;

  return (
    <>
      <Link href="/admin/reviews" className="mb-5 inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-fg">
        <ArrowLeft className="size-3.5" /> Review queue
      </Link>
      <div className="flex flex-col gap-4 border-b border-line pb-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <CompanyMark name={job.company.name} color={job.company.brandColor} size="lg" />
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-subtle">Review for {review.candidate.fullName}</p>
            <h1 className="mt-1 text-[22px] font-semibold tracking-[-0.02em]">{job.title}</h1>
            <p className="text-[13px] text-muted">
              {job.company.name} · {job.locations.map((l) => `${l.city}, ${countryName(l.country)}`).join(" / ")} · Visa sponsorship: {job.visaSponsorship}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={REVIEW_STATUS_META[review.status].tone}>{REVIEW_STATUS_META[review.status].label}</Badge>
          <StatusBadge status={app.status} />
        </div>
      </div>

      <Panel className="mt-6 overflow-x-auto px-5 py-4 no-scrollbar">
        <PipelineStepper stage={app.stage} className="min-w-[620px]" />
      </Panel>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          {/* Candidate eligibility */}
          {profile && (
            <Panel>
              <PanelHeader title="Candidate" description={`${profile.headline} · ${SENIORITY_LABEL[profile.seniority]} · ${profile.yearsExperience} yrs · ${profile.location.city}, ${countryName(profile.location.country)}`} />
              <dl className="grid gap-px bg-line sm:grid-cols-3">
                <div className="bg-surface px-5 py-4">
                  <dt className="text-xs text-subtle">Work authorization</dt>
                  <dd className="mt-1.5 flex flex-wrap gap-1.5">
                    {profile.workAuthorizations.length ? profile.workAuthorizations.map((a) => <Badge key={a.country}>{`${countryName(a.country)} · ${AUTH_STATUS_LABEL[a.status]}`}</Badge>) : <span className="text-[13px] text-muted">None listed</span>}
                  </dd>
                </div>
                <div className="bg-surface px-5 py-4">
                  <dt className="text-xs text-subtle">Sponsorship</dt>
                  <dd className="mt-1.5 text-[13px]">{profile.requiresSponsorship ? "Requires sponsorship" : "No sponsorship needed"}</dd>
                </div>
                <div className="bg-surface px-5 py-4">
                  <dt className="text-xs text-subtle">AI eligibility verdict</dt>
                  <dd className="mt-1.5">{match ? <EligibilityBadge eligibility={match.breakdown.eligibility} /> : "—"}</dd>
                </div>
              </dl>
            </Panel>
          )}

          {match && (
            <Panel>
              <div className="flex items-center gap-4 border-b border-line p-5">
                <ScoreRing score={match.score} size={56} />
                <div>
                  <SectionLabel>AI match reasoning</SectionLabel>
                  <p className="mt-1 text-[13px] text-muted">{match.breakdown.summary}</p>
                </div>
              </div>
              <div className="p-5">
                <FactorBreakdown factors={match.breakdown.factors} />
              </div>
            </Panel>
          )}

          {document ? (
            <Panel>
              <PanelHeader title={`Tailored materials · v${document.version}`} description={`${document.status === "approved" ? "Approved by candidate" : "Draft"} · ${document.provider} · ${timeAgo(document.updatedAt)}`} />
              <div className="space-y-5 p-5">
                <div>
                  <SectionLabel>Summary</SectionLabel>
                  <p className="mt-2 text-[13px] leading-relaxed text-fg/90">{document.summary}</p>
                </div>
                <div>
                  <SectionLabel>Resume changes</SectionLabel>
                  <ul className="mt-2 space-y-2">
                    {document.bullets.map((b) => (
                      <li key={b.id} className="rounded-md border border-line px-3 py-2.5 text-[13px]">
                        <p className={cn(b.decision === "accepted" ? "text-fg" : "text-muted")}>{b.decision === "accepted" ? b.suggested : b.original}</p>
                        <p className="mt-1 text-[11px] text-subtle">{b.decision === "accepted" ? "AI rewrite — accepted by candidate" : b.decision === "rejected" ? "Original kept by candidate" : "Pending candidate decision"}</p>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <SectionLabel>Cover letter</SectionLabel>
                  <div className="mt-2 whitespace-pre-line rounded-md border border-line bg-surface-2/50 p-4 text-[13px] leading-[1.75] text-fg/90">{document.coverLetter}</div>
                </div>
              </div>
            </Panel>
          ) : (
            <Panel className="px-5 py-8 text-center text-[13px] text-muted">
              <FileText className="mx-auto mb-2 size-5 text-subtle" /> No tailored document attached.
            </Panel>
          )}
        </div>

        <aside className="space-y-6 xl:sticky xl:top-20 xl:self-start">
          <Panel className="p-5">
            <ReviewControls review={review} viewerId={staff.id} viewerRole={staff.role} applicationId={app.id} applicationStatus={app.status} />
          </Panel>
          <Panel>
            <PanelHeader title="History" />
            <ol className="px-5 py-4">
              {events.slice(0, 10).map((e) => (
                <li key={e.id} className="flex gap-2.5 pb-3 text-[13px] last:pb-0">
                  {e.actor === "ai" ? <Sparkles className="mt-0.5 size-3.5 shrink-0 text-accent" /> : e.actor === "reviewer" ? <UserCheck className="mt-0.5 size-3.5 shrink-0 text-success" /> : <Check className="mt-0.5 size-3.5 shrink-0 text-subtle" />}
                  <span className="min-w-0">
                    <span className="block text-fg/90">{e.message}</span>
                    <span className="text-xs text-subtle">{timeAgo(e.createdAt)}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Panel>
        </aside>
      </div>
    </>
  );
}
