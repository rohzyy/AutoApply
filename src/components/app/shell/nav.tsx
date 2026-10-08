"use client";

import { motion } from "framer-motion";
import { Activity, Briefcase, ClipboardCheck, Gauge, KanbanSquare, LayoutGrid, Radar, ScrollText, Settings, ShieldCheck, Tag, Users, UserRound, Workflow } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export const CANDIDATE_NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/jobs", label: "Job intelligence", short: "Jobs", icon: Radar },
  { href: "/applications", label: "Applications", icon: KanbanSquare },
  { href: "/profile", label: "Profile & resumes", short: "Profile", icon: UserRound },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export const ADMIN_NAV = [
  { href: "/admin", label: "Overview", icon: Gauge },
  { href: "/admin/reviews", label: "Review queue", short: "Reviews", icon: ClipboardCheck },
  { href: "/admin/candidates", label: "Candidates", icon: Users },
  { href: "/admin/jobs", label: "Jobs & applications", short: "Jobs", icon: Briefcase },
  { href: "/admin/pipeline", label: "Pipeline", icon: Workflow },
  { href: "/admin/pricing", label: "Pricing", icon: Tag },
  { href: "/admin/audit", label: "Audit log", short: "Audit", icon: ScrollText },
  { href: "/admin/health", label: "System health", short: "Health", icon: Activity },
] as const;

type Item = { href: string; label: string; short?: string; icon: React.ComponentType<{ className?: string }> };

function isActive(pathname: string, href: string) {
  if (href === "/admin" || href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({ items, label }: { items: readonly Item[]; label: string }) {
  return <SidebarNavList items={items} label={label} pathname={usePathname()} />;
}

/** Prerendered fallback: identical markup without the active state, swapped in once the URL is known. */
export function SidebarNavFallback({ items, label }: { items: readonly Item[]; label: string }) {
  return <SidebarNavList items={items} label={label} pathname="" />;
}

function SidebarNavList({ items, label, pathname }: { items: readonly Item[]; label: string; pathname: string }) {
  return (
    <nav aria-label={label}>
      <ul className="space-y-0.5">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] transition-colors duration-150",
                  active ? "text-fg" : "text-muted hover:bg-surface-2/60 hover:text-fg",
                )}
              >
                {active && <motion.span layoutId={`nav-${label}`} className="absolute inset-0 rounded-md border border-line bg-surface-2" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
                <item.icon className={cn("relative size-4 shrink-0", active ? "text-fg" : "text-subtle group-hover:text-muted")} />
                <span className="relative">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function StaffLink() {
  const pathname = usePathname();
  const active = pathname.startsWith("/admin");
  return (
    <Link href="/admin" className={cn("flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] transition-colors", active ? "bg-surface-2 text-fg" : "text-muted hover:bg-surface-2/60 hover:text-fg")}>
      <ShieldCheck className="size-4 text-subtle" /> Operations console
    </Link>
  );
}

export function CandidateLink() {
  return (
    <Link href="/dashboard" className="flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] text-muted transition-colors hover:bg-surface-2/60 hover:text-fg">
      <LayoutGrid className="size-4 text-subtle" /> Candidate app
    </Link>
  );
}

export function MobileTabBar({ items }: { items: readonly Item[] }) {
  return <MobileTabBarList items={items} pathname={usePathname()} />;
}

export function MobileTabBarFallback({ items }: { items: readonly Item[] }) {
  return <MobileTabBarList items={items} pathname="" />;
}

function MobileTabBarList({ items, pathname }: { items: readonly Item[]; pathname: string }) {
  return (
    <nav aria-label="Primary" className="glass safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line md:hidden">
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${Math.min(items.length, 5)}, minmax(0, 1fr))` }}>
        {items.slice(0, 5).map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link href={item.href} aria-current={active ? "page" : undefined} className={cn("flex h-14 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors", active ? "text-fg" : "text-subtle")}>
                <item.icon className={cn("size-5", active && "text-accent")} />
                {item.short ?? item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
