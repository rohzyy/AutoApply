import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/ui/marks";
import { Tooltip } from "@/components/ui/overlay";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser, isStaff } from "@/lib/auth/dal";
import { userRepo } from "@/lib/data";
import { isDemoMode } from "@/lib/env";
import { CommandPalette, CommandTrigger } from "./command-palette";
import { ADMIN_NAV, CANDIDATE_NAV, CandidateLink, MobileTabBar, MobileTabBarFallback, SidebarNav, SidebarNavFallback, StaffLink } from "./nav";
import { NotificationsButton, UserMenu } from "./user-controls";

type Variant = "candidate" | "admin";

/**
 * Static chrome renders into the shell instantly; anything that needs the session
 * (user menu, notifications, role-gated links) streams in behind its own boundary.
 */
export function AppShell({ variant, children }: { variant: Variant; children: React.ReactNode }) {
  const items = variant === "admin" ? ADMIN_NAV : CANDIDATE_NAV;
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[232px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-bg px-3 py-4 md:flex">
        <Link href={variant === "admin" ? "/admin" : "/dashboard"} className="mb-6 flex items-center gap-2 rounded-md px-1.5" aria-label="Home">
          <Logo />
          {variant === "admin" && <span className="rounded border border-line-strong px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-subtle">Ops</span>}
        </Link>
        <Suspense fallback={<SidebarNavFallback items={items} label={variant === "admin" ? "Operations" : "Main"} />}>
          <SidebarNav items={items} label={variant === "admin" ? "Operations" : "Main"} />
        </Suspense>
        <div className="mt-auto space-y-3">
          <Suspense fallback={null}>
            <RoleSwitch variant={variant} />
          </Suspense>
          {isDemoMode() && (
            <Tooltip content="Running on seeded in-memory data. Connect Supabase to persist." side="right">
              <div className="flex items-center gap-2 rounded-md border border-line px-2.5 py-2 text-xs text-subtle">
                <span className="size-1.5 rounded-full bg-warning" aria-hidden />
                Demo data mode
              </div>
            </Tooltip>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="glass sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line px-4 md:px-8">
          <Link href={variant === "admin" ? "/admin" : "/dashboard"} className="md:hidden" aria-label="Home">
            <Logo wordmark={false} />
          </Link>
          <div className="flex-1">
            <div className="hidden sm:block">
              <CommandTrigger />
            </div>
          </div>
          <Suspense fallback={<Skeleton className="h-7 w-20 rounded-full" />}>
            <ShellUser />
          </Suspense>
        </header>
        <main id="main" className="flex-1 px-4 pb-28 pt-6 md:px-8 md:pb-12 md:pt-8">
          <div className="mx-auto w-full max-w-[1240px]">{children}</div>
        </main>
      </div>
      <Suspense fallback={<MobileTabBarFallback items={items} />}>
        <MobileTabBar items={items} />
      </Suspense>
    </div>
  );
}

async function ShellUser() {
  const user = await getCurrentUser();
  if (!user) return null;
  const notifications = await (await userRepo()).listNotifications(user.id, 12);
  return (
    <div className="flex items-center gap-1.5">
      <NotificationsButton items={notifications} />
      <UserMenu name={user.fullName} email={user.email} role={user.role} />
      <CommandPalette staff={isStaff(user)} />
    </div>
  );
}

async function RoleSwitch({ variant }: { variant: Variant }) {
  const user = await getCurrentUser();
  if (!user) return null;
  if (variant === "admin") return user.role === "candidate" ? null : <CandidateLink />;
  return isStaff(user) ? <StaffLink /> : null;
}
