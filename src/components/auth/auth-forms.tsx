"use client";

import { ArrowRight, Eye, EyeOff, LayoutDashboard, MailCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { demoAction, googleAction, signInAction, signUpAction, type AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { InlineError } from "@/components/ui/states";

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" loading={pending}>
      {children}
    </Button>
  );
}

function PasswordInput({ id, invalid, autoComplete }: { id: string; invalid?: boolean; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input id={id} name="password" type={show ? "text" : "password"} autoComplete={autoComplete} required aria-invalid={invalid || undefined} aria-describedby={`${id}-${invalid ? "error" : "hint"}`} className="h-10 pr-10" />
      <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-1 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-subtle hover:text-fg" aria-label={show ? "Hide password" : "Show password"}>
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

const fieldError = (state: AuthState, key: string) => (state && !state.ok ? state.fieldErrors?.[key]?.[0] : undefined);

function GoogleButton({ next }: { next?: string }) {
  return (
    <form action={googleAction}>
      <input type="hidden" name="next" value={next ?? ""} />
      <GoogleSubmit />
    </form>
  );
}

function GoogleSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" size="lg" className="w-full" loading={pending}>
      <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
        <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.3 12 2.3 6.7 2.3 2.4 6.6 2.4 12s4.3 9.7 9.6 9.7c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z" />
      </svg>
      Continue with Google
    </Button>
  );
}

function Divider() {
  return (
    <div className="my-6 flex items-center gap-3 text-xs text-subtle">
      <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
    </div>
  );
}

function DemoAccounts() {
  return (
    <div className="mt-8 rounded-xl border border-line bg-surface p-4">
      <p className="text-[13px] font-medium text-fg">Explore with demo data</p>
      <p className="mt-0.5 text-xs text-muted">Pre-loaded profile, matches and applications. No password needed.</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <form action={demoAction}>
          <input type="hidden" name="who" value="candidate" />
          <DemoButton icon={<UserRound />} label="Candidate" />
        </form>
        <form action={demoAction}>
          <input type="hidden" name="who" value="admin" />
          <DemoButton icon={<LayoutDashboard />} label="Operations" />
        </form>
      </div>
    </div>
  );
}

function DemoButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" className="w-full" loading={pending}>
      {icon}
      {label}
    </Button>
  );
}

export function SignInForm({ next, demo, googleError }: { next?: string; demo: boolean; googleError?: boolean }) {
  const [state, action] = useActionState(signInAction, null);
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-[-0.025em]">Welcome back</h1>
      <p className="mt-1.5 text-sm text-muted">Sign in to your career command center.</p>

      <div className="mt-8">
        {!demo && <GoogleButton next={next} />}
        {!demo && <Divider />}
        {googleError && <div className="mb-4"><InlineError title="Google sign-in unavailable" message="Try email and password, or a demo account." /></div>}
        <form action={action} className="space-y-4" noValidate>
          <input type="hidden" name="next" value={next ?? ""} />
          {state && !state.ok && !state.fieldErrors && <InlineError title="Couldn't sign you in" message={state.error} />}
          <Field label="Email" htmlFor="email" error={fieldError(state, "email")}>
            <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state?.values?.email} aria-invalid={!!fieldError(state, "email") || undefined} className="h-10" />
          </Field>
          <Field label="Password" htmlFor="password" error={fieldError(state, "password")}>
            <PasswordInput id="password" autoComplete="current-password" invalid={!!fieldError(state, "password")} />
          </Field>
          <SubmitButton>
            Sign in <ArrowRight />
          </SubmitButton>
        </form>
      </div>

      {demo && <DemoAccounts />}

      <p className="mt-8 text-center text-sm text-muted">
        New to AutoApply?{" "}
        <Link href="/signup" className="font-medium text-fg underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}

export function SignUpForm({ demo, plan }: { demo: boolean; plan?: string }) {
  const [state, action] = useActionState(signUpAction, null);

  if (state?.ok && state.data.needsConfirmation) {
    return (
      <div className="text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-xl border border-line-strong bg-surface-2">
          <MailCheck className="size-5 text-accent" />
        </div>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">Check your inbox</h1>
        <p className="mt-2 text-sm text-muted">
          We sent a confirmation link to <span className="text-fg">{state.values?.email}</span>. Open it on this device to continue to onboarding.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-[-0.025em]">Create your account</h1>
      <p className="mt-1.5 text-sm text-muted">
        {plan ? `You picked ${plan[0]!.toUpperCase()}${plan.slice(1)}. ` : ""}Five minutes to your first ranked matches.
      </p>
      <div className="mt-8">
        {!demo && <GoogleButton next="/onboarding" />}
        {!demo && <Divider />}
        <form action={action} className="space-y-4" noValidate>
          {state && !state.ok && !state.fieldErrors && <InlineError title="Couldn't create your account" message={state.error} />}
          <Field label="Full name" htmlFor="fullName" error={fieldError(state, "fullName")}>
            <Input id="fullName" name="fullName" autoComplete="name" required defaultValue={state?.values?.fullName} aria-invalid={!!fieldError(state, "fullName") || undefined} className="h-10" />
          </Field>
          <Field label="Email" htmlFor="email" error={fieldError(state, "email")}>
            <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state?.values?.email} aria-invalid={!!fieldError(state, "email") || undefined} className="h-10" />
          </Field>
          <Field label="Password" htmlFor="password" hint="At least 10 characters, with a letter and a number." error={fieldError(state, "password")}>
            <PasswordInput id="password" autoComplete="new-password" invalid={!!fieldError(state, "password")} />
          </Field>
          <SubmitButton>
            Create account <ArrowRight />
          </SubmitButton>
        </form>
        <p className="mt-4 text-center text-xs text-subtle">By continuing you agree to the Terms and acknowledge the Privacy Policy.</p>
      </div>
      {demo && <DemoAccounts />}
      <p className="mt-8 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-fg underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
