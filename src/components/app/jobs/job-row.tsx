import { Clock, MapPin } from "lucide-react";
import Link from "next/link";
import { EligibilityBadge, FactorChips, StatusBadge } from "@/components/app/match";
import { DismissButton, SaveJobButton } from "@/components/app/job-actions";
import { CompanyMark } from "@/components/ui/marks";
import { ScoreRing } from "@/components/ui/score";
import { countryName } from "@/lib/domain/constants";
import type { FeedItem } from "@/lib/services/jobs";
import { formatSalaryRange, timeAgo } from "@/lib/utils";

const SPONSOR_LABEL = { yes: "Sponsors visas", no: "No sponsorship", unknown: "Sponsorship not stated" } as const;

export function JobRow({ item }: { item: FeedItem }) {
  const { job } = item;
  const where = job.workMode === "remote" ? `Remote${job.remoteCountries.length ? ` · ${job.remoteCountries.map(countryName).slice(0, 2).join(", ")}` : " · Global"}` : job.locations.map((l) => `${l.city}, ${countryName(l.country)}`).join(" / ");

  return (
    <li className="group relative flex gap-4 px-4 py-4 transition-colors hover:bg-surface-2/40 sm:px-5">
      <ScoreRing score={item.score} className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-3">
          <CompanyMark name={job.company.name} color={job.company.brandColor} size="sm" className="hidden sm:inline-grid" />
          <div className="min-w-0 flex-1">
            <Link href={`/jobs/${job.id}`} prefetch className="line-clamp-1 text-sm font-medium text-fg after:absolute after:inset-0 group-hover:text-white">
              {job.title}
            </Link>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-muted">
              <span className="text-fg/80">{job.company.name}</span>
              <span className="flex items-center gap-1">
                <MapPin className="size-3 text-subtle" aria-hidden />
                {where}
              </span>
              {job.workMode !== "remote" && <span className="capitalize text-subtle">{job.workMode}</span>}
              {job.salary && <span className="tabular">{formatSalaryRange(job.salary)}</span>}
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <EligibilityBadge eligibility={item.breakdown.eligibility} />
          <span className="text-xs text-subtle">{SPONSOR_LABEL[job.visaSponsorship]}</span>
          {item.applicationStatus && <StatusBadge status={item.applicationStatus} />}
          <span className="ml-auto hidden items-center gap-1 text-xs text-subtle sm:flex">
            <Clock className="size-3" aria-hidden /> {timeAgo(job.postedAt)}
          </span>
        </div>
        <FactorChips factors={item.breakdown.factors} className="mt-3" />
        {item.breakdown.missingSkills.length > 0 && (
          <p className="mt-2 text-xs text-subtle">
            Missing: <span className="text-warning/90">{item.breakdown.missingSkills.join(", ")}</span>
          </p>
        )}
      </div>
      <div className="relative z-10 flex shrink-0 flex-col gap-1.5 sm:flex-row sm:items-start">
        {!item.applicationStatus && <SaveJobButton jobId={job.id} saved={item.status === "saved"} iconOnly />}
        <DismissButton jobId={job.id} dismissed={item.status === "dismissed"} />
      </div>
    </li>
  );
}
