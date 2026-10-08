"use client";

import { ArrowRight, CornerDownLeft, Search } from "lucide-react";
import { Dialog as D } from "radix-ui";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Kbd } from "@/components/ui/marks";
import { cn } from "@/lib/utils";
import { ADMIN_NAV, CANDIDATE_NAV } from "./nav";

interface Command {
  id: string;
  label: string;
  hint: string;
  run: () => void;
}

export function CommandPalette({ staff }: { staff: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-command-palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("open-command-palette", onOpen);
    };
  }, []);

  const commands = useMemo<Command[]>(() => {
    const go = (href: string) => () => router.push(href);
    const nav: Command[] = [
      ...CANDIDATE_NAV.map((n) => ({ id: n.href, label: n.label, hint: "Go to", run: go(n.href) })),
      ...(staff ? ADMIN_NAV.map((n) => ({ id: n.href, label: `Ops · ${n.label}`, hint: "Go to", run: go(n.href) })) : []),
      { id: "remote", label: "Remote roles only", hint: "Filter", run: go("/jobs?mode=remote") },
      { id: "eligible", label: "Roles I'm eligible for without a visa", hint: "Filter", run: go("/jobs?eligibility=eligible") },
      { id: "saved", label: "Saved jobs", hint: "Filter", run: go("/jobs?view=saved") },
    ];
    const q = query.trim().toLowerCase();
    const filtered = q ? nav.filter((c) => c.label.toLowerCase().includes(q)) : nav;
    if (q) filtered.unshift({ id: "search", label: `Search jobs for “${query.trim()}”`, hint: "Search", run: go(`/jobs?q=${encodeURIComponent(query.trim())}`) });
    return filtered;
  }, [query, router, staff]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${index}"]`)?.scrollIntoView({ block: "nearest" });
  }, [index]);

  const execute = (c?: Command) => {
    if (!c) return;
    setOpen(false);
    setQuery("");
    c.run();
  };

  return (
    <D.Root open={open} onOpenChange={setOpen}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-[fade-in_120ms_ease-out]" />
        <D.Content
          className="fixed left-1/2 top-[12vh] z-50 w-[calc(100vw-24px)] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-line-strong bg-surface shadow-[0_32px_100px_rgb(0_0_0/0.7)] focus:outline-none data-[state=open]:animate-[dialog-in_160ms_var(--ease-out)]"
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setIndex((i) => Math.min(commands.length - 1, i + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setIndex((i) => Math.max(0, i - 1));
            } else if (e.key === "Enter") {
              e.preventDefault();
              execute(commands[index]);
            }
          }}
        >
          <D.Title className="sr-only">Command menu</D.Title>
          <D.Description className="sr-only">Search jobs or jump to a page</D.Description>
          <div className="flex items-center gap-3 border-b border-line px-4">
            <Search className="size-4 text-subtle" aria-hidden />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIndex(0);
              }}
              placeholder="Search jobs, jump to a page…"
              className="h-12 flex-1 bg-transparent text-sm text-fg placeholder:text-subtle focus:outline-none"
              role="combobox"
              aria-expanded
              aria-controls="command-list"
              aria-activedescendant={commands[index] ? `cmd-${commands[index].id}` : undefined}
            />
            <Kbd>Esc</Kbd>
          </div>
          <ul id="command-list" ref={listRef} role="listbox" className="max-h-[50vh] overflow-y-auto p-1.5">
            {commands.length === 0 && <li className="px-3 py-8 text-center text-sm text-muted">No matches. Press Enter to search jobs.</li>}
            {commands.map((c, i) => (
              <li
                key={c.id}
                id={`cmd-${c.id}`}
                data-index={i}
                role="option"
                aria-selected={i === index}
                onMouseMove={() => setIndex(i)}
                onClick={() => execute(c)}
                className={cn("flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm", i === index ? "bg-surface-3 text-fg" : "text-muted")}
              >
                <span className="w-14 shrink-0 text-xs text-subtle">{c.hint}</span>
                <span className="flex-1 truncate">{c.label}</span>
                {i === index ? <CornerDownLeft className="size-3.5 text-subtle" aria-hidden /> : <ArrowRight className="size-3.5 opacity-0" aria-hidden />}
              </li>
            ))}
          </ul>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

export function CommandTrigger() {
  return (
    <button
      onClick={() => window.dispatchEvent(new Event("open-command-palette"))}
      className="flex h-8 w-full max-w-72 items-center gap-2 rounded-md border border-line-strong bg-surface px-2.5 text-[13px] text-subtle transition-colors hover:border-white/20 hover:text-muted"
    >
      <Search className="size-3.5" aria-hidden />
      <span className="flex-1 text-left">Search or jump to…</span>
      <Kbd>⌘K</Kbd>
    </button>
  );
}
