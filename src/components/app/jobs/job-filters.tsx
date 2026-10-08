"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { Sheet } from "@/components/ui/overlay";
import { countryName, SENIORITY_LABEL } from "@/lib/domain/constants";
import type { JobFilters } from "@/lib/services/jobs";
import { cn } from "@/lib/utils";

const PendingContext = createContext(false);
export const useFiltersPending = () => useContext(PendingContext);

const DEFAULTS: JobFilters = { q: "", country: "", mode: "", eligibility: "all", seniority: "", minScore: 0, sort: "fit", view: "all" };

function toQuery(f: JobFilters) {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.country) p.set("country", f.country);
  if (f.mode) p.set("mode", f.mode);
  if (f.eligibility !== "all") p.set("eligibility", f.eligibility);
  if (f.seniority) p.set("seniority", f.seniority);
  if (f.minScore) p.set("min", String(f.minScore));
  if (f.sort !== "fit") p.set("sort", f.sort);
  if (f.view !== "all") p.set("view", f.view);
  const s = p.toString();
  return s ? `?${s}` : "";
}

/** Filters live in the URL so results are shareable, bookmarkable and survive back/forward. */
export function JobFiltersShell({ initial, countries, children }: { initial: JobFilters; countries: [string, number][]; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [filters, setFilters] = useState(initial);
  const [q, setQ] = useState(initial.q);
  const [sheet, setSheet] = useState(false);
  const debounce = useRef<number | undefined>(undefined);

  // Server-parsed filters are the source of truth after navigation (back/forward, shared links).
  const [synced, setSynced] = useState(initial);
  if (synced !== initial) {
    setSynced(initial);
    setFilters(initial);
    setQ(initial.q);
  }

  const apply = (next: Partial<JobFilters>) => {
    const merged = { ...filters, ...next };
    setFilters(merged);
    startTransition(() => router.replace(`${pathname}${toQuery(merged)}`, { scroll: false }));
  };

  const onSearch = (value: string) => {
    setQ(value);
    window.clearTimeout(debounce.current);
    debounce.current = window.setTimeout(() => apply({ q: value.trim() }), 250);
  };

  const activeCount = [filters.country, filters.mode, filters.eligibility !== "all", filters.seniority, filters.minScore > 0].filter(Boolean).length;

  const controls = (
    <>
      <Field label="Country" htmlFor="f-country">
        <Select id="f-country" value={filters.country} onChange={(e) => apply({ country: e.target.value })}>
          <option value="">All countries</option>
          {countries.map(([c, n]) => (
            <option key={c} value={c}>
              {countryName(c)} ({n})
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Work mode" htmlFor="f-mode">
        <Select id="f-mode" value={filters.mode} onChange={(e) => apply({ mode: e.target.value as JobFilters["mode"] })}>
          <option value="">Any</option>
          <option value="remote">Remote</option>
          <option value="hybrid">Hybrid</option>
          <option value="onsite">On-site</option>
        </Select>
      </Field>
      <Field label="Eligibility" htmlFor="f-elig">
        <Select id="f-elig" value={filters.eligibility} onChange={(e) => apply({ eligibility: e.target.value as JobFilters["eligibility"] })}>
          <option value="all">All roles</option>
          <option value="sponsorship">Eligible or via sponsorship</option>
          <option value="eligible">No visa needed</option>
        </Select>
      </Field>
      <Field label="Seniority" htmlFor="f-sen">
        <Select id="f-sen" value={filters.seniority} onChange={(e) => apply({ seniority: e.target.value as JobFilters["seniority"] })}>
          <option value="">Any level</option>
          {Object.entries(SENIORITY_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Minimum fit" htmlFor="f-min">
        <Select id="f-min" value={String(filters.minScore)} onChange={(e) => apply({ minScore: Number(e.target.value) })}>
          <option value="0">Any score</option>
          <option value="55">55+ partial</option>
          <option value="70">70+ strong</option>
          <option value="85">85+ excellent</option>
        </Select>
      </Field>
    </>
  );

  return (
    <PendingContext value={pending}>
      <div className="mb-5 space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
            <Input value={q} onChange={(e) => onSearch(e.target.value)} placeholder="Search title, company or skill" className="h-10 pl-9" aria-label="Search jobs" type="search" />
          </div>
          <div className="flex items-center gap-2">
            <div role="tablist" aria-label="View" className="flex h-10 flex-1 rounded-md border border-line-strong bg-surface p-1 lg:flex-none">
              {(["all", "saved", "dismissed"] as const).map((v) => (
                <button
                  key={v}
                  role="tab"
                  aria-selected={filters.view === v}
                  onClick={() => apply({ view: v })}
                  className={cn("flex-1 rounded px-3 text-[13px] transition-colors lg:flex-none", filters.view === v ? "bg-surface-3 text-fg" : "text-muted hover:text-fg")}
                >
                  {v === "all" ? "All" : v === "saved" ? "Shortlist" : "Hidden"}
                </button>
              ))}
            </div>
            <Select aria-label="Sort" value={filters.sort} onChange={(e) => apply({ sort: e.target.value as JobFilters["sort"] })} className="hidden h-10 w-40 sm:block">
              <option value="fit">Best fit</option>
              <option value="recent">Most recent</option>
              <option value="salary">Highest salary</option>
            </Select>
            <Button variant="secondary" className="h-10 lg:hidden" onClick={() => setSheet(true)}>
              <SlidersHorizontal /> Filters{activeCount ? ` · ${activeCount}` : ""}
            </Button>
          </div>
        </div>
        <div className="hidden grid-cols-5 gap-3 lg:grid">{controls}</div>
        {activeCount > 0 && (
          <button onClick={() => apply({ ...DEFAULTS, q: filters.q, view: filters.view, sort: filters.sort })} className="inline-flex items-center gap-1 text-xs text-muted hover:text-fg">
            <X className="size-3" /> Clear {activeCount} filter{activeCount > 1 ? "s" : ""}
          </button>
        )}
      </div>

      <Sheet open={sheet} onOpenChange={setSheet} title="Filters" width="md:max-w-sm">
        <div className="space-y-4 p-5">
          {controls}
          <Field label="Sort by" htmlFor="f-sort-m">
            <Select id="f-sort-m" value={filters.sort} onChange={(e) => apply({ sort: e.target.value as JobFilters["sort"] })}>
              <option value="fit">Best fit</option>
              <option value="recent">Most recent</option>
              <option value="salary">Highest salary</option>
            </Select>
          </Field>
          <Button className="w-full" onClick={() => setSheet(false)}>
            Show results
          </Button>
        </div>
      </Sheet>

      <div className={cn("transition-opacity duration-200", pending && "pointer-events-none opacity-50")} aria-busy={pending}>
        {children}
      </div>
    </PendingContext>
  );
}
