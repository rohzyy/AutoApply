"use client";

import { Check, CheckCircle2, Send, UserPlus, XCircle } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { claimReviewAction, completeReviewAction, markSubmittedAction, toggleChecklistAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/input";
import type { HumanReview } from "@/lib/domain/types";
import { useAction } from "@/lib/hooks/use-action";
import { cn } from "@/lib/utils";

export function ReviewControls({ review, viewerId, viewerRole, applicationId, applicationStatus }: { review: HumanReview; viewerId: string; viewerRole: string; applicationId: string; applicationStatus: string }) {
  const [, start] = useTransition();
  const [checklist, toggleOptimistic] = useOptimistic(review.checklist, (s, u: { key: string; done: boolean }) => s.map((c) => (c.key === u.key ? { ...c, done: u.done } : c)));
  const [notes, setNotes] = useState(review.notes);
  const claim = useAction(claimReviewAction);
  const complete = useAction(completeReviewAction);
  const submit = useAction(markSubmittedAction);

  const mine = review.reviewerId === viewerId;
  const editable = review.status === "in_review" && mine;
  const canComplete = review.status === "in_review" && (mine || viewerRole === "admin");
  const allDone = checklist.every((c) => c.done);

  const toggle = (key: string, done: boolean) =>
    start(async () => {
      toggleOptimistic({ key, done });
      const res = await toggleChecklistAction(review.id, key, done);
      if (!res.ok) toast.error(res.error);
    });

  return (
    <div className="space-y-5">
      {review.status === "queued" && (
        <Button className="w-full" loading={claim.pending} onClick={() => void claim.execute(review.id)}>
          <UserPlus /> Claim this review
        </Button>
      )}

      <fieldset disabled={!editable}>
        <legend className="mb-3 text-[13px] font-medium">Checklist {!editable && review.status === "in_review" && <span className="font-normal text-subtle">· claimed by another reviewer</span>}</legend>
        <ul className="space-y-1.5">
          {checklist.map((c) => (
            <li key={c.key}>
              <label className={cn("flex items-center gap-3 rounded-md border px-3 py-2.5 text-[13px] transition-colors", c.done ? "border-success/25 bg-success-soft/50 text-fg" : "border-line text-muted", editable && "cursor-pointer hover:border-line-strong")}>
                <input type="checkbox" checked={c.done} onChange={(e) => toggle(c.key, e.target.checked)} className="sr-only" />
                <span className={cn("grid size-4 shrink-0 place-items-center rounded border transition-colors", c.done ? "border-success bg-success text-bg" : "border-line-strong")} aria-hidden>
                  {c.done && <Check className="size-3" strokeWidth={3} />}
                </span>
                {c.label}
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      {(canComplete || review.notes) && (
        <Field label="Notes for the candidate" htmlFor="review-notes" hint={canComplete ? "Required when requesting changes." : undefined}>
          <Textarea id="review-notes" value={notes} onChange={(e) => setNotes(e.target.value)} readOnly={!canComplete} className="min-h-24 text-[13px]" placeholder="What's strong, what to fix…" />
        </Field>
      )}

      {canComplete && (
        <div className="grid gap-2 sm:grid-cols-2">
          <Button variant="danger" loading={complete.pending} onClick={() => void complete.execute(review.id, "changes_requested", notes)}>
            <XCircle /> Request changes
          </Button>
          <Button disabled={!allDone} loading={complete.pending} onClick={() => void complete.execute(review.id, "approved", notes)}>
            <CheckCircle2 /> Approve
          </Button>
        </div>
      )}
      {canComplete && !allDone && <p className="text-center text-xs text-subtle">Complete every checklist item to approve.</p>}

      {review.status === "approved" && applicationStatus === "human_review" && (
        <div className="rounded-lg border border-success/25 bg-success-soft/40 p-4">
          <p className="text-[13px] font-medium text-success">Approved — ready to submit</p>
          <p className="mt-1 text-xs text-muted">Submit through the employer&apos;s portal, then record it here so the candidate is notified.</p>
          <Button className="mt-3 w-full" loading={submit.pending} onClick={() => void submit.execute(applicationId)}>
            <Send /> Mark as submitted
          </Button>
        </div>
      )}
    </div>
  );
}
