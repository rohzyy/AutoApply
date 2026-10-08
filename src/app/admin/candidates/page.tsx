import { Users } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchBox } from "@/components/admin/admin-controls";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/marks";
import { PageHeader, Panel } from "@/components/ui/panel";
import { ScoreBar } from "@/components/ui/score";
import { PageSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/states";
import { requireStaff } from "@/lib/auth/dal";
import { countryName } from "@/lib/domain/constants";
import { candidates } from "@/lib/services/admin";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Candidates" };

export default function CandidatesPage({ searchParams }: PageProps<"/admin/candidates">) {
  return (
    <>
      <PageHeader eyebrow="Operations" title="Candidates" description="Everyone using AutoApply, their eligibility profile and pipeline activity." />
      <Suspense fallback={<PageSkeleton rows={6} />}>
        <List searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function List({ searchParams }: { searchParams: PageProps<"/admin/candidates">["searchParams"] }) {
  await requireStaff();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const rows = await candidates(q);

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-4">
        <SearchBox placeholder="Search name or email" />
        <p className="hidden text-[13px] text-muted sm:block">
          <span className="tabular text-fg">{rows.length}</span> candidates
        </p>
      </div>
      <Panel>
        {rows.length === 0 ? (
          <EmptyState icon={<Users />} title="No candidates found" description={q ? `Nothing matches “${q}”.` : "Candidates appear here after they sign up."} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-[13px]">
              <caption className="sr-only">Candidates</caption>
              <thead>
                <tr className="border-b border-line text-xs text-subtle">
                  <th scope="col" className="px-5 py-3 font-medium">Candidate</th>
                  <th scope="col" className="px-5 py-3 font-medium">Location</th>
                  <th scope="col" className="px-5 py-3 font-medium">Authorization</th>
                  <th scope="col" className="px-5 py-3 font-medium">Profile</th>
                  <th scope="col" className="px-5 py-3 font-medium">Applications</th>
                  <th scope="col" className="px-5 py-3 font-medium">Plan</th>
                  <th scope="col" className="px-5 py-3 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map(({ user, profile, plan, completeness, applications, active }) => (
                  <tr key={user.id} className="hover:bg-surface-2/40">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={user.fullName} />
                        <div className="min-w-0">
                          <p className="font-medium text-fg">{user.fullName}</p>
                          <p className="truncate text-xs text-subtle">{profile?.headline || user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted">{profile?.location.country ? `${profile.location.city}, ${countryName(profile.location.country)}` : "—"}</td>
                    <td className="px-5 py-3">
                      {profile ? (
                        <div className="flex flex-wrap gap-1">
                          {profile.workAuthorizations.slice(0, 2).map((a) => (
                            <Badge key={a.country}>{a.country}</Badge>
                          ))}
                          {profile.requiresSponsorship && <Badge tone="warning">Needs visa</Badge>}
                        </div>
                      ) : (
                        <span className="text-subtle">Not onboarded</span>
                      )}
                    </td>
                    <td className="w-36 px-5 py-3">
                      <div className="flex items-center gap-2">
                        <ScoreBar value={completeness} tone={completeness >= 80 ? "success" : "accent"} className="w-16" />
                        <span className="tabular text-xs text-muted">{completeness}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 tabular">
                      {applications} <span className="text-xs text-subtle">· {active} active</span>
                    </td>
                    <td className="px-5 py-3 capitalize">
                      <Badge tone={plan === "executive" ? "success" : plan === "professional" ? "accent" : "neutral"}>{plan}</Badge>
                    </td>
                    <td className="px-5 py-3 text-muted">{formatDate(user.createdAt, { month: "short", day: "numeric", year: "numeric" })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
