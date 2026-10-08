"use client";

import { Play, RotateCcw, Search, Zap } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { retryJobAction, runWorkerAction, triggerIngestionAction, updatePlanAction } from "@/app/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { Switch } from "@/components/ui/switch";
import type { Plan } from "@/lib/domain/types";
import { useAction } from "@/lib/hooks/use-action";

export function SearchBox({ placeholder }: { placeholder: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [pending, start] = useTransition();
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const sp = new URLSearchParams(params.toString());
        if (q.trim()) sp.set("q", q.trim());
        else sp.delete("q");
        start(() => router.replace(`${pathname}?${sp.toString()}`));
      }}
      className="relative w-full max-w-sm"
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} className="pl-9" aria-label={placeholder} aria-busy={pending} />
    </form>
  );
}

export function IngestButton({ source }: { source: string }) {
  const { execute, pending } = useAction(triggerIngestionAction);
  return (
    <Button size="sm" variant="secondary" loading={pending} onClick={() => void execute(source)}>
      <Play /> Run
    </Button>
  );
}

export function RunWorkerButton() {
  const { execute, pending } = useAction(runWorkerAction, { successToast: false });
  return (
    <Button
      size="sm"
      loading={pending}
      onClick={async () => {
        const res = await execute();
        if (res.ok) {
          const { toast } = await import("sonner");
          toast.success(res.data.processed ? `Processed ${res.data.processed} job${res.data.processed > 1 ? "s" : ""}${res.data.failed ? `, ${res.data.failed} failed` : ""}` : "Queue is empty");
        }
      }}
    >
      <Zap /> Drain queue now
    </Button>
  );
}

export function RetryJobButton({ id }: { id: string }) {
  const { execute, pending } = useAction(retryJobAction);
  return (
    <Button size="sm" variant="ghost" loading={pending} onClick={() => void execute(id)}>
      <RotateCcw /> Retry
    </Button>
  );
}

export function PlanEditor({ plan, canEdit }: { plan: Plan; canEdit: boolean }) {
  const [p, setP] = useState(plan);
  const [features, setFeatures] = useState(plan.features.join("\n"));
  const save = useAction(updatePlanAction);
  const dirty = JSON.stringify({ ...p, features: features.split("\n").map((f) => f.trim()).filter(Boolean) }) !== JSON.stringify(plan);

  return (
    <Panel className="flex flex-col">
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <p className="text-sm font-semibold">{plan.name}</p>
        <div className="flex items-center gap-2">
          {p.highlighted && <Badge tone="accent">Highlighted</Badge>}
          {!p.active && <Badge tone="danger">Hidden</Badge>}
        </div>
      </div>
      <fieldset disabled={!canEdit} className="flex-1 space-y-4 p-5">
        <Field label="Name" htmlFor={`${plan.id}-name`}>
          <Input id={`${plan.id}-name`} value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} />
        </Field>
        <Field label="Tagline" htmlFor={`${plan.id}-tag`}>
          <Input id={`${plan.id}-tag`} value={p.tagline} onChange={(e) => setP({ ...p, tagline: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={`Monthly (${p.currency})`} htmlFor={`${plan.id}-m`}>
            <Input id={`${plan.id}-m`} type="number" min={0} value={p.priceMonthly} onChange={(e) => setP({ ...p, priceMonthly: Number(e.target.value) })} />
          </Field>
          <Field label={`Yearly (${p.currency})`} htmlFor={`${plan.id}-y`}>
            <Input id={`${plan.id}-y`} type="number" min={0} value={p.priceYearly} onChange={(e) => setP({ ...p, priceYearly: Number(e.target.value) })} />
          </Field>
        </div>
        <Field label="Features" htmlFor={`${plan.id}-f`} hint="One per line">
          <Textarea id={`${plan.id}-f`} value={features} onChange={(e) => setFeatures(e.target.value)} className="min-h-32 text-[13px]" />
        </Field>
        <div className="flex items-center justify-between text-[13px]">
          <label htmlFor={`${plan.id}-hl`}>Highlight on pricing page</label>
          <Switch id={`${plan.id}-hl`} checked={p.highlighted} onCheckedChange={(v) => setP({ ...p, highlighted: v })} />
        </div>
        <div className="flex items-center justify-between text-[13px]">
          <label htmlFor={`${plan.id}-act`}>Available for purchase</label>
          <Switch id={`${plan.id}-act`} checked={p.active} onCheckedChange={(v) => setP({ ...p, active: v })} />
        </div>
      </fieldset>
      {canEdit && (
        <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
          {dirty && (
            <Button size="sm" variant="ghost" onClick={() => (setP(plan), setFeatures(plan.features.join("\n")))}>
              Discard
            </Button>
          )}
          <Button
            size="sm"
            disabled={!dirty}
            loading={save.pending}
            onClick={() =>
              void save.execute(plan.id, {
                name: p.name,
                tagline: p.tagline,
                priceMonthly: p.priceMonthly,
                priceYearly: p.priceYearly,
                features: features.split("\n").map((f) => f.trim()).filter(Boolean),
                highlighted: p.highlighted,
                active: p.active,
              })
            }
          >
            Publish changes
          </Button>
        </div>
      )}
    </Panel>
  );
}
