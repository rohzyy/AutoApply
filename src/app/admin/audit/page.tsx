import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { PageHeader, Panel } from "@/components/ui/panel";
import { PageSkeleton } from "@/components/ui/skeleton";
import { requireStaff } from "@/lib/auth/dal";
import { auditTrail } from "@/lib/services/admin";
import { cn, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Audit log" };

const FILTERS = ["all", "application", "human_review", "tailored_document", "resume", "user", "plan", "background_job", "subscription"];

export default function AuditPage({ searchParams }: PageProps<"/admin/audit">) {
  return (
    <>
      <PageHeader eyebrow="Operations" title="Audit log" description="Append-only record of who did what, and when. Written server-side; never editable from the client." />
      <Suspense fallback={<PageSkeleton rows={8} />}>
        <Audit searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Audit({ searchParams }: { searchParams: PageProps<"/admin/audit">["searchParams"] }) {
  await requireStaff();
  const sp = await searchParams;
  const entity = typeof sp.entity === "string" && FILTERS.includes(sp.entity) ? sp.entity : "all";
  const logs = await auditTrail(entity === "all" ? undefined : entity);

  return (
    <>
      <nav aria-label="Filter by entity" className="mb-4 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <Link key={f} href={f === "all" ? "/admin/audit" : `/admin/audit?entity=${f}`} aria-current={entity === f ? "page" : undefined} className={cn("h-7 rounded-md border px-2.5 text-xs leading-7 transition-colors", entity === f ? "border-line-strong bg-surface-3 text-fg" : "border-line text-muted hover:text-fg")}>
            {f.replace(/_/g, " ")}
          </Link>
        ))}
      </nav>
      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-[13px]">
            <caption className="sr-only">Audit log</caption>
            <thead>
              <tr className="border-b border-line text-xs text-subtle">
                <th scope="col" className="px-5 py-2.5 font-medium">Time</th>
                <th scope="col" className="px-5 py-2.5 font-medium">Actor</th>
                <th scope="col" className="px-5 py-2.5 font-medium">Action</th>
                <th scope="col" className="px-5 py-2.5 font-medium">Entity</th>
                <th scope="col" className="px-5 py-2.5 font-medium">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-muted">
                    No entries for this filter.
                  </td>
                </tr>
              )}
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-surface-2/40">
                  <td className="whitespace-nowrap px-5 py-2.5 tabular text-muted">{formatDate(l.createdAt, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                  <td className="px-5 py-2.5">
                    <span className="text-fg">{l.actorName}</span> <Badge className="ml-1.5">{l.actorRole}</Badge>
                  </td>
                  <td className="px-5 py-2.5 font-mono text-xs text-fg">{l.action}</td>
                  <td className="px-5 py-2.5 text-muted">
                    {l.entityType}
                    {l.entityId && <span className="ml-1.5 font-mono text-[11px] text-subtle">{l.entityId.slice(0, 8)}</span>}
                  </td>
                  <td className="px-5 py-2.5 font-mono text-[11px] text-subtle">{l.ip ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
