"use client";

import { motion } from "framer-motion";
import { Check, CheckCircle2, CircleDashed, Lightbulb, Lock, RefreshCw, Send, Sparkles, UserCheck, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { approveTailoringAction, decideBulletAction, generateTailoringAction, saveCoverLetterAction, submitForReviewAction } from "@/app/actions/candidate";
import { PipelineStepper } from "@/components/app/match";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Panel, PanelHeader, SectionLabel } from "@/components/ui/panel";
import { REVIEW_STATUS_META } from "@/lib/domain/constants";
import type { ApplicationStatus, BulletSuggestion, HumanReview, PipelineStage, TailoredDocument } from "@/lib/domain/types";
import { useAction } from "@/lib/hooks/use-action";
import { cn, timeAgo } from "@/lib/utils";

type Tab = "resume" | "cover" | "skills" | "advice";

interface Props {
  doc: TailoredDocument;
  jobId: string;
  applicationId: string | null;
  applicationStatus: ApplicationStatus | null;
  stage: PipelineStage;
  review: HumanReview | null;
}

export function TailoringWorkspace({ doc, jobId, applicationId, applicationStatus, stage, review }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("resume");
  const [, startTransition] = useTransition();
  const [bullets, setBulletOptimistic] = useOptimistic(doc.bullets, (state: BulletSuggestion[], u: { id: string; decision: BulletSuggestion["decision"] }) =>
    state.map((b) => (b.id === u.id ? { ...b, decision: u.decision } : b)),
  );
  const [cover, setCover] = useState(doc.coverLetter);
  const approved = doc.status === "approved";
  const decided = bullets.filter((b) => b.decision !== "pending").length;
  const accepted = bullets.filter((b) => b.decision === "accepted").length;
  const allDecided = decided === bullets.length;
  const coverDirty = cover !== doc.coverLetter;

  const regenerate = useAction(generateTailoringAction, { onSuccess: () => router.refresh() });
  const approve = useAction(approveTailoringAction);
  const saveCover = useAction(saveCoverLetterAction);
  const requestReview = useAction(submitForReviewAction);

  const decide = (b: BulletSuggestion, decision: BulletSuggestion["decision"]) => {
    if (approved) return;
    startTransition(async () => {
      setBulletOptimistic({ id: b.id, decision });
      const res = await decideBulletAction(doc.id, b.id, decision);
      if (!res.ok) toast.error(res.error);
    });
  };

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "resume", label: "Resume", count: bullets.length },
    { key: "cover", label: "Cover letter" },
    { key: "skills", label: "Skill alignment", count: doc.skillAlignment.length },
    { key: "advice", label: "Improvements", count: doc.recommendations.length },
  ];

  const inReview = applicationStatus === "human_review";
  const pastReview = applicationStatus && !["saved", "preparing", "human_review"].includes(applicationStatus);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
        <div role="tablist" aria-label="Tailoring sections" className="mb-4 flex gap-1 overflow-x-auto border-b border-line no-scrollbar">
          {tabs.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              aria-controls={`panel-${t.key}`}
              onClick={() => setTab(t.key)}
              className={cn("relative flex h-10 shrink-0 items-center gap-1.5 px-3 text-[13px] transition-colors", tab === t.key ? "text-fg" : "text-muted hover:text-fg")}
            >
              {t.label}
              {t.count !== undefined && <span className="rounded bg-surface-3 px-1.5 text-[11px] tabular text-subtle">{t.count}</span>}
              {tab === t.key && <motion.span layoutId="tailor-tab" className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent" />}
            </button>
          ))}
        </div>

        <div key={tab} id={`panel-${tab}`} role="tabpanel" className="reveal" style={{ ["--rise" as string]: "4px" }}>
            {tab === "resume" && (
              <div className="space-y-4">
                <Panel>
                  <PanelHeader title="Tailored summary" description="Opens your resume for this role" />
                  <p className="px-5 py-4 text-sm leading-relaxed text-fg/90">{doc.summary}</p>
                </Panel>
                {bullets.length === 0 ? (
                  <Panel className="px-5 py-8 text-center text-sm text-muted">Your bullets already read well for this role — no rewrites suggested.</Panel>
                ) : (
                  <ul className="space-y-3">
                    {bullets.map((b, i) => (
                      <li key={b.id}>
                        <Panel className={cn("transition-colors", b.decision === "accepted" && "border-success/25", b.decision === "rejected" && "opacity-70")}>
                          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-2.5">
                            <span className="font-mono text-[11px] text-subtle">Suggestion {i + 1}</span>
                            {b.decision === "pending" ? <Badge>Needs your decision</Badge> : b.decision === "accepted" ? <Badge tone="success">Accepted</Badge> : <Badge tone="neutral">Kept original</Badge>}
                          </div>
                          <div className="grid gap-px bg-line md:grid-cols-2">
                            <div className="bg-surface px-5 py-4">
                              <SectionLabel>Original</SectionLabel>
                              <p className={cn("mt-2 text-[13px] leading-relaxed", b.decision === "accepted" ? "text-subtle line-through decoration-white/20" : "text-muted")}>{b.original}</p>
                            </div>
                            <div className="bg-surface px-5 py-4">
                              <SectionLabel className="text-accent">Suggested</SectionLabel>
                              <p className={cn("mt-2 text-[13px] leading-relaxed", b.decision === "rejected" ? "text-subtle line-through decoration-white/20" : "text-fg")}>{b.suggested}</p>
                            </div>
                          </div>
                          <div className="flex flex-col gap-3 border-t border-line px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="flex gap-2 text-xs leading-relaxed text-muted">
                              <Sparkles className="mt-0.5 size-3.5 shrink-0 text-accent" aria-hidden /> {b.reason}
                            </p>
                            {!approved && (
                              <div className="flex shrink-0 gap-2" role="group" aria-label={`Decision for suggestion ${i + 1}`}>
                                <Button size="sm" variant={b.decision === "rejected" ? "secondary" : "ghost"} onClick={() => decide(b, b.decision === "rejected" ? "pending" : "rejected")} aria-pressed={b.decision === "rejected"}>
                                  <X /> Keep original
                                </Button>
                                <Button size="sm" variant={b.decision === "accepted" ? "secondary" : "outline"} onClick={() => decide(b, b.decision === "accepted" ? "pending" : "accepted")} aria-pressed={b.decision === "accepted"} className={cn(b.decision === "accepted" && "text-success")}>
                                  <Check /> Accept
                                </Button>
                              </div>
                            )}
                          </div>
                        </Panel>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {tab === "cover" && (
              <Panel>
                <PanelHeader title="Cover letter" description={approved ? "Approved — regenerate to make changes" : "Edit freely. A specialist will read this before it's sent."} action={approved ? <Lock className="size-4 text-subtle" aria-label="Locked" /> : null} />
                <div className="p-5">
                  <label htmlFor="cover" className="sr-only">
                    Cover letter
                  </label>
                  <Textarea id="cover" value={cover} onChange={(e) => setCover(e.target.value)} readOnly={approved} className="min-h-[420px] font-[inherit] text-[13px] leading-[1.75]" />
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs tabular text-subtle">{cover.trim().split(/\s+/).filter(Boolean).length} words</span>
                    {!approved && (
                      <div className="flex gap-2">
                        {coverDirty && (
                          <Button size="sm" variant="ghost" onClick={() => setCover(doc.coverLetter)}>
                            Discard
                          </Button>
                        )}
                        <Button size="sm" disabled={!coverDirty} loading={saveCover.pending} onClick={() => void saveCover.execute(doc.id, cover)}>
                          Save changes
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Panel>
            )}

            {tab === "skills" && (
              <Panel>
                <table className="w-full text-left text-[13px]">
                  <caption className="sr-only">Skill alignment with the role&apos;s required skills</caption>
                  <thead>
                    <tr className="border-b border-line text-xs text-subtle">
                      <th scope="col" className="px-5 py-3 font-medium">
                        Required skill
                      </th>
                      <th scope="col" className="px-5 py-3 font-medium">
                        Status
                      </th>
                      <th scope="col" className="hidden px-5 py-3 font-medium sm:table-cell">
                        Evidence
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {doc.skillAlignment.map((s) => (
                      <tr key={s.skill}>
                        <td className="px-5 py-3 text-fg">{s.skill}</td>
                        <td className="px-5 py-3">
                          <Badge tone={s.status === "matched" ? "success" : s.status === "transferable" ? "accent" : "warning"}>{s.status === "matched" ? "Matched" : s.status === "transferable" ? "Transferable" : "Missing"}</Badge>
                        </td>
                        <td className="hidden px-5 py-3 text-muted sm:table-cell">{s.evidence}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Panel>
            )}

            {tab === "advice" && (
              <Panel>
                <PanelHeader title="Recommended improvements" description="Concrete steps to strengthen this application" />
                {doc.recommendations.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-muted">Nothing to improve — this is a strong application.</p>
                ) : (
                  <ol className="divide-y divide-line">
                    {doc.recommendations.map((r, i) => (
                      <li key={r} className="flex gap-3 px-5 py-4 text-[13px] leading-relaxed text-muted">
                        <span className="grid size-5 shrink-0 place-items-center rounded-full border border-line-strong text-[10px] text-subtle">{i + 1}</span>
                        <span>
                          <Lightbulb className="mr-1.5 inline size-3.5 text-warning" aria-hidden />
                          {r}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </Panel>
            )}
        </div>
      </div>

      {/* Control rail */}
      <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
        <Panel>
          <div className="px-5 py-4">
            <SectionLabel>You&apos;re in control</SectionLabel>
            <div className="mt-3 flex items-baseline justify-between">
              <p className="text-sm font-medium">{approved ? "Approved" : allDecided ? "Ready to approve" : "Review suggestions"}</p>
              <p className="text-xs tabular text-subtle">
                {decided}/{bullets.length} decided
              </p>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div className="h-full rounded-full bg-accent" initial={false} animate={{ width: `${bullets.length ? (decided / bullets.length) * 100 : 100}%` }} />
            </div>
            <p className="mt-2 text-xs text-subtle">
              {accepted} accepted · {decided - accepted} kept original
            </p>
          </div>
          <div className="space-y-2 border-t border-line p-4">
            {!approved ? (
              <Button className="w-full" disabled={!allDecided || coverDirty} loading={approve.pending} onClick={() => void approve.execute(doc.id)}>
                <CheckCircle2 /> Approve v{doc.version}
              </Button>
            ) : inReview ? (
              <div className="flex items-center gap-2 rounded-md border border-warning/25 bg-warning-soft px-3 py-2.5 text-[13px] text-warning">
                <UserCheck className="size-4" /> In human review{review ? ` · ${REVIEW_STATUS_META[review.status].label}` : ""}
              </div>
            ) : pastReview ? (
              <div className="flex items-center gap-2 rounded-md border border-success/25 bg-success-soft px-3 py-2.5 text-[13px] text-success">
                <CheckCircle2 className="size-4" /> Reviewed and submitted
              </div>
            ) : (
              <Button className="w-full" loading={requestReview.pending} disabled={!applicationId} onClick={() => applicationId && void requestReview.execute(applicationId)}>
                <Send /> Request human review
              </Button>
            )}
            {coverDirty && !approved && <p className="text-center text-xs text-warning">Save or discard cover letter edits first.</p>}
            {!allDecided && !approved && <p className="text-center text-xs text-subtle">Decide on every suggestion to approve.</p>}
            {!pastReview && !inReview && (
              <Button variant="ghost" className="w-full" loading={regenerate.pending} onClick={() => void regenerate.execute(jobId)}>
                <RefreshCw /> Generate new version
              </Button>
            )}
          </div>
        </Panel>

        {review?.status === "changes_requested" && review.notes && (
          <Panel className="border-danger/25">
            <div className="px-5 py-4">
              <p className="text-[13px] font-medium text-danger">Specialist requested changes</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{review.notes}</p>
            </div>
          </Panel>
        )}

        <Panel className="px-5 py-4">
          <SectionLabel>Pipeline</SectionLabel>
          <PipelineStepper stage={stage} compact className="mt-3" />
          <ul className="mt-4 space-y-2 text-xs text-muted">
            <li className="flex items-center gap-2">
              <Sparkles className="size-3.5 text-accent" /> Generated by {doc.provider === "anthropic" ? "Claude" : "AutoApply rules"} · v{doc.version}
            </li>
            <li className="flex items-center gap-2">
              <CircleDashed className="size-3.5 text-subtle" /> Updated {timeAgo(doc.updatedAt)}
            </li>
            <li className="flex items-center gap-2">
              <UserCheck className="size-3.5 text-success" /> A specialist reviews before anything is sent
            </li>
          </ul>
        </Panel>
      </aside>
    </div>
  );
}
