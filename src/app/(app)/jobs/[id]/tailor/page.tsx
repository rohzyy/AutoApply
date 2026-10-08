import { ArrowLeft, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TailorButton } from "@/components/app/job-actions";
import { TailoringWorkspace } from "@/components/app/tailoring/workspace";
import { CompanyMark } from "@/components/ui/marks";
import { Panel } from "@/components/ui/panel";
import { ScoreRing } from "@/components/ui/score";
import { PageSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/states";
import { requireCandidate } from "@/lib/auth/dal";
import { userRepo } from "@/lib/data";
import { countryName } from "@/lib/domain/constants";

export const metadata: Metadata = { title: "Tailor application" };

export default function TailorPage({ params }: PageProps<"/jobs/[id]/tailor">) {
  return (
    <Suspense fallback={<PageSkeleton rows={4} />}>
      <Tailor params={params} />
    </Suspense>
  );
}

async function Tailor({ params }: { params: PageProps<"/jobs/[id]/tailor">["params"] }) {
  const user = await requireCandidate();
  const { id } = await params;
  const repo = await userRepo();
  const [job, doc, app, match] = await Promise.all([repo.getJob(id), repo.getLatestTailored(user.id, id), repo.getApplicationForJob(user.id, id), repo.getMatch(user.id, id)]);
  if (!job) notFound();
  const review = app ? await repo.getReviewForApplication(app.id) : null;

  return (
    <>
      <Link href={`/jobs/${id}`} className="mb-5 inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-fg">
        <ArrowLeft className="size-3.5" /> Back to role
      </Link>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <CompanyMark name={job.company.name} color={job.company.brandColor} size="lg" />
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-accent">
              <Sparkles className="size-3" /> AI tailoring
            </p>
            <h1 className="mt-1 text-[22px] font-semibold tracking-[-0.02em]">{job.title}</h1>
            <p className="text-[13px] text-muted">
              {job.company.name} · {job.locations.map((l) => `${l.city}, ${countryName(l.country)}`).join(" / ")}
            </p>
          </div>
        </div>
        {match && (
          <div className="flex items-center gap-3 text-[13px] text-muted">
            <ScoreRing score={match.score} size={44} /> fit score
          </div>
        )}
      </div>

      {doc ? (
        <TailoringWorkspace key={doc.id} doc={doc} jobId={id} applicationId={app?.id ?? doc.applicationId} applicationStatus={app?.status ?? null} stage={app?.stage ?? "tailored"} review={review} />
      ) : (
        <Panel>
          <EmptyState
            icon={<Sparkles />}
            title="No tailored materials yet"
            description="Generate role-specific resume suggestions, a cover letter and a skill-gap analysis. You'll approve every change before a specialist reviews it."
            action={<TailorButton jobId={id} />}
          />
        </Panel>
      )}
    </>
  );
}
