import type { Metadata } from "next";
import { Suspense } from "react";
import { PlanEditor } from "@/components/admin/admin-controls";
import { PageHeader } from "@/components/ui/panel";
import { PageSkeleton } from "@/components/ui/skeleton";
import { requireStaff } from "@/lib/auth/dal";
import { systemRepo } from "@/lib/data";

export const metadata: Metadata = { title: "Pricing" };

export default function PricingAdminPage() {
  return (
    <>
      <PageHeader eyebrow="Operations" title="Pricing" description="Plans are stored in the database. Published changes update the public pricing page immediately." />
      <Suspense fallback={<PageSkeleton rows={2} />}>
        <Plans />
      </Suspense>
    </>
  );
}

async function Plans() {
  const user = await requireStaff();
  const plans = await systemRepo().listPlans({ includeInactive: true });
  return (
    <>
      {user.role !== "admin" && <p className="mb-4 text-[13px] text-muted">Read-only: only administrators can change pricing.</p>}
      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((p) => (
          <PlanEditor key={p.id + p.priceMonthly + p.name} plan={p} canEdit={user.role === "admin"} />
        ))}
      </div>
    </>
  );
}
