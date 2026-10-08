"use client";

import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { Check, MapPin, Sparkles, UserCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CompanyMark } from "@/components/ui/marks";
import { EASE_OUT } from "@/components/ui/motion";
import { cn } from "@/lib/utils";

const ROWS = [
  { company: "Helix Payments", color: "#6E8BFF", title: "Senior Full-Stack Engineer", place: "Amsterdam · Hybrid", score: 92, visa: "Sponsors" },
  { company: "Saltmarsh Commerce", color: "#FF8A65", title: "Senior Software Engineer, Checkout", place: "Dublin · Hybrid", score: 89, visa: "Sponsors" },
  { company: "Orbital Health", color: "#3DD68C", title: "Senior Software Engineer", place: "Berlin · Hybrid", score: 86, visa: "Sponsors" },
  { company: "Kestrel Analytics", color: "#F5B544", title: "Full-Stack Engineer, Planning", place: "London · Hybrid", score: 78, visa: "Likely" },
  { company: "Arclight Security", color: "#FF6369", title: "Frontend Engineer", place: "Remote · US only", score: 34, visa: "No" },
];

const FACTORS = [
  { label: "Skills", value: "Strong", score: 94, note: "5 of 5 required skills" },
  { label: "Experience", value: "Strong", score: 100, note: "7 yrs at senior level" },
  { label: "Eligibility", value: "Via sponsorship", score: 75, note: "Visa sponsorship offered" },
  { label: "Location", value: "Aligned", score: 82, note: "Netherlands is a target country" },
];

const STAGES = ["AI discovered", "AI matched", "AI tailored", "Human reviewed", "Applied"];
const CYCLE_MS = 10_000;

/** Looping product demo: ranking → explanation → AI tailoring → human review → applied. */
export function HeroDemo() {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref, { margin: "-10% 0px" });
  const [t, setT] = useState(reduced ? CYCLE_MS : 0);

  useEffect(() => {
    if (reduced || !visible) return;
    // A coarse 100ms clock is plenty for phase changes; motion itself is handled by framer.
    const started = performance.now() - t;
    const id = window.setInterval(() => setT((performance.now() - started) % (CYCLE_MS + 2_500)), 100);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, visible]);

  const rowsShown = Math.min(ROWS.length, Math.floor(t / 380));
  const selected = t > 2_300;
  const stage = t < 2_300 ? 0 : t < 4_200 ? 1 : t < 6_400 ? 2 : t < 8_600 ? 3 : 4;
  const scanning = t < 2_200;

  return (
    <div ref={ref} className="relative mx-auto w-full max-w-[1080px]" aria-label="Product preview: AutoApply ranking roles and explaining a match" role="img">
      <div className="absolute inset-x-0 -top-10 bottom-10 -z-10 rounded-[40px] bg-[radial-gradient(ellipse_at_top,rgb(61_123_255/0.14),transparent_65%)]" aria-hidden />
      <div className="overflow-hidden rounded-xl border border-line-strong bg-surface shadow-[0_40px_120px_-20px_rgb(0_0_0/0.8),inset_0_1px_0_rgb(255_255_255/0.05)]">
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <div className="flex items-center gap-2 text-xs text-subtle">
            <span className="font-medium text-muted">Matches</span>
            <span aria-hidden>/</span>
            <span>Senior Full-Stack · EU, Canada</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted">
            <span className={cn("size-1.5 rounded-full", scanning ? "animate-pulse-dot bg-accent" : "bg-success")} aria-hidden />
            <span className="tabular">{scanning ? "Ranking 1,240 roles…" : "37 eligible matches"}</span>
          </div>
        </div>

        <div className="grid md:grid-cols-[1.25fr_1fr]">
          {/* Ranked list */}
          <div className="relative overflow-hidden border-line md:border-r">
            {scanning && <div className="pointer-events-none absolute inset-x-0 top-0 h-full animate-scan bg-gradient-to-b from-transparent via-accent/[0.06] to-transparent" aria-hidden />}
            <ul className="divide-y divide-line">
              {ROWS.map((r, i) => {
                const shown = i < rowsShown;
                const active = selected && i === 0;
                return (
                  <motion.li
                    key={r.company}
                    initial={false}
                    animate={{ opacity: shown ? (r.score < 50 ? 0.45 : 1) : 0, y: shown ? 0 : 6 }}
                    transition={{ duration: 0.35, ease: EASE_OUT }}
                    className={cn("relative flex items-center gap-3 px-4 py-3 transition-colors duration-300", active && "bg-surface-2")}
                  >
                    {active && <motion.span layoutId="hero-active" className="absolute inset-y-0 left-0 w-0.5 bg-accent" aria-hidden />}
                    <CompanyMark name={r.company} color={r.color} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-fg">{r.title}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-subtle">
                        {r.company} <span aria-hidden>·</span> {r.place}
                      </p>
                    </div>
                    <span className={cn("hidden rounded border px-1.5 py-0.5 text-[11px] sm:inline", r.visa === "No" ? "border-danger/25 text-danger" : r.visa === "Likely" ? "border-warning/25 text-warning" : "border-success/25 text-success")}>
                      Visa: {r.visa}
                    </span>
                    <span className={cn("w-9 text-right text-sm font-semibold tabular", r.score >= 85 ? "text-success" : r.score >= 70 ? "text-[#8FB3FF]" : "text-subtle")}>
                      {shown ? <Counter to={r.score} /> : "—"}
                    </span>
                  </motion.li>
                );
              })}
            </ul>
          </div>

          {/* Explanation */}
          <div className="hidden flex-col p-4 md:flex">
            <AnimatePresence mode="wait">
              {selected ? (
                <motion.div key="detail" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: EASE_OUT }} className="flex h-full flex-col">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-subtle">Why it matches</p>
                      <p className="mt-1 text-sm font-medium text-fg">Helix Payments</p>
                      <p className="flex items-center gap-1 text-xs text-subtle">
                        <MapPin className="size-3" aria-hidden /> Amsterdam, Netherlands
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-semibold tabular text-success">92</p>
                      <p className="text-[11px] text-subtle">fit score</p>
                    </div>
                  </div>
                  <ul className="mt-4 space-y-3">
                    {FACTORS.map((f, i) => (
                      <li key={f.label}>
                        <div className="flex items-baseline justify-between text-xs">
                          <span className="text-muted">
                            {f.label}: <span className="text-fg">{f.value}</span>
                          </span>
                          <span className="text-subtle">{f.note}</span>
                        </div>
                        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                          <motion.div className={cn("h-full rounded-full", f.score >= 80 ? "bg-success" : "bg-accent")} initial={{ width: 0 }} animate={{ width: `${f.score}%` }} transition={{ duration: 0.8, delay: 0.15 + i * 0.12, ease: EASE_OUT }} />
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto pt-5">
                    <AnimatePresence mode="wait">
                      <motion.div key={stage} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.25 }} className="flex items-center gap-2 rounded-md border border-line bg-surface-2 px-3 py-2 text-xs">
                        {stage >= 3 ? <UserCheck className="size-3.5 text-success" aria-hidden /> : <Sparkles className="size-3.5 text-accent" aria-hidden />}
                        <span className="text-muted">
                          {["Scored against your profile", "Explaining the match", "Tailoring resume & cover letter", "Specialist verified eligibility", "Submitted — tracking replies"][stage]}
                        </span>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="idle" exit={{ opacity: 0 }} className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="skeleton h-3" style={{ width: `${90 - i * 12}%` }} />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Pipeline */}
        <div className="flex items-center gap-2 overflow-x-auto border-t border-line px-4 py-3 no-scrollbar">
          {STAGES.map((s, i) => {
            const done = i < stage || (i === stage && stage === 4);
            const active = i === stage && stage < 4;
            const human = i >= 3;
            return (
              <div key={s} className="flex shrink-0 items-center gap-2">
                <span
                  className={cn(
                    "grid size-4 place-items-center rounded-full border transition-colors duration-300",
                    done ? "border-accent bg-accent text-white" : active ? (human ? "border-success bg-success-soft" : "border-accent bg-accent-soft") : "border-line-strong",
                  )}
                >
                  {done && <Check className="size-2.5" strokeWidth={3} aria-hidden />}
                </span>
                <span className={cn("text-xs transition-colors duration-300", active ? "text-fg" : done ? "text-muted" : "text-subtle")}>{s}</span>
                {i < STAGES.length - 1 && <span className={cn("h-px w-6 transition-colors duration-500 sm:w-10", i < stage ? "bg-accent/60" : "bg-line-strong")} aria-hidden />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Counter({ to }: { to: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / 600);
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <>{v}</>;
}
