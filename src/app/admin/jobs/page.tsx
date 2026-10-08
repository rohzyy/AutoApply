import { Briefcase } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SearchBox } from "@/components/admin/admin-controls";
import { StatusBadge } from "@/components/app/match";
import { Badge } from "@/components/ui/badge";
import { CompanyMark } from "@/components/ui/marks";
import { PageHeader, Panel } from "@/components/ui/panel";
import { PageSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/states";
import { requireStaff } from "@/lib/auth/dal";
import { countryName, STAGE_META } from "@/lib/domain/constants";
import { allApplications, jobsCatalog } from "@/lib/services/admin";
import { cn, formatSalaryRange, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Jobs & applications" };

export default function AdminJobsPage({ searchParams }: PageProps<"/admin/jobs">) {
  return (
    <>
      <PageHeader eyebrow="Operations" title="Jobs & applications" description="The normalized job catalog and every application moving through the pipeline." />
      <Suspense fallback={<PageSkeleton rows={6} />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/admin/jobs">["searchParams"] }) {
  await requireStaff();
  const sp = await searchParams;
  const tab = sp.tab === "applications" ? "applications" : "jobs";
  const q = typeof sp.q === "string" ? sp.q : undefined;

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav aria-label="View" className="flex gap-1 border-b border-line sm:border-0">
          {(["jobs", "applications"] as const).map((t) => (
            <Link key={t} href={`/admin/jobs?tab=${t}`} aria-current={tab === t ? "page" : undefined} className={cn("-mb-px border-b-2 px-3 py-2 text-[13px] capitalize sm:rounded-md sm:border-0 sm:py-1.5", tab === t ? "border-accent text-fg sm:bg-surface-2" : "border-transparent text-muted hover:text-fg")}>
              {t}
            </Link>
          ))}
        </nav>
        {tab === "jobs" && <SearchBox placeholder="Search job titles" />}
      </div>
      {tab === "jobs" ? <Jobs q={q} /> : <Applications />}
    </>
  );
}

async function Jobs({ q }: { q?: string }) {
  const jobs = await jobsCatalog(q);
  return (
    <Panel>
      {jobs.length === 0 ? (
        <EmptyState icon={<Briefcase />} title="No jobs found" description="Run an ingestion from the Pipeline page to pull in fresh postings." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-[13px]">
            <caption className="sr-only">Jobs</caption>
            <thead>
              <tr className="border-b border-line text-xs text-subtle">
                <th scope="col" className="px-5 py-3 font-medium">Role</th>
                <th scope="col" className="px-5 py-3 font-medium">Location</th>
                <th scope="col" className="px-5 py-3 font-medium">Salary</th>
                <th scope="col" className="px-5 py-3 font-medium">Sponsorship</th>
                <th scope="col" className="px-5 py-3 font-medium">Source</th>
                <th scope="col" className="px-5 py-3 font-medium">Fingerprint</th>
                <th scope="col" className="px-5 py-3 font-medium">Posted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {jobs.map((j) => (
                <tr key={j.id} className="hover:bg-surface-2/40">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <CompanyMark name={j.company.name} color={j.company.brandColor} size="sm" />
                      <div className="min-w-0">
                        <p className="max-w-72 truncate font-medium text-fg">{j.title}</p>
                        <p className="text-xs text-subtle">{j.company.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-muted">
                    {j.locations.map((l) => `${l.city}, ${countryName(l.country)}`).join(" / ")}
                    <span className="block text-xs capitalize text-subtle">{j.workMode}</span>
                  </td>
                  <td className="px-5 py-3 tabular text-muted">{formatSalaryRange(j.salary) ?? "—"}</td>
                  <td className="px-5 py-3">
                    <Badge tone={j.visaSponsorship === "yes" ? "success" : j.visaSponsorship === "no" ? "danger" : "neutral"}>{j.visaSponsorship}</Badge>
                  </td>
                  <td className="px-5 py-3 capitalize text-muted">{j.source}</td>
                  <td className="px-5 py-3 font-mono text-[11px] text-subtle">{j.fingerprint.slice(0, 10)}</td>
                  <td className="px-5 py-3 text-muted">{timeAgo(j.postedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

async function Applications() {
  const apps = await allApplications();
  return (
    <Panel>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-[13px]">
          <caption className="sr-only">Applications</caption>
          <thead>
            <tr className="border-b border-line text-xs text-subtle">
              <th scope="col" className="px-5 py-3 font-medium">Candidate</th>
              <th scope="col" className="px-5 py-3 font-medium">Role</th>
              <th scope="col" className="px-5 py-3 font-medium">Fit</th>
              <th scope="col" className="px-5 py-3 font-medium">Status</th>
              <th scope="col" className="px-5 py-3 font-medium">Pipeline stage</th>
              <th scope="col" className="px-5 py-3 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {apps.map((a) => (
              <tr key={a.id} className="hover:bg-surface-2/40">
                <td className="px-5 py-3 font-medium text-fg">{a.candidateName}</td>
                <td className="px-5 py-3">
                  <p className="max-w-72 truncate text-fg">{a.job.title}</p>
                  <p className="text-xs text-subtle">{a.job.company.name}</p>
                </td>
                <td className="px-5 py-3 tabular">{a.score ?? "—"}</td>
                <td className="px-5 py-3">
                  <StatusBadge status={a.status} />
                </td>
                <td className="px-5 py-3 text-muted">{STAGE_META[a.stage].label}</td>
                <td className="px-5 py-3 text-muted">{timeAgo(a.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
