import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const base =
  "w-full rounded-md border border-line-strong bg-surface-2 px-3 text-sm text-fg placeholder:text-subtle transition-[border-color,box-shadow] duration-150 hover:border-white/20 focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)] focus:outline-none disabled:opacity-50 aria-[invalid=true]:border-danger/60 aria-[invalid=true]:focus:shadow-[0_0_0_3px_var(--danger-soft)]";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(base, "h-9", className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(base, "min-h-24 py-2 leading-relaxed", className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...props }, ref) {
  return (
    <div className="relative">
      <select ref={ref} className={cn(base, "h-9 appearance-none pr-8", className)} {...props}>
        {children}
      </select>
      <svg className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-subtle" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
});

interface FieldProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  className?: string;
  children: React.ReactNode;
}

/** Visible label, helper text and an inline error tied to the control via aria-describedby. */
export function Field({ label, htmlFor, hint, error, optional, className, children }: FieldProps) {
  const describedBy = htmlFor ? `${htmlFor}-${error ? "error" : "hint"}` : undefined;
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="flex items-baseline justify-between text-[13px] font-medium text-fg">
        {label}
        {optional && <span className="text-xs font-normal text-subtle">Optional</span>}
      </label>
      {children}
      {error ? (
        <p id={describedBy} role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={describedBy} className="text-xs text-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
