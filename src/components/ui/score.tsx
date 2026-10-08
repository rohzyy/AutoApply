import { cn } from "@/lib/utils";

export function scoreTone(score: number) {
  if (score >= 85) return { stroke: "var(--success)", text: "text-success", label: "Excellent fit" };
  if (score >= 70) return { stroke: "var(--accent)", text: "text-[#8FB3FF]", label: "Strong fit" };
  if (score >= 55) return { stroke: "var(--warning)", text: "text-warning", label: "Partial fit" };
  return { stroke: "var(--subtle)", text: "text-muted", label: "Low fit" };
}

/** Fit score: a thin arc with the number set in tabular figures. Colour is never the only signal. */
export function ScoreRing({ score, size = 44, className, label = true }: { score: number; size?: number; className?: string; label?: boolean }) {
  const stroke = 3;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const tone = scoreTone(score);
  return (
    <div className={cn("relative inline-grid shrink-0 place-items-center", className)} style={{ width: size, height: size }} role="img" aria-label={`${score}% fit — ${tone.label}`}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone.stroke}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      {label && <span className={cn("absolute font-semibold tabular", size >= 56 ? "text-lg" : "text-[13px]")}>{score}</span>}
    </div>
  );
}

export function ScoreBar({ value, tone = "accent", className }: { value: number; tone?: "accent" | "success" | "warning" | "danger" | "neutral"; className?: string }) {
  const color = { accent: "bg-accent", success: "bg-success", warning: "bg-warning", danger: "bg-danger", neutral: "bg-subtle" }[tone];
  return (
    <div className={cn("h-1 w-full overflow-hidden rounded-full bg-white/[0.06]", className)} aria-hidden>
      <div className={cn("h-full rounded-full transition-[width] duration-700 ease-out", color)} style={{ width: `${Math.max(2, value)}%` }} />
    </div>
  );
}
