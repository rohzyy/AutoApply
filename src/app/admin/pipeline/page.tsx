import { ArrowRight, CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { IngestButton, RetryJobButton, RunWorkerButton } from "@/components/admin/admin-controls";
import { Badge } from "@/components/ui/badge";
import { PageHeader, Panel, PanelHeader } from "@/components/ui/panel";
import { PageSkeleton } from "@/components/ui/skeleton";
import { requireStaff } from "@/lib/auth/dal";
import type { BackgroundJob } from "@/lib/domain/types";
import { pipelineState } from "@/lib/services/admin";
import { cn, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Pipeline" };

const STAGES = ["Ingest", "Normalize", "Deduplicate", "Match", "Rank", "Tailor", "Human review", "Track"];

const JOB_TONE: Record<BackgroundJob["status"], "neutral" | "accent" | "success" | "warning" | "danger"> = {
  queued: "neutral",
  running: "accent",
  succeeded: "success",
  failed: "warning",
  dead: "danger",
};

export default function PipelinePage() {
  return (
    <>
      <PageHeader eyebrow="Operations" title="Pipeline" description="Job ingestion and background processing. Every stage is idempotent and retried with exponential backoff." actions={<RunWorkerButton />} />
      <Suspense fallback={<PageSkeleton rows={5} />}>
        <Pipeline />
      </Suspense>
    </>
  );
}

async function Pipeline() {
  const user = await requireStaff();
  const { runs, jobs, sources } = await pipelineState();
  const isAdmin = user.role === "admin";

  return (
    <div className="space-y-6">
      <Panel className="overflow-x-auto px-5 py-4 no-scrollbar">
        <ol className="flex min-w-[760px] items-center" aria-label="Pipeline stages">
          {STAGES.map((s, i) => (
            <li key={s} className="flex flex-1 items-center last:flex-none">
              <span className={cn("rounded-md border px-2.5 py-1 text-xs", i >= 6 ? "border-success/30 text-success" : "border-line-strong text-fg")}>{s}</span>
              {i < STAGES.length - 1 && <ArrowRight className="mx-2 size-3.5 flex-1 text-subtle" aria-hidden />}
            </li>
          ))}
        </ol>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <Panel>
          <PanelHeader title="Sources" description={isAdmin ? "Trigger an ingestion run" : "Admins can trigger runs"} />
          <ul className="divide-y divide-line">
            {sources.map((s) => {
              const last = runs.find((r) => r.source === s.id);
              return (
                <li key={s.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium">{s.name}</p>
                    <p className="text-xs text-subtle">{last ? `Last run ${timeAgo(last.startedAt)} · ${last.status}` : "Never run"}</p>
                  </div>
                  {isAdmin && <IngestButton source={s.id} />}
                </li>
              );
            })}
          </ul>
          <p className="border-t border-line px-5 py-3 text-xs text-subtle">Adapters are mocked in this build; real board APIs implement the same JobSource interface.</p>
        </Panel>

        <Panel>
          <PanelHeader title="Ingestion runs" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-[13px]">
              <caption className="sr-only">Ingestion runs</caption>
              <thead>
                <tr className="border-b border-line text-xs text-subtle">
                  <th scope="col" className="px-5 py-2.5 font-medium">Source</th>
                  <th scope="col" className="px-5 py-2.5 font-medium">Status</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-medium">Fetched</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-medium">Normalized</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-medium">Duplicates</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-medium">Inserted</th>
                  <th scope="col" className="px-5 py-2.5 font-medium">Started</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {runs.map((r) => (
                  <tr key={r.id}>
                    <td className="px-5 py-2.5 capitalize">{r.source}</td>
                    <td className="px-5 py-2.5">
                      <span className="flex items-center gap-1.5">
                        {r.status === "succeeded" ? <CheckCircle2 className="size-3.5 text-success" /> : r.status === "failed" ? <XCircle className="size-3.5 text-danger" /> : <Loader2 className="size-3.5 animate-spin text-accent" />}
                        <span className={cn(r.status === "failed" && "text-danger")} title={r.error ?? undefined}>
                          {r.status}
                        </span>
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-right tabular">{r.fetched}</td>
                    <td className="px-5 py-2.5 text-right tabular">{r.normalized}</td>
                    <td className="px-5 py-2.5 text-right tabular text-muted">{r.duplicates}</td>
                    <td className="px-5 py-2.5 text-right tabular font-medium">{r.inserted}</td>
                    <td className="px-5 py-2.5 text-muted">{timeAgo(r.startedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <Panel>
        <PanelHeader title="Background jobs" description="Claimed with SKIP LOCKED, retried with backoff, dead-lettered after max attempts" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-[13px]">
            <caption className="sr-only">Background jobs</caption>
            <thead>
              <tr className="border-b border-line text-xs text-subtle">
                <th scope="col" className="px-5 py-2.5 font-medium">Type</th>
                <th scope="col" className="px-5 py-2.5 font-medium">Status</th>
                <th scope="col" className="px-5 py-2.5 font-medium">Attempts</th>
                <th scope="col" className="px-5 py-2.5 font-medium">Idempotency key</th>
                <th scope="col" className="px-5 py-2.5 font-medium">Last error</th>
                <th scope="col" className="px-5 py-2.5 font-medium">Created</th>
                <th scope="col" className="px-5 py-2.5 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {jobs.map((j) => (
                <tr key={j.id}>
                  <td className="px-5 py-2.5 font-mono text-xs">{j.type}</td>
                  <td className="px-5 py-2.5">
                    <Badge tone={JOB_TONE[j.status]}>{j.status === "dead" ? "dead-letter" : j.status}</Badge>
                  </td>
                  <td className="px-5 py-2.5 tabular text-muted">
                    {j.attempts}/{j.maxAttempts}
                  </td>
                  <td className="max-w-48 truncate px-5 py-2.5 font-mono text-[11px] text-subtle">{j.idempotencyKey ?? "—"}</td>
                  <td className="max-w-64 truncate px-5 py-2.5 text-xs text-muted" title={j.lastError ?? undefined}>
                    {j.lastError ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-5 py-2.5 text-muted">
                    <Clock className="mr-1 inline size-3 text-subtle" /> {timeAgo(j.createdAt)}
                  </td>
                  <td className="px-5 py-2.5 text-right">{isAdmin && (j.status === "failed" || j.status === "dead") && <RetryJobButton id={j.id} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
