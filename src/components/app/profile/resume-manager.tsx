"use client";

import { Download, FileText, MoreHorizontal, Star, Trash2, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { deleteResumeAction, setPrimaryResumeAction, uploadResumeAction } from "@/app/actions/candidate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/overlay";
import { EmptyState } from "@/components/ui/states";
import type { Resume } from "@/lib/domain/types";
import { useAction } from "@/lib/hooks/use-action";
import { cn, formatBytes, timeAgo } from "@/lib/utils";

const ACCEPT = ".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";
const MAX = 5 * 1024 * 1024;

export function ResumeManager({ resumes }: { resumes: Resume[] }) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Resume | null>(null);
  const upload = useAction(uploadResumeAction);
  const remove = useAction(deleteResumeAction, { onSuccess: () => setConfirm(null) });
  const primary = useAction(setPrimaryResumeAction);

  const send = (file: File | undefined) => {
    setLocalError(null);
    if (!file) return;
    if (file.size > MAX) return setLocalError("That file is over 5 MB.");
    if (!/\.(pdf|docx|txt)$/i.test(file.name)) return setLocalError("Upload a PDF, DOCX or TXT file.");
    const fd = new FormData();
    fd.set("file", file);
    void upload.execute(fd);
    if (input.current) input.current.value = "";
  };

  return (
    <div className="space-y-4 p-5">
      <div
        onDragOver={(e) => (e.preventDefault(), setDrag(true))}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          send(e.dataTransfer.files[0]);
        }}
        className={cn("relative flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-8 text-center transition-colors", drag ? "border-accent bg-accent-soft/40" : "border-line-strong", upload.pending && "pointer-events-none")}
      >
        <UploadCloud className={cn("size-5", drag ? "text-accent" : "text-subtle", upload.pending && "animate-pulse text-accent")} aria-hidden />
        <p className="mt-3 text-[13px] text-fg">{upload.pending ? "Uploading and reading your resume…" : "Drop a resume here, or"}</p>
        {!upload.pending && (
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => input.current?.click()}>
            Choose file
          </Button>
        )}
        <p className="mt-3 text-xs text-subtle">PDF, DOCX or TXT · up to 5 MB · stored privately</p>
        <input ref={input} type="file" accept={ACCEPT} className="sr-only" onChange={(e) => send(e.target.files?.[0])} aria-label="Upload resume" />
        {localError && (
          <p role="alert" className="mt-2 text-xs text-danger">
            {localError}
          </p>
        )}
      </div>

      {resumes.length === 0 ? (
        <EmptyState className="py-6" icon={<FileText />} title="No resumes yet" description="Your primary resume is used as the base for every tailored application." />
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line">
          {resumes.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-4 py-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-md border border-line bg-surface-2">
                <FileText className="size-4 text-muted" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate text-[13px] font-medium text-fg">
                  {r.name}
                  {r.isPrimary && <Badge tone="accent">Primary</Badge>}
                </p>
                <p className="truncate text-xs text-subtle">
                  {r.fileName} · {formatBytes(r.sizeBytes)} · {timeAgo(r.createdAt)}
                  {r.parsedText ? " · text extracted" : ""}
                </p>
              </div>
              <Menu>
                <MenuTrigger className="grid size-8 place-items-center rounded-md text-subtle hover:bg-surface-2 hover:text-fg" aria-label={`Actions for ${r.name}`}>
                  <MoreHorizontal className="size-4" />
                </MenuTrigger>
                <MenuContent>
                  <MenuItem onSelect={() => window.open(`/api/resumes/${r.id}`, "_blank", "noopener")}>
                    <Download /> Download
                  </MenuItem>
                  {!r.isPrimary && (
                    <MenuItem onSelect={() => void primary.execute(r.id)}>
                      <Star /> Make primary
                    </MenuItem>
                  )}
                  <MenuSeparator />
                  <MenuItem onSelect={() => setConfirm(r)} className="text-danger data-[highlighted]:text-danger">
                    <Trash2 /> Delete
                  </MenuItem>
                </MenuContent>
              </Menu>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent title="Delete this resume?" description={`“${confirm?.name}” will be removed from storage. Tailored documents that used it keep their content.`}>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button variant="danger" loading={remove.pending} onClick={() => confirm && void remove.execute(confirm.id)}>
              Delete resume
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
