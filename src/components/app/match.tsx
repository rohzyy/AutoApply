import { Check, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import { Badge, Dot } from "@/components/ui/badge";
import { ScoreBar } from "@/components/ui/score";
import { RATING_META, STAGE_META, STATUS_META } from "@/lib/domain/constants";
import { PIPELINE_STAGES, type ApplicationStatus, type Eligibility, type MatchFactor, type PipelineStage } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

/** "Skills: Strong · Experience: Strong · Eligibility: Eligible · Location: Aligned" — compact chips. */
export function FactorChips({ factors, limit = 4, className }: { factors: MatchFactor[]; limit?: number; className?: string }) {
  const label = (f: MatchFactor) => {
    if (f.key === "eligibility") return f.rating === "strong" ? "Eligible" : f.rating === "blocked" ? "Not eligible" : "Via sponsorship";
    if (f.key === "location") return f.rating === "strong" ? "Aligned" : f.rating === "moderate" ? "Relocation" : "Mismatch";
    return RATING_META[f.rating].label;
  };
  return (
    <ul className={cn("flex flex-wrap gap-x-4 gap-y-1.5", className)} aria-label="Match factors">
      {factors.slice(0, limit).map((f) => (
        <li key={f.key} className="flex items-center gap-1.5 text-xs text-muted">
          <Dot tone={RATING_META[f.rating].tone} />
          <span className="text-subtle">{f.label}:</span>
          <span className="text-fg/90">{label(f)}</span>
        </li>
      ))}
    </ul>
  );
}

/** Full explainable breakdown: weight, score bar and a human-readable reason for each factor. */
export function FactorBreakdown({ factors }: { factors: MatchFactor[] }) {
  return (
    <ul className="divide-y divide-line">
      {factors.map((f) => {
        const meta = RATING_META[f.rating];
        return (
          <li key={f.key} className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 py-3.5 first:pt-0 last:pb-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-fg">{f.label}</span>
              <span className="font-mono text-[11px] text-subtle">{Math.round(f.weight * 100)}% weight</span>
            </div>
            <Badge tone={meta.tone}>{meta.label}</Badge>
            <ScoreBar value={f.score} tone={meta.tone === "neutral" ? "neutral" : meta.tone} className="col-span-2" />
            <p className="col-span-2 text-[13px] leading-relaxed text-muted">{f.reason}</p>
          </li>
        );
      })}
    </ul>
  );
}

export function EligibilityBadge({ eligibility }: { eligibility: Eligibility }) {
  if (eligibility === "eligible")
    return (
      <Badge tone="success">
        <ShieldCheck className="size-3" aria-hidden /> Eligible
      </Badge>
    );
  if (eligibility === "needs_sponsorship")
    return (
      <Badge tone="warning">
        <ShieldQuestion className="size-3" aria-hidden /> Needs sponsorship
      </Badge>
    );
  return (
    <Badge tone="danger">
      <ShieldAlert className="size-3" aria-hidden /> Not eligible
    </Badge>
  );
}

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  const meta = STATUS_META[status];
  return (
    <Badge tone={meta.tone} dot pulse={status === "human_review"}>
      {meta.label}
    </Badge>
  );
}

/** AI discovered → AI matched → AI tailored → Human reviewed → Applied */
export function PipelineStepper({ stage, compact, className }: { stage: PipelineStage; compact?: boolean; className?: string }) {
  const current = PIPELINE_STAGES.indexOf(stage);
  return (
    <ol className={cn("flex items-center", className)} aria-label={`Pipeline: ${STAGE_META[stage].label}`}>
      {PIPELINE_STAGES.map((s, i) => {
        const done = i < current;
        const active = i === current;
        const human = s === "reviewed" || s === "applied";
        return (
          <li key={s} className={cn("flex items-center", i < PIPELINE_STAGES.length - 1 && "flex-1")}>
            <div className="flex items-center gap-2" aria-current={active ? "step" : undefined}>
              <span
                className={cn(
                  "grid size-[18px] shrink-0 place-items-center rounded-full border text-[9px] font-semibold transition-colors",
                  done && "border-accent bg-accent text-white",
                  active && (human ? "border-success bg-success-soft text-success" : "border-accent bg-accent-soft text-[#8FB3FF]"),
                  !done && !active && "border-line-strong text-subtle",
                )}
              >
                {done ? <Check className="size-2.5" strokeWidth={3} aria-hidden /> : i + 1}
              </span>
              {!compact && (
                <span className={cn("whitespace-nowrap text-xs", active ? "font-medium text-fg" : done ? "text-muted" : "text-subtle")}>
                  {STAGE_META[s].label}
                </span>
              )}
            </div>
            {i < PIPELINE_STAGES.length - 1 && <span className={cn("mx-2 h-px min-w-3 flex-1", done ? "bg-accent/60" : "bg-line-strong")} aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}
