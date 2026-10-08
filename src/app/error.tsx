"use client";

import { RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main" className="grid min-h-[70dvh] place-items-center px-6">
      <div className="max-w-md text-center">
        <p className="font-mono text-xs uppercase tracking-[0.1em] text-danger">Something broke</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.02em]">We couldn&apos;t load this view</h1>
        <p className="mt-3 text-sm text-muted">The error has been logged. Try again — if it keeps happening, head back to your dashboard.</p>
        {error.digest && <p className="mt-3 font-mono text-[11px] text-subtle">Reference {error.digest}</p>}
        <div className="mt-8 flex justify-center gap-2">
          <Button variant="secondary" asChild>
            <Link href="/dashboard">Dashboard</Link>
          </Button>
          <Button onClick={reset}>
            <RotateCcw /> Try again
          </Button>
        </div>
      </div>
    </main>
  );
}
