import { ClipboardCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { StatusBadge } from "@/components/app/match";
import { Badge } from "@/components/ui/badge";
import { CompanyMark } from "@/components/ui/marks";
import { PageHeader, Panel } from "@/components/ui/panel";
import { PageSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/states";
import { requireStaff } from "@/lib/auth/dal";
import { REVIEW_STATUS_META } from "@/lib/domain/constants";
import type { ReviewStatus } from "@/lib/domain/types";
import { reviewQueue } from "@/lib/services/reviews";
import { cn, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Review queue" };

const TABS: { key: string; label: string; status?: ReviewStatus[] }[] = [
  { key: "open", label: "Open", status: ["queued", "in_review"] },
  { key: "mine", label: "Assigned to me", status: ["in_review"] },
  { key: "done", label: "Completed", status: ["approved", "changes_requested"] },
];

export default function ReviewsPage({ searchParams }: PageProps<"/admin/reviews">) {
  return (
    <>
      <PageHeader eyebrow="Human review" title="Review queue" description="Every application is checked by a specialist before submission. SLA: 24 hours from request." />
      <Suspense fallback={<PageSkeleton rows={5} />}>
        <Queue searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Queue({ searchParams }: { searchParams: PageProps<"/admin/reviews">["searchParams"] }) {
  const user = await requireStaff();
  const sp = await searchParams;
  const tab = TABS.find((t) => t.key === sp.tab) ?? TABS[0]!;
  let reviews = await reviewQueue(tab.status);
  if (tab.key === "mine") reviews = reviews.filter((r) => r.reviewerId === user.id);
  const now = new Date().toISOString();

  return (
    <>
      <nav aria-label="Queue filters" className="mb-4 flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <Link key={t.key} href={`/admin/reviews?tab=${t.key}`} aria-current={t.key === tab.key ? "page" : undefined} className={cn("-mb-px border-b-2 px-3 py-2.5 text-[13px] transition-colors", t.key === tab.key ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg")}>
            {t.label}
          </Link>
        ))}
      </nav>
      <Panel>
        {reviews.length === 0 ? (
          <EmptyState icon={<ClipboardCheck />} title={tab.key === "done" ? "No completed reviews yet" : "Nothing waiting"} description="When candidates request human review, applications land here ordered by priority and SLA." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-[13px]">
              <caption className="sr-only">Review queue</caption>
              <thead>
                <tr className="border-b border-line text-xs text-subtle">
                  <th scope="col" className="px-5 py-3 font-medium">Candidate</th>
                  <th scope="col" className="px-5 py-3 font-medium">Role</th>
                  <th scope="col" className="px-5 py-3 font-medium">Fit</th>
                  <th scope="col" className="px-5 py-3 font-medium">Review</th>
                  <th scope="col" className="px-5 py-3 font-medium">Reviewer</th>
                  <th scope="col" className="px-5 py-3 font-medium">SLA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {reviews.map((r) => {
                  const overdue = !r.completedAt && r.slaDueAt < now;
                  return (
                    <tr key={r.id} className="group relative transition-colors hover:bg-surface-2/40">
                      <td className="px-5 py-3.5">
                        <Link href={`/admin/reviews/${r.id}`} className="font-medium text-fg after:absolute after:inset-0">
                          {r.candidate.fullName}
                        </Link>
                        <p className="text-xs text-subtle">{r.candidate.email}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <CompanyMark name={r.application.job.company.name} color={r.application.job.company.brandColor} size="sm" />
                          <div className="min-w-0">
                            <p className="max-w-64 truncate text-fg">{r.application.job.title}</p>
                            <p className="text-xs text-subtle">{r.application.job.company.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 tabular">{r.application.score ?? "—"}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <Badge tone={REVIEW_STATUS_META[r.status].tone}>{REVIEW_STATUS_META[r.status].label}</Badge>
                          {r.priority === "high" && <Badge tone="accent">High</Badge>}
                        </div>
                        <div className="mt-1.5">
                          <StatusBadge status={r.application.status} />
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-muted">{r.reviewerName ?? <span className="text-subtle">Unassigned</span>}</td>
                      <td className={cn("px-5 py-3.5 text-xs", overdue ? "text-danger" : "text-subtle")}>{r.completedAt ? `Done ${timeAgo(r.completedAt)}` : overdue ? `Overdue · ${timeAgo(r.slaDueAt)}` : `Due ${timeAgo(r.slaDueAt)}`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
