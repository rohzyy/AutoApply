"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Plan } from "@/lib/domain/types";
import { cn, formatMoney } from "@/lib/utils";

export function PricingTable({ plans, ctaHref = "/signup" }: { plans: Plan[]; ctaHref?: string }) {
  const [yearly, setYearly] = useState(false);
  const maxSavings = Math.max(...plans.map((p) => (p.priceMonthly ? Math.round((1 - p.priceYearly / (p.priceMonthly * 12)) * 100) : 0)));

  return (
    <div>
      <div className="mb-10 flex justify-center">
        <div role="radiogroup" aria-label="Billing interval" className="relative inline-flex rounded-lg border border-line-strong bg-surface p-1">
          {(["month", "year"] as const).map((k) => {
            const active = (k === "year") === yearly;
            return (
              <button
                key={k}
                role="radio"
                aria-checked={active}
                onClick={() => setYearly(k === "year")}
                className={cn("relative z-10 h-8 rounded-md px-4 text-[13px] font-medium transition-colors", active ? "text-fg" : "text-muted hover:text-fg")}
              >
                {active && <motion.span layoutId="interval" className="absolute inset-0 -z-10 rounded-md bg-surface-3 shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]" />}
                {k === "month" ? "Monthly" : "Annual"}
                {k === "year" && maxSavings > 0 && <span className="ml-1.5 text-success">−{maxSavings}%</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => {
          const price = yearly ? plan.priceYearly / 12 : plan.priceMonthly;
          return (
            <div
              key={plan.id}
              className={cn(
                "relative flex flex-col rounded-xl border p-6 md:p-7",
                plan.highlighted ? "border-accent-line bg-[linear-gradient(180deg,rgb(61_123_255/0.08),transparent_40%)] shadow-[0_0_0_1px_rgb(61_123_255/0.15),0_30px_80px_-30px_rgb(61_123_255/0.35)]" : "border-line bg-surface",
              )}
            >
              {plan.highlighted && <span className="absolute -top-3 left-6 rounded-full border border-accent-line bg-bg px-2.5 py-0.5 text-[11px] font-medium text-[#8FB3FF]">Most chosen</span>}
              <h3 className="text-base font-semibold tracking-tight">{plan.name}</h3>
              <p className="mt-1 min-h-10 text-[13px] text-muted">{plan.tagline}</p>
              <div className="mt-6 flex items-baseline gap-1.5">
                <span className="text-4xl font-semibold tracking-[-0.03em] tabular">{formatMoney(price, plan.currency)}</span>
                <span className="text-sm text-subtle">/ month</span>
              </div>
              <p className="mt-1 h-4 text-xs text-subtle">{yearly ? `${formatMoney(plan.priceYearly, plan.currency)} billed annually` : "Billed monthly · cancel anytime"}</p>
              <Button asChild variant={plan.highlighted ? "primary" : "secondary"} className="mt-6 w-full" size="lg">
                <Link href={`${ctaHref}${ctaHref.includes("?") ? "&" : "?"}plan=${plan.id}`}>Start with {plan.name}</Link>
              </Button>
              <ul className="mt-7 space-y-3 border-t border-line pt-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2.5 text-[13px] text-muted">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-accent" aria-hidden />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
