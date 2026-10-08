import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/ui/marks";
import { ScoreRing } from "@/components/ui/score";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <Link href="/" className="self-start rounded-md" aria-label="AutoApply home">
          <Logo />
        </Link>
        <main id="main" className="mx-auto flex w-full max-w-[380px] flex-1 flex-col justify-center py-12">
          {children}
        </main>
        <p className="text-center text-xs text-subtle lg:text-left">Protected by row-level security and signed sessions.</p>
      </div>

      <aside className="relative hidden overflow-hidden border-l border-line bg-surface lg:block" aria-hidden>
        <div className="bg-grid absolute inset-0 opacity-70" />
        <div className="glow-top absolute inset-0" />
        <div className="relative flex h-full flex-col justify-center px-14">
          <p className="max-w-md text-[28px] font-semibold leading-[1.15] tracking-[-0.03em] text-fg">
            “Which of these roles can I actually get a visa for?” — answered before you apply.
          </p>
          <div className="mt-12 max-w-md space-y-2">
            {[
              { co: "Helix Payments · Amsterdam", t: "Senior Full-Stack Engineer", s: 92, e: "Sponsors visas" },
              { co: "Orbital Health · Berlin", t: "Senior Software Engineer", s: 86, e: "Sponsors visas" },
              { co: "Kestrel Analytics · London", t: "Full-Stack Engineer, Planning", s: 78, e: "Likely sponsor" },
            ].map((r, i) => (
              <div key={r.t} className="flex items-center gap-4 rounded-lg border border-line bg-bg/70 px-4 py-3" style={{ opacity: 1 - i * 0.18 }}>
                <ScoreRing score={r.s} size={38} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-fg">{r.t}</p>
                  <p className="truncate text-xs text-subtle">{r.co}</p>
                </div>
                <span className="flex items-center gap-1 text-xs text-success">
                  <ShieldCheck className="size-3.5" /> {r.e}
                </span>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
