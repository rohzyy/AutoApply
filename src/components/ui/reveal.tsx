import { cn } from "@/lib/utils";

/**
 * Server-rendered entrance motion (CSS only). Content is visible without JavaScript and
 * respects prefers-reduced-motion through the global stylesheet.
 */
export function Reveal({ delay = 0, className, children }: { delay?: number; y?: number; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("reveal", className)} style={{ ["--delay" as string]: `${Math.round(delay * 1000)}ms` }}>
      {children}
    </div>
  );
}

export function InView({ className, children }: { delay?: number; className?: string; children: React.ReactNode }) {
  return <div className={cn("in-view", className)}>{children}</div>;
}

export function Stagger({ children, className, as = "div" }: { children: React.ReactNode; className?: string; as?: "div" | "ul" }) {
  const Tag = as;
  return <Tag className={cn("stagger", className)}>{children}</Tag>;
}

export function StaggerItem({ children, className, as = "div" }: { children: React.ReactNode; className?: string; as?: "div" | "li" }) {
  const Tag = as;
  return <Tag className={className}>{children}</Tag>;
}
