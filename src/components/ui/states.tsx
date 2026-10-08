import { cn } from "@/lib/utils";

export function EmptyState({ icon, title, description, action, className }: { icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      {icon && <div className="mb-4 grid size-10 place-items-center rounded-lg border border-line-strong bg-surface-2 text-muted [&_svg]:size-[18px]">{icon}</div>}
      <p className="text-sm font-medium text-fg">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[13px] text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function InlineError({ title = "Something went wrong", message, action }: { title?: string; message: string; action?: React.ReactNode }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-lg border border-danger/25 bg-danger-soft px-4 py-3">
      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-danger" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-fg">{title}</p>
        <p className="mt-0.5 text-[13px] text-muted">{message}</p>
      </div>
      {action}
    </div>
  );
}
