import type { Metadata } from "next";
import { Suspense } from "react";
import { SignUpForm } from "@/components/auth/auth-forms";
import { Skeleton } from "@/components/ui/skeleton";
import { isDemoMode } from "@/lib/env";

export const metadata: Metadata = { title: "Create account" };

export default function SignUpPage({ searchParams }: PageProps<"/signup">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
      <SignUp searchParams={searchParams} />
    </Suspense>
  );
}

async function SignUp({ searchParams }: { searchParams: PageProps<"/signup">["searchParams"] }) {
  const sp = await searchParams;
  const plan = typeof sp.plan === "string" && ["entry", "professional", "executive"].includes(sp.plan) ? sp.plan : undefined;
  return <SignUpForm demo={isDemoMode()} plan={plan} />;
}
