"use client";

import { X } from "lucide-react";
import { Dialog as D, DropdownMenu as DM, Popover as P, Tooltip as T } from "radix-ui";
import { cn } from "@/lib/utils";

/* ---------- Dialog ---------- */

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

export function DialogContent({ title, description, children, className }: { title: string; description?: string; children: React.ReactNode; className?: string }) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] data-[state=open]:animate-[fade-in_150ms_ease-out]" />
      <D.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-[calc(100vw-32px)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-line-strong bg-surface p-6 shadow-[0_24px_80px_rgb(0_0_0/0.6)] focus:outline-none data-[state=open]:animate-[dialog-in_180ms_var(--ease-out)]",
          className,
        )}
      >
        <D.Title className="text-base font-semibold tracking-tight">{title}</D.Title>
        {description ? <D.Description className="mt-1 text-sm text-muted">{description}</D.Description> : <D.Description className="sr-only">{title}</D.Description>}
        <div className="mt-5">{children}</div>
        <D.Close className="absolute right-4 top-4 rounded-md p-1 text-subtle transition-colors hover:bg-surface-2 hover:text-fg" aria-label="Close">
          <X className="size-4" />
        </D.Close>
      </D.Content>
    </D.Portal>
  );
}

/* ---------- Sheet (side drawer; bottom sheet on mobile) ---------- */

export function Sheet({ open, onOpenChange, title, description, children, width = "max-w-xl" }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; description?: React.ReactNode; children: React.ReactNode; width?: string }) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-[fade-in_150ms_ease-out]" />
        <D.Content
          className={cn(
            "fixed z-50 flex flex-col border-line-strong bg-surface shadow-[0_24px_80px_rgb(0_0_0/0.6)] focus:outline-none",
            "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-2xl border-t data-[state=open]:animate-[sheet-up_280ms_var(--ease-out)] md:data-[state=open]:animate-[sheet-left_280ms_var(--ease-out)]",
            "md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-full md:rounded-none md:border-l md:border-t-0",
            width,
          )}
        >
          <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-white/15 md:hidden" aria-hidden />
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div className="min-w-0">
              <D.Title className="truncate text-base font-semibold tracking-tight">{title}</D.Title>
              {description ? <D.Description asChild><div className="mt-0.5 text-[13px] text-muted">{description}</div></D.Description> : <D.Description className="sr-only">{title}</D.Description>}
            </div>
            <D.Close className="rounded-md p-1 text-subtle transition-colors hover:bg-surface-2 hover:text-fg" aria-label="Close">
              <X className="size-4" />
            </D.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

/* ---------- Dropdown ---------- */

export const Menu = DM.Root;
export const MenuTrigger = DM.Trigger;

export function MenuContent({ children, align = "end", className }: { children: React.ReactNode; align?: "start" | "end" | "center"; className?: string }) {
  return (
    <DM.Portal>
      <DM.Content
        align={align}
        sideOffset={6}
        className={cn("z-50 min-w-48 rounded-lg border border-line-strong bg-surface-2 p-1 shadow-[0_16px_48px_rgb(0_0_0/0.55)] data-[state=open]:animate-[pop-in_140ms_ease-out]", className)}
      >
        {children}
      </DM.Content>
    </DM.Portal>
  );
}

export function MenuItem({ children, className, ...props }: React.ComponentProps<typeof DM.Item>) {
  return (
    <DM.Item
      className={cn(
        "flex cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] text-muted outline-none data-[highlighted]:bg-surface-3 data-[highlighted]:text-fg data-[disabled]:pointer-events-none data-[disabled]:opacity-40 [&_svg]:size-4",
        className,
      )}
      {...props}
    >
      {children}
    </DM.Item>
  );
}

export const MenuSeparator = () => <DM.Separator className="my-1 h-px bg-line" />;
export const MenuLabel = ({ children }: { children: React.ReactNode }) => <DM.Label className="px-2.5 py-1.5 text-xs text-subtle">{children}</DM.Label>;

/* ---------- Popover ---------- */

export const Popover = P.Root;
export const PopoverTrigger = P.Trigger;
export function PopoverContent({ children, className, align = "end" }: { children: React.ReactNode; className?: string; align?: "start" | "end" | "center" }) {
  return (
    <P.Portal>
      <P.Content align={align} sideOffset={8} className={cn("z-50 w-80 rounded-xl border border-line-strong bg-surface-2 shadow-[0_16px_48px_rgb(0_0_0/0.55)] focus:outline-none data-[state=open]:animate-[pop-in_140ms_ease-out]", className)}>
        {children}
      </P.Content>
    </P.Portal>
  );
}

/* ---------- Tooltip ---------- */

export const TooltipProvider = T.Provider;

export function Tooltip({ content, children, side = "top" }: { content: React.ReactNode; children: React.ReactNode; side?: "top" | "bottom" | "left" | "right" }) {
  return (
    <T.Root delayDuration={250}>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content side={side} sideOffset={6} className="z-50 max-w-64 rounded-md border border-line-strong bg-surface-3 px-2.5 py-1.5 text-xs text-fg shadow-lg">
          {content}
        </T.Content>
      </T.Portal>
    </T.Root>
  );
}
