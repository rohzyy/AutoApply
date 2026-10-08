import type { Tone } from "@/lib/domain/constants";
import { cn } from "@/lib/utils";

const TONES: Record<Tone, string> = {
  neutral: "border-line-strong bg-surface-2 text-muted",
  accent: "border-accent-line bg-accent-soft text-[#8FB3FF]",
  success: "border-success/25 bg-success-soft text-success",
  warning: "border-warning/25 bg-warning-soft text-warning",
  danger: "border-danger/25 bg-danger-soft text-danger",
};

const DOTS: Record<Tone, string> = {
  neutral: "bg-subtle",
  accent: "bg-accent",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

export function Badge({ tone = "neutral", dot, pulse, className, children }: { tone?: Tone; dot?: boolean; pulse?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-[5px] border px-2 text-xs font-medium", TONES[tone], className)}>
      {dot && <span className={cn("size-1.5 rounded-full", DOTS[tone], pulse && "animate-pulse-dot")} aria-hidden />}
      {children}
    </span>
  );
}

export function Dot({ tone = "neutral", className }: { tone?: Tone; className?: string }) {
  return <span className={cn("inline-block size-1.5 shrink-0 rounded-full", DOTS[tone], className)} aria-hidden />;
}
