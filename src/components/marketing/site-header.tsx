"use client";

import { Menu as MenuIcon, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/marks";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#matching", label: "Matching" },
  { href: "/#international", label: "International" },
  { href: "/pricing", label: "Pricing" },
  { href: "/#security", label: "Security" },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className={cn("sticky top-0 z-40 transition-[background-color,border-color] duration-300", scrolled || open ? "glass border-b border-line" : "border-b border-transparent")}>
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="AutoApply home" className="rounded-md">
          <Logo />
        </Link>
        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-md px-3 py-2 text-[13px] text-muted transition-colors hover:text-fg">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">Get started</Link>
          </Button>
        </div>
        <button className="grid size-10 place-items-center rounded-md text-muted hover:text-fg md:hidden" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? "Close menu" : "Open menu"}>
          {open ? <X className="size-5" /> : <MenuIcon className="size-5" />}
        </button>
      </div>
      {open && (
        <div id="mobile-nav" className="fixed inset-x-0 bottom-0 top-16 z-40 flex flex-col bg-bg px-4 pb-8 pt-4 md:hidden">
          <nav aria-label="Mobile" className="flex flex-col">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="border-b border-line py-4 text-lg font-medium tracking-tight text-fg">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto grid gap-3">
            <Button asChild size="lg" variant="secondary">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="lg">
              <Link href="/signup">Get started</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
