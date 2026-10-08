"use client";

import { Bell, BellOff, CreditCard, LogOut, Settings, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { markNotificationsReadAction } from "@/app/actions/candidate";
import { signOutAction } from "@/app/actions/auth";
import { Avatar } from "@/components/ui/marks";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger, Popover, PopoverContent, PopoverTrigger } from "@/components/ui/overlay";
import type { Notification } from "@/lib/domain/types";
import { cn, timeAgo } from "@/lib/utils";

export function UserMenu({ name, email, role }: { name: string; email: string; role: string }) {
  const router = useRouter();
  return (
    <Menu>
      <MenuTrigger className="rounded-full" aria-label="Account menu">
        <Avatar name={name} className="size-7 transition-colors hover:border-white/25" />
      </MenuTrigger>
      <MenuContent className="w-60">
        <div className="px-2.5 py-2">
          <p className="truncate text-[13px] font-medium text-fg">{name}</p>
          <p className="truncate text-xs text-subtle">{email}</p>
        </div>
        <MenuSeparator />
        <MenuItem onSelect={() => router.push("/profile")}>
          <UserRound /> Profile & resumes
        </MenuItem>
        <MenuItem onSelect={() => router.push("/settings")}>
          <Settings /> Settings
        </MenuItem>
        <MenuItem onSelect={() => router.push("/settings#billing")}>
          <CreditCard /> Billing
        </MenuItem>
        {role !== "candidate" && (
          <>
            <MenuSeparator />
            <MenuLabel>Staff</MenuLabel>
            <MenuItem onSelect={() => router.push("/admin")}>
              <ShieldCheck /> Operations console
            </MenuItem>
          </>
        )}
        <MenuSeparator />
        <MenuItem onSelect={() => void signOutAction()} className="text-danger data-[highlighted]:text-danger">
          <LogOut /> Sign out
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}

export function NotificationsButton({ items }: { items: Notification[] }) {
  const [, start] = useTransition();
  const [optimistic, markAll] = useOptimistic(items, (state) => state.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
  const unread = optimistic.filter((n) => !n.readAt).length;

  return (
    <Popover>
      <PopoverTrigger className="relative grid size-8 place-items-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-fg" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}>
        <Bell className="size-4" />
        {unread > 0 && <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-accent ring-2 ring-bg" aria-hidden />}
      </PopoverTrigger>
      <PopoverContent className="w-[min(380px,calc(100vw-24px))]">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <p className="text-sm font-medium">Notifications</p>
          {unread > 0 && (
            <button
              className="text-xs text-muted hover:text-fg"
              onClick={() =>
                start(async () => {
                  markAll(null);
                  await markNotificationsReadAction();
                })
              }
            >
              Mark all read
            </button>
          )}
        </div>
        {optimistic.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-10 text-center">
            <BellOff className="size-5 text-subtle" />
            <p className="mt-3 text-sm text-muted">You&apos;re all caught up.</p>
          </div>
        ) : (
          <ul className="max-h-[60vh] divide-y divide-line overflow-y-auto">
            {optimistic.map((n) => (
              <li key={n.id}>
                <Link href={n.href ?? "#"} className="flex gap-3 px-4 py-3 transition-colors hover:bg-surface-3/50">
                  <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", n.readAt ? "bg-transparent" : "bg-accent")} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-[13px]", n.readAt ? "text-muted" : "font-medium text-fg")}>{n.title}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-subtle">{n.body}</span>
                  </span>
                  <span className="shrink-0 text-[11px] text-subtle">{timeAgo(n.createdAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
