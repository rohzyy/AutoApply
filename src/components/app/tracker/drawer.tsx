"use client";

import { ArrowUpRight, Circle, FileText, Send, Sparkles, UserCheck } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { addNoteAction, moveApplicationAction, setNextStepAction, submitForReviewAction, updateNotesAction } from "@/app/actions/candidate";
import { PipelineStepper, StatusBadge } from "@/components/app/match";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { CompanyMark } from "@/components/ui/marks";
import { Sheet } from "@/components/ui/overlay";
import { SectionLabel } from "@/components/ui/panel";
import { CANDIDATE_TRANSITIONS, REVIEW_STATUS_META, STATUS_META } from "@/lib/domain/constants";
import type { ApplicationEvent, ApplicationWithJob, HumanReview, TailoredDocument } from "@/lib/domain/types";
import { useAction } from "@/lib/hooks/use-action";
import { cn, formatDate, timeAgo } from "@/lib/utils";

export interface DrawerData {
  application: ApplicationWithJob;
  events: ApplicationEvent[];
  review: HumanReview | null;
  document: TailoredDocument | null;
}

const ACTOR = {
  ai: { icon: Sparkles, cls: "text-accent", label: "AI" },
  reviewer: { icon: UserCheck, cls: "text-success", label: "Specialist" },
  candidate: { icon: FileText, cls: "text-muted", label: "You" },
  system: { icon: Circle, cls: "text-subtle", label: "System" },
} as const;

export function ApplicationDrawer({ data }: { data: DrawerData | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const close = () => {
    const sp = new URLSearchParams(params.toString());
    sp.delete("open");
    const q = sp.toString();
    router.push(q ? `${pathname}?${q}` : pathname, { scroll: false });
  };

  if (!data) return null;
  const { application: app, events, review, document } = data;

  return (
    <Sheet
      open
      onOpenChange={(o) => !o && close()}
      title={app.job.title}
      description={
        <span className="flex items-center gap-2">
          {app.job.company.name} <StatusBadge status={app.status} />
        </span>
      }
    >
      <DrawerBody key={app.id + app.updatedAt} app={app} events={events} review={review} document={document} />
    </Sheet>
  );
}

function DrawerBody({ app, events, review, document }: Omit<DrawerData, "application"> & { app: ApplicationWithJob }) {
  const [notes, setNotes] = useState(app.notes);
  const [note, setNote] = useState("");
  const [stepLabel, setStepLabel] = useState(app.nextStep?.label ?? "");
  const [stepAt, setStepAt] = useState(app.nextStep ? app.nextStep.at.slice(0, 10) : "");

  const saveNotes = useAction(updateNotesAction);
  const addNote = useAction(addNoteAction, { successToast: false, onSuccess: () => setNote("") });
  const saveStep = useAction(setNextStepAction);
  const move = useAction(moveApplicationAction);
  const review$ = useAction(submitForReviewAction);

  const targets = CANDIDATE_TRANSITIONS[app.status];
  const canRequestReview = (app.status === "preparing" || app.status === "saved") && document?.status === "approved";

  return (
    <div className="space-y-7 px-5 py-5">
      <div className="flex items-center gap-3">
        <CompanyMark name={app.job.company.name} color={app.job.company.brandColor} />
        <div className="min-w-0 flex-1 text-[13px] text-muted">
          {app.score !== null && <span className="font-medium text-fg">{app.score}% fit · </span>}
          Started {formatDate(app.createdAt, { month: "short", day: "numeric", year: "numeric" })}
          {app.appliedAt && <> · Applied {formatDate(app.appliedAt)}</>}
        </div>
      </div>

      <div className="overflow-x-auto no-scrollbar">
        <PipelineStepper stage={app.stage} className="min-w-[520px]" />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant="secondary">
          <Link href={`/jobs/${app.jobId}`}>
            View role <ArrowUpRight />
          </Link>
        </Button>
        {(app.tailoredDocumentId || app.status === "preparing") && (
          <Button asChild size="sm" variant="secondary">
            <Link href={`/jobs/${app.jobId}/tailor`}>
              <Sparkles /> {document ? `Tailoring v${document.version}` : "Tailor"}
            </Link>
          </Button>
        )}
        {canRequestReview && (
          <Button size="sm" loading={review$.pending} onClick={() => void review$.execute(app.id)}>
            <Send /> Request human review
          </Button>
        )}
        {targets.length > 0 && (
          <Select aria-label="Move to status" className="h-8 w-44 text-[13px]" value="" disabled={move.pending} onChange={(e) => e.target.value && void move.execute(app.id, e.target.value)}>
            <option value="">Move to…</option>
            {targets.map((t) => (
              <option key={t} value={t}>
                {STATUS_META[t].label}
              </option>
            ))}
          </Select>
        )}
      </div>

      {review && (
        <div className={cn("rounded-lg border px-4 py-3", review.status === "changes_requested" ? "border-danger/25 bg-danger-soft" : "border-line bg-surface-2")}>
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-[13px] font-medium">
              <UserCheck className="size-4 text-success" /> Human review
            </p>
            <Badge tone={REVIEW_STATUS_META[review.status].tone}>{REVIEW_STATUS_META[review.status].label}</Badge>
          </div>
          <ul className="mt-3 space-y-1.5">
            {review.checklist.map((c) => (
              <li key={c.key} className={cn("flex items-center gap-2 text-xs", c.done ? "text-muted" : "text-subtle")}>
                <span className={cn("grid size-3.5 place-items-center rounded-sm border", c.done ? "border-success bg-success text-bg" : "border-line-strong")}>{c.done && "✓"}</span>
                {c.label}
              </li>
            ))}
          </ul>
          {review.notes && <p className="mt-3 border-t border-line pt-3 text-xs leading-relaxed text-muted">“{review.notes}”</p>}
        </div>
      )}

      <section>
        <SectionLabel>Next step</SectionLabel>
        <div className="mt-3 grid grid-cols-[1fr_150px] gap-2">
          <Input aria-label="Next step" placeholder="e.g. Technical interview" value={stepLabel} onChange={(e) => setStepLabel(e.target.value)} />
          <Input aria-label="Date" type="date" value={stepAt} onChange={(e) => setStepAt(e.target.value)} />
        </div>
        <div className="mt-2 flex justify-end gap-2">
          {app.nextStep && (
            <Button size="sm" variant="ghost" onClick={() => void saveStep.execute(app.id, "", "").then(() => (setStepLabel(""), setStepAt("")))}>
              Clear
            </Button>
          )}
          <Button size="sm" variant="secondary" loading={saveStep.pending} disabled={!stepLabel.trim() || !stepAt} onClick={() => void saveStep.execute(app.id, stepLabel, stepAt)}>
            Save next step
          </Button>
        </div>
      </section>

      <section>
        <Field label="Private notes" htmlFor="app-notes" hint="Only you can see these.">
          <Textarea id="app-notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-28 text-[13px]" placeholder="Recruiter names, salary discussions, prep ideas…" />
        </Field>
        <div className="mt-2 flex justify-end">
          <Button size="sm" variant="secondary" disabled={notes === app.notes} loading={saveNotes.pending} onClick={() => void saveNotes.execute(app.id, notes)}>
            Save notes
          </Button>
        </div>
      </section>

      <section>
        <SectionLabel>Activity</SectionLabel>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (note.trim()) void addNote.execute(app.id, note.trim());
          }}
        >
          <Input aria-label="Add an update" placeholder="Log an update…" value={note} onChange={(e) => setNote(e.target.value)} />
          <Button type="submit" size="md" variant="secondary" loading={addNote.pending} disabled={!note.trim()}>
            Add
          </Button>
        </form>
        <ol className="mt-4">
          {events.map((e, i) => {
            const a = ACTOR[e.actor];
            return (
              <li key={e.id} className="relative flex gap-3 pb-4 last:pb-0">
                {i < events.length - 1 && <span className="absolute left-[11px] top-6 h-[calc(100%-16px)] w-px bg-line" aria-hidden />}
                <span className="grid size-6 shrink-0 place-items-center rounded-full border border-line bg-surface-2">
                  <a.icon className={cn("size-3", a.cls)} aria-hidden />
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="text-[13px] text-fg">{e.message}</p>
                  <p className="mt-0.5 text-xs text-subtle">
                    {a.label} · {timeAgo(e.createdAt)}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
