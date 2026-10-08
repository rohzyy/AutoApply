import { KanbanSquare } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ApplicationDrawer, type DrawerData } from "@/components/app/tracker/drawer";
import { TrackerBoard } from "@/components/app/tracker/board";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/states";
import { requireCandidate } from "@/lib/auth/dal";
import { AppError } from "@/lib/infra/errors";
import { applicationDetail, listTracker } from "@/lib/services/applications";

export const metadata: Metadata = { title: "Applications" };

export default function ApplicationsPage({ searchParams }: PageProps<"/applications">) {
  return (
    <>
      <PageHeader eyebrow="Application tracker" title="Applications" description="Drag cards as you hear back. Moves into human review and submission are handled with a specialist." />
      <Suspense fallback={<BoardSkeleton />}>
        <Tracker searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Tracker({ searchParams }: { searchParams: PageProps<"/applications">["searchParams"] }) {
  const user = await requireCandidate();
  const sp = await searchParams;
  const openId = typeof sp.open === "string" ? sp.open : null;
  const applications = await listTracker(user);

  let detail: DrawerData | null = null;
  if (openId) {
    try {
      detail = await applicationDetail(user, openId);
    } catch (err) {
      if (!(err instanceof AppError)) throw err;
    }
  }

  if (applications.length === 0) {
    return (
      <Panel>
        <EmptyState icon={<KanbanSquare />} title="No applications yet" description="Save a role or start tailoring one and it will appear here, ready to track from shortlist to offer." action={<Button asChild size="sm"><Link href="/jobs">Browse matches</Link></Button>} />
      </Panel>
    );
  }

  const counts = {
    active: applications.filter((a) => !["saved", "rejected"].includes(a.status)).length,
    interviews: applications.filter((a) => a.status === "interview").length,
    offers: applications.filter((a) => a.status === "offer").length,
  };

  return (
    <>
      <div className="mb-5 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-muted">
        <span>
          <span className="font-medium tabular text-fg">{applications.length}</span> total
        </span>
        <span>
          <span className="font-medium tabular text-fg">{counts.active}</span> active
        </span>
        <span>
          <span className="font-medium tabular text-fg">{counts.interviews}</span> interviewing
        </span>
        <span>
          <span className="font-medium tabular text-success">{counts.offers}</span> offers
        </span>
      </div>
      <TrackerBoard applications={applications} />
      <ApplicationDrawer data={detail} />
    </>
  );
}

function BoardSkeleton() {
  return (
    <div className="flex gap-3 overflow-hidden" role="status" aria-label="Loading applications">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="w-[272px] shrink-0 space-y-2">
          <Skeleton className="h-8" />
          <Skeleton className="h-28 rounded-md" />
          <Skeleton className="h-28 rounded-md" />
        </div>
      ))}
    </div>
  );
}
