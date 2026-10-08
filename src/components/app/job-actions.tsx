"use client";

import { Bookmark, BookmarkCheck, EyeOff, RefreshCw, RotateCcw, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { dismissMatchAction, generateTailoringAction, rematchAction, restoreMatchAction, saveJobAction } from "@/app/actions/candidate";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/overlay";
import { useAction } from "@/lib/hooks/use-action";
import { cn } from "@/lib/utils";

export function SaveJobButton({ jobId, saved, size = "sm", iconOnly }: { jobId: string; saved: boolean; size?: ButtonProps["size"]; iconOnly?: boolean }) {
  const [optimistic, setOptimistic] = useState(saved);
  const { execute, pending } = useAction(saveJobAction, { onSuccess: () => setOptimistic(true) });
  const label = optimistic ? "Saved" : "Save";
  const btn = (
    <Button
      variant={optimistic ? "secondary" : "outline"}
      size={iconOnly ? "icon-sm" : size}
      disabled={optimistic}
      loading={pending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void execute(jobId);
      }}
      aria-label={iconOnly ? label : undefined}
      aria-pressed={optimistic}
    >
      {optimistic ? <BookmarkCheck className="text-accent" /> : <Bookmark />}
      {!iconOnly && label}
    </Button>
  );
  return iconOnly ? <Tooltip content={optimistic ? "Saved to shortlist" : "Save to shortlist"}>{btn}</Tooltip> : btn;
}

export function DismissButton({ jobId, dismissed }: { jobId: string; dismissed?: boolean }) {
  const { execute, pending } = useAction(dismissed ? restoreMatchAction : dismissMatchAction);
  return (
    <Tooltip content={dismissed ? "Restore to feed" : "Not interested"}>
      <Button
        variant="ghost"
        size="icon-sm"
        loading={pending}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void execute(jobId);
        }}
        aria-label={dismissed ? "Restore to feed" : "Hide this job"}
      >
        {dismissed ? <RotateCcw /> : <EyeOff />}
      </Button>
    </Tooltip>
  );
}

export function TailorButton({ jobId, hasDocument, size = "sm", className }: { jobId: string; hasDocument?: boolean; size?: ButtonProps["size"]; className?: string }) {
  const router = useRouter();
  const { execute, pending } = useAction(generateTailoringAction, { onSuccess: () => router.push(`/jobs/${jobId}/tailor`) });
  if (hasDocument) {
    return (
      <Button size={size} className={className} onClick={() => router.push(`/jobs/${jobId}/tailor`)}>
        <Sparkles /> Open tailoring
      </Button>
    );
  }
  return (
    <Button size={size} className={className} loading={pending} onClick={() => void execute(jobId)}>
      <Sparkles /> Tailor application
    </Button>
  );
}

export function RematchButton() {
  const { execute, pending } = useAction(rematchAction);
  return (
    <Button variant="secondary" size="sm" onClick={() => void execute()} loading={pending}>
      <RefreshCw className={cn(pending && "animate-spin")} /> Refresh matches
    </Button>
  );
}
