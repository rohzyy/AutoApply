import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { OnboardingWizard } from "@/components/app/onboarding/wizard";
import { Logo } from "@/components/ui/marks";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth/dal";
import { getProfileBundle } from "@/lib/services/profile";

export const metadata: Metadata = { title: "Set up your profile" };

export default function OnboardingPage() {
  return (
    <div className="min-h-dvh">
      <header className="flex h-16 items-center justify-between px-5 sm:px-8">
        <Link href="/" aria-label="AutoApply home">
          <Logo />
        </Link>
        <span className="text-xs text-subtle">About 5 minutes</span>
      </header>
      <main id="main" className="mx-auto max-w-2xl px-5 pb-20 pt-6 sm:pt-12">
        <Suspense fallback={<Skeleton className="h-[520px] rounded-xl" />}>
          <Onboarding />
        </Suspense>
      </main>
    </div>
  );
}

async function Onboarding() {
  const user = await requireUser();
  if (user.role !== "candidate") redirect("/admin");
  if (user.onboardedAt) redirect("/dashboard");
  const { profile, resumes } = await getProfileBundle(user);
  return <OnboardingWizard profile={profile} firstName={user.fullName.split(" ")[0] ?? ""} hasResume={resumes.length > 0} />;
}
