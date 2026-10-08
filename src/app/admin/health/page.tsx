import { CheckCircle2, XCircle } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { PageHeader, Panel, PanelHeader } from "@/components/ui/panel";
import { PageSkeleton } from "@/components/ui/skeleton";
import { requireStaff } from "@/lib/auth/dal";
import { systemHealth } from "@/lib/services/admin";

export const metadata: Metadata = { title: "System health" };

export default function HealthPage() {
  return (
    <>
      <PageHeader eyebrow="Operations" title="System health" description="Live checks against the database, auth, AI provider and background queue." />
      <Suspense fallback={<PageSkeleton rows={6} />}>
        <Health />
      </Suspense>
    </>
  );
}

async function Health() {
  await requireStaff();
  const { checks, dataMode } = await systemHealth();
  const healthy = checks.every((c) => c.ok);
  return (
    <div className="space-y-6">
      <Panel className="flex items-center gap-4 px-5 py-4">
        {healthy ? <CheckCircle2 className="size-5 text-success" /> : <XCircle className="size-5 text-warning" />}
        <div className="flex-1">
          <p className="text-sm font-medium">{healthy ? "All systems operational" : "Degraded — see checks below"}</p>
          <p className="text-xs text-subtle">Data mode: {dataMode === "supabase" ? "Supabase (PostgreSQL + Auth + Storage)" : "Demo (in-memory seeded store)"} · public probe at /api/health</p>
        </div>
      </Panel>
      <Panel>
        <PanelHeader title="Checks" />
        <ul className="divide-y divide-line">
          {checks.map((c) => (
            <li key={c.key} className="flex items-center gap-4 px-5 py-3.5">
              <span className={`size-2 rounded-full ${c.ok ? "bg-success" : "bg-danger"}`} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium">{c.label}</p>
                <p className="truncate text-xs text-subtle">{c.detail}</p>
              </div>
              <Badge tone={c.ok ? "success" : "danger"}>{c.ok ? "Operational" : "Attention"}</Badge>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
