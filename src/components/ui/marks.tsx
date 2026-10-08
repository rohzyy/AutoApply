import { cn, initials } from "@/lib/utils";

export function Logo({ className, wordmark = true }: { className?: string; wordmark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg viewBox="0 0 28 28" className="size-7" aria-hidden>
        <rect x="0.5" y="0.5" width="27" height="27" rx="7" fill="#0C0D10" stroke="rgb(255 255 255 / 0.14)" />
        <path d="M8 19.5 13.2 8.5h1.6L20 19.5" fill="none" stroke="#EDEEF0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10.6 15.2h5.2l2.7-2.7" fill="none" stroke="#3D7BFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {wordmark && <span className="text-[15px] font-semibold tracking-[-0.02em] text-fg">AutoApply</span>}
    </span>
  );
}

/** Company monogram tinted with the company's brand colour at low opacity. */
export function CompanyMark({ name, color, size = "md", className }: { name: string; color: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const dims = { sm: "size-7 text-[11px] rounded-md", md: "size-9 text-xs rounded-lg", lg: "size-12 text-sm rounded-xl" }[size];
  return (
    <span
      className={cn("inline-grid shrink-0 place-items-center border font-semibold tracking-tight", dims, className)}
      style={{ color, background: `color-mix(in srgb, ${color} 12%, #0C0D10)`, borderColor: `color-mix(in srgb, ${color} 28%, transparent)` }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span className={cn("inline-grid size-8 shrink-0 place-items-center rounded-full border border-line-strong bg-surface-3 text-[11px] font-semibold text-fg", className)} aria-hidden>
      {initials(name)}
    </span>
  );
}

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return <kbd className={cn("inline-flex h-5 min-w-5 items-center justify-center rounded border border-line-strong bg-surface-2 px-1 font-mono text-[10px] text-subtle", className)}>{children}</kbd>;
}
