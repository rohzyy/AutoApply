import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountForm, BillingPanel, PreferencesForm, SecurityPanel } from "@/components/app/settings/settings-forms";
import { Badge } from "@/components/ui/badge";
import { PageHeader, Panel, PanelHeader } from "@/components/ui/panel";
import { PageSkeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth/dal";
import { userRepo } from "@/lib/data";
import { isDemoMode } from "@/lib/env";
import { billingOverview, listPlans } from "@/lib/services/billing";
import { formatDate, formatMoney } from "@/lib/utils";

export const metadata: Metadata = { title: "Settings" };

const NAV = [
  ["account", "Account"],
  ["notifications", "Notifications"],
  ["security", "Security"],
  ["billing", "Subscription"],
] as const;

export default function SettingsPage() {
  return (
    <>
      <PageHeader eyebrow="Settings" title="Settings" description="Account, notifications, security and your subscription." />
      <Suspense fallback={<PageSkeleton rows={3} />}>
        <Settings />
      </Suspense>
    </>
  );
}

async function Settings() {
  const user = await requireUser();
  const [settings, billing, plans] = await Promise.all([(await userRepo()).getSettings(user.id), billingOverview(user), listPlans()]);
  const demo = isDemoMode();

  return (
    <div className="grid gap-8 lg:grid-cols-[180px_minmax(0,1fr)]">
      <nav aria-label="Settings sections" className="hidden lg:block">
        <ul className="sticky top-20 space-y-0.5 border-l border-line">
          {NAV.map(([id, label]) => (
            <li key={id}>
              <a href={`#${id}`} className="-ml-px block border-l border-transparent py-1.5 pl-3 text-[13px] text-muted hover:border-fg hover:text-fg">
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="min-w-0 space-y-6">
        <AccountForm name={user.fullName} email={user.email} />
        <PreferencesForm settings={settings} />
        <SecurityPanel method={demo ? "Demo session" : "Email & password"} demo={demo} />
        <BillingPanel plans={plans} subscription={billing.subscription} current={billing.plan} usage={{ tailored: billing.tailored, reviews: billing.reviews }} />
        <Panel>
          <PanelHeader title="Payment history" />
          {billing.payments.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-muted">No payments yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-[13px]">
                <caption className="sr-only">Payments</caption>
                <thead>
                  <tr className="border-b border-line text-xs text-subtle">
                    <th scope="col" className="px-5 py-2.5 font-medium">Date</th>
                    <th scope="col" className="px-5 py-2.5 font-medium">Description</th>
                    <th scope="col" className="px-5 py-2.5 font-medium">Amount</th>
                    <th scope="col" className="px-5 py-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {billing.payments.map((p) => (
                    <tr key={p.id}>
                      <td className="px-5 py-3 text-muted">{formatDate(p.createdAt, { month: "short", day: "numeric", year: "numeric" })}</td>
                      <td className="px-5 py-3">{p.description}</td>
                      <td className="px-5 py-3 tabular">{formatMoney(p.amount, p.currency)}</td>
                      <td className="px-5 py-3">
                        <Badge tone={p.status === "succeeded" ? "success" : p.status === "failed" ? "danger" : "neutral"}>{p.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
