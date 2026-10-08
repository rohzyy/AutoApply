"use client";

import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { motion } from "framer-motion";
import { CalendarClock, GripVertical, MoreHorizontal } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { moveApplicationAction } from "@/app/actions/candidate";
import { Badge } from "@/components/ui/badge";
import { CompanyMark } from "@/components/ui/marks";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuTrigger } from "@/components/ui/overlay";
import { CANDIDATE_TRANSITIONS, STATUS_META } from "@/lib/domain/constants";
import { APPLICATION_STATUSES, PIPELINE_STAGES, type ApplicationStatus, type ApplicationWithJob } from "@/lib/domain/types";
import { cn, formatDate, timeAgo } from "@/lib/utils";

const COLUMN_ACCENT: Record<ApplicationStatus, string> = {
  saved: "bg-subtle",
  preparing: "bg-accent",
  human_review: "bg-warning",
  applied: "bg-accent",
  screening: "bg-accent",
  interview: "bg-success",
  offer: "bg-success",
  rejected: "bg-danger",
};

const canMove = (from: ApplicationStatus, to: ApplicationStatus) => from !== to && (CANDIDATE_TRANSITIONS[from].includes(to) || (to === "human_review" && (from === "preparing" || from === "saved")));

export function TrackerBoard({ applications }: { applications: ApplicationWithJob[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const [items, moveOptimistic] = useOptimistic(applications, (state: ApplicationWithJob[], m: { id: string; to: ApplicationStatus }) => state.map((a) => (a.id === m.id ? { ...a, status: m.to } : a)));
  const [dragging, setDragging] = useState<ApplicationWithJob | null>(null);
  const [mobileStatus, setMobileStatus] = useState<ApplicationStatus>(() => APPLICATION_STATUSES.find((s) => applications.some((a) => a.status === s)) ?? "saved");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor));

  const open = (id: string) => {
    const sp = new URLSearchParams(params.toString());
    sp.set("open", id);
    router.push(`${pathname}?${sp.toString()}`, { scroll: false });
  };

  const move = (app: ApplicationWithJob, to: ApplicationStatus) => {
    if (!canMove(app.status, to)) {
      toast.error(to === "applied" && app.status === "human_review" ? "A specialist submits the application once review is complete." : `Can't move from ${STATUS_META[app.status].label} to ${STATUS_META[to].label}.`);
      return;
    }
    startTransition(async () => {
      moveOptimistic({ id: app.id, to });
      const res = await moveApplicationAction(app.id, to);
      if (res.ok) toast.success(`Moved to ${STATUS_META[to].label}`);
      else toast.error(res.error);
    });
  };

  const onDragStart = (e: DragStartEvent) => setDragging(items.find((a) => a.id === e.active.id) ?? null);
  const onDragEnd = (e: DragEndEvent) => {
    setDragging(null);
    const app = items.find((a) => a.id === e.active.id);
    const to = e.over?.id as ApplicationStatus | undefined;
    if (app && to && to !== app.status) move(app, to);
  };

  return (
    <>
      {/* Mobile: one status at a time — a list designed for thumbs, not a squeezed board */}
      <div className="md:hidden">
        <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 no-scrollbar" role="tablist" aria-label="Status">
          {APPLICATION_STATUSES.map((s) => {
            const n = items.filter((a) => a.status === s).length;
            return (
              <button key={s} role="tab" aria-selected={mobileStatus === s} onClick={() => setMobileStatus(s)} className={cn("flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-[13px] transition-colors", mobileStatus === s ? "border-line-strong bg-surface-3 text-fg" : "border-line text-muted")}>
                <span className={cn("size-1.5 rounded-full", COLUMN_ACCENT[s])} aria-hidden />
                {STATUS_META[s].label}
                <span className="tabular text-subtle">{n}</span>
              </button>
            );
          })}
        </div>
        <ul className="space-y-2">
          {items.filter((a) => a.status === mobileStatus).map((a) => (
            <li key={a.id}>
              <CardBody app={a} onOpen={() => open(a.id)} onMove={(to) => move(a, to)} />
            </li>
          ))}
          {items.every((a) => a.status !== mobileStatus) && <li className="rounded-lg border border-dashed border-line px-4 py-10 text-center text-[13px] text-subtle">{STATUS_META[mobileStatus].description}. Nothing here yet.</li>}
        </ul>
      </div>

      {/* Desktop board */}
      <DndContext id="application-tracker" sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
        <div className="-mx-4 hidden overflow-x-auto px-4 pb-4 md:-mx-8 md:block md:px-8">
          <div className="flex min-w-max gap-3">
            {APPLICATION_STATUSES.map((status) => (
              <Column key={status} status={status} apps={items.filter((a) => a.status === status)} dragging={dragging} onOpen={open} onMove={move} />
            ))}
          </div>
        </div>
        <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.22,1,0.36,1)" }}>{dragging ? <CardBody app={dragging} overlay /> : null}</DragOverlay>
      </DndContext>
    </>
  );
}

function Column({ status, apps, dragging, onOpen, onMove }: { status: ApplicationStatus; apps: ApplicationWithJob[]; dragging: ApplicationWithJob | null; onOpen: (id: string) => void; onMove: (a: ApplicationWithJob, to: ApplicationStatus) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const allowed = dragging ? canMove(dragging.status, status) : false;
  const dimmed = dragging && !allowed && dragging.status !== status;

  return (
    <section ref={setNodeRef} aria-label={`${STATUS_META[status].label} column`} className={cn("flex w-[272px] flex-col rounded-lg border bg-surface/60 transition-[border-color,background-color,opacity] duration-150", isOver && allowed ? "border-accent-line bg-accent-soft/30" : "border-line", dimmed && "opacity-40")}>
      <header className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className={cn("size-1.5 rounded-full", COLUMN_ACCENT[status])} aria-hidden />
          <h2 className="text-[13px] font-medium">{STATUS_META[status].label}</h2>
          <span className="text-xs tabular text-subtle">{apps.length}</span>
        </div>
      </header>
      <ul className="flex min-h-40 flex-1 flex-col gap-2 px-2 pb-2">
        {apps.map((a) => (
          <DraggableCard key={a.id} app={a} onOpen={() => onOpen(a.id)} onMove={(to) => onMove(a, to)} />
        ))}
        {apps.length === 0 && <li className={cn("grid flex-1 place-items-center rounded-md border border-dashed px-3 py-8 text-center text-xs text-subtle", allowed ? "border-accent-line text-[#8FB3FF]" : "border-line")}>{allowed ? "Drop here" : STATUS_META[status].description}</li>}
      </ul>
    </section>
  );
}

function DraggableCard({ app, onOpen, onMove }: { app: ApplicationWithJob; onOpen: () => void; onMove: (to: ApplicationStatus) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: app.id });
  return (
    <motion.li layout="position" layoutId={app.id} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }} ref={setNodeRef} className={cn(isDragging && "opacity-30")}>
      <CardBody app={app} onOpen={onOpen} onMove={onMove} handleProps={{ ...attributes, ...listeners }} />
    </motion.li>
  );
}

function CardBody({ app, onOpen, onMove, handleProps, overlay }: { app: ApplicationWithJob; onOpen?: () => void; onMove?: (to: ApplicationStatus) => void; handleProps?: React.HTMLAttributes<HTMLButtonElement>; overlay?: boolean }) {
  const stageIndex = PIPELINE_STAGES.indexOf(app.stage);
  const targets = APPLICATION_STATUSES.filter((s) => canMove(app.status, s));
  return (
    <div className={cn("group relative rounded-md border border-line bg-surface-2 p-3 transition-colors hover:border-line-strong", overlay && "rotate-[1.5deg] border-line-strong shadow-[0_20px_50px_rgb(0_0_0/0.6)]")}>
      <div className="flex items-start gap-2.5">
        <CompanyMark name={app.job.company.name} color={app.job.company.brandColor} size="sm" />
        <div className="min-w-0 flex-1">
          <button onClick={onOpen} className="block w-full text-left text-[13px] font-medium leading-snug text-fg after:absolute after:inset-0 hover:text-white">
            <span className="line-clamp-2">{app.job.title}</span>
          </button>
          <p className="mt-0.5 truncate text-xs text-muted">{app.job.company.name}</p>
        </div>
        {app.score !== null && <span className={cn("text-xs font-semibold tabular", app.score >= 85 ? "text-success" : app.score >= 70 ? "text-[#8FB3FF]" : "text-muted")}>{app.score}</span>}
      </div>

      <div className="mt-3 flex items-center gap-1" aria-label={`Pipeline stage ${stageIndex + 1} of 5`}>
        {PIPELINE_STAGES.map((s, i) => (
          <span key={s} className={cn("h-0.5 flex-1 rounded-full", i <= stageIndex ? (i >= 3 ? "bg-success" : "bg-accent") : "bg-white/10")} aria-hidden />
        ))}
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2">
        {app.nextStep ? (
          <span className="flex min-w-0 items-center gap-1 truncate text-[11px] text-warning">
            <CalendarClock className="size-3 shrink-0" /> {formatDate(app.nextStep.at)} · {app.nextStep.label}
          </span>
        ) : (
          <span className="text-[11px] text-subtle">Updated {timeAgo(app.updatedAt)}</span>
        )}
        {!overlay && (
          <div className="relative z-10 flex shrink-0 items-center opacity-100 transition-opacity md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
            {onMove && targets.length > 0 && (
              <Menu>
                <MenuTrigger className="grid size-6 place-items-center rounded text-subtle hover:bg-surface-3 hover:text-fg" aria-label={`Move ${app.job.title}`}>
                  <MoreHorizontal className="size-3.5" />
                </MenuTrigger>
                <MenuContent>
                  <MenuLabel>Move to</MenuLabel>
                  {targets.map((t) => (
                    <MenuItem key={t} onSelect={() => onMove(t)}>
                      <span className={cn("size-1.5 rounded-full", COLUMN_ACCENT[t])} /> {STATUS_META[t].label}
                    </MenuItem>
                  ))}
                </MenuContent>
              </Menu>
            )}
            {handleProps && (
              <button {...handleProps} className="hidden size-6 cursor-grab place-items-center rounded text-subtle hover:bg-surface-3 hover:text-fg active:cursor-grabbing md:grid" aria-label={`Drag ${app.job.title}`}>
                <GripVertical className="size-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
      {app.status === "human_review" && (
        <div className="mt-2.5">
          <Badge tone="warning" dot pulse>
            With a specialist
          </Badge>
        </div>
      )}
    </div>
  );
}
