import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/marks";

export default function NotFound() {
  return (
    <main id="main" className="relative grid min-h-dvh place-items-center overflow-hidden px-6">
      <div className="bg-grid pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative text-center">
        <Logo className="justify-center" />
        <p className="mt-10 font-mono text-xs uppercase tracking-[0.1em] text-subtle">404</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em]">This page isn&apos;t on the map</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm text-muted">The link may be outdated, or the role may have closed.</p>
        <div className="mt-8 flex justify-center gap-2">
          <Button asChild variant="secondary">
            <Link href="/">Home</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
