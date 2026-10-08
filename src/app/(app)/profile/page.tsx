import type { Metadata } from "next";
import { Suspense } from "react";
import { ProfileEditor } from "@/components/app/profile/profile-editor";
import { ResumeManager } from "@/components/app/profile/resume-manager";
import { PageHeader, Panel, PanelHeader } from "@/components/ui/panel";
import { ScoreRing } from "@/components/ui/score";
import { PageSkeleton } from "@/components/ui/skeleton";
import { requireCandidate } from "@/lib/auth/dal";
import { profileCompleteness } from "@/lib/domain/profile";
import { getProfileBundle } from "@/lib/services/profile";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Profile & resumes" };

const SECTIONS = [
  ["basics", "Basics"],
  ["eligibility", "Work authorization"],
  ["preferences", "Preferences"],
  ["skills", "Skills"],
  ["experience", "Experience"],
  ["documents", "Resumes & documents"],
] as const;

export default function ProfilePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Profile />
    </Suspense>
  );
}

async function Profile() {
  const user = await requireCandidate();
  const { profile, resumes } = await getProfileBundle(user);
  const completeness = profileCompleteness(profile, resumes.length > 0);
  const done = new Set(completeness.items.filter((i) => i.done).map((i) => i.href.split("#")[1]));

  return (
    <>
      <PageHeader eyebrow="Profile" title={user.fullName} description="One profile powers matching, tailoring and review. Changes re-rank your matches automatically." />
      <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-20 space-y-5">
            <div className="flex items-center gap-3">
              <ScoreRing score={completeness.score} size={44} />
              <div>
                <p className="text-[13px] font-medium">Profile strength</p>
                <p className="text-xs text-subtle">{completeness.missing.length ? `${completeness.missing.length} to go` : "Complete"}</p>
              </div>
            </div>
            <nav aria-label="Profile sections">
              <ul className="space-y-0.5 border-l border-line">
                {SECTIONS.map(([id, label]) => (
                  <li key={id}>
                    <a href={`#${id}`} className="-ml-px flex items-center justify-between border-l border-transparent py-1.5 pl-3 text-[13px] text-muted transition-colors hover:border-fg hover:text-fg">
                      {label}
                      <span className={cn("size-1.5 rounded-full", done.has(id) || (id === "documents" && resumes.length) ? "bg-success" : "bg-white/10")} aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </aside>
        <div className="min-w-0 space-y-6 pb-16">
          <ProfileEditor profile={profile} />
          <Panel id="documents" className="scroll-mt-20">
            <PanelHeader title="Resumes & documents" description="Your primary resume is the starting point for every tailored version" />
            <ResumeManager resumes={resumes} />
          </Panel>
        </div>
      </div>
    </>
  );
}
