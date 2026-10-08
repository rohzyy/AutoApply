"use client";

import { Plus, Trash2, X } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { AUTH_STATUS_LABEL, COUNTRIES, SENIORITY_LABEL } from "@/lib/domain/constants";
import type { AuthStatus, CandidateProfile, Experience, Skill } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

export type ProfileDraft = Omit<CandidateProfile, "userId" | "updatedAt">;

export function toDraft(p: CandidateProfile): ProfileDraft {
  const { userId: _u, updatedAt: _t, ...rest } = p;
  void _u;
  void _t;
  return rest;
}

const countryEntries = Object.entries(COUNTRIES).sort((a, b) => a[1].localeCompare(b[1]));

export function CountrySelect({ id, value, onChange, placeholder = "Select a country" }: { id?: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <Select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {countryEntries.map(([code, name]) => (
        <option key={code} value={code}>
          {name}
        </option>
      ))}
    </Select>
  );
}

/** Toggle chips for picking several countries. Buttons with aria-pressed, keyboard friendly. */
export function CountryChips({ value, onChange, label }: { value: string[]; onChange: (v: string[]) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {countryEntries.map(([code, name]) => {
        const on = value.includes(code);
        return (
          <button
            key={code}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((c) => c !== code) : [...value, code])}
            className={cn("h-7 rounded-md border px-2.5 text-xs transition-colors", on ? "border-accent-line bg-accent-soft text-[#B5CCFF]" : "border-line text-muted hover:border-line-strong hover:text-fg")}
          >
            {name}
          </button>
        );
      })}
    </div>
  );
}

export function TagInput({ id, value, onChange, placeholder, max = 8 }: { id?: string; value: string[]; onChange: (v: string[]) => void; placeholder?: string; max?: number }) {
  const [text, setText] = useState("");
  const add = () => {
    const t = text.trim();
    if (t && !value.some((v) => v.toLowerCase() === t.toLowerCase()) && value.length < max) onChange([...value, t]);
    setText("");
  };
  return (
    <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-line-strong bg-surface-2 px-2 py-1.5 focus-within:border-accent focus-within:shadow-[0_0_0_3px_var(--accent-soft)]">
      {value.map((v) => (
        <span key={v} className="inline-flex h-6 items-center gap-1 rounded bg-surface-3 pl-2 pr-1 text-xs text-fg">
          {v}
          <button type="button" onClick={() => onChange(value.filter((x) => x !== v))} className="grid size-4 place-items-center rounded text-subtle hover:text-fg" aria-label={`Remove ${v}`}>
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          } else if (e.key === "Backspace" && !text && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={add}
        placeholder={value.length >= max ? `Up to ${max}` : placeholder}
        disabled={value.length >= max}
        className="h-6 min-w-32 flex-1 bg-transparent text-sm text-fg placeholder:text-subtle focus:outline-none"
      />
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap rounded-md border border-line-strong bg-surface p-0.5">
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)} className={cn("h-8 rounded px-3 text-[13px] transition-colors", value === o.value ? "bg-surface-3 text-fg" : "text-muted hover:text-fg")}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SkillsEditor({ value, onChange }: { value: Skill[]; onChange: (v: Skill[]) => void }) {
  const [name, setName] = useState("");
  const add = () => {
    const n = name.trim();
    if (!n || value.some((s) => s.name.toLowerCase() === n.toLowerCase())) return setName("");
    onChange([...value, { name: n, level: 3, years: 1 }]);
    setName("");
  };
  const update = (i: number, patch: Partial<Skill>) => onChange(value.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())} placeholder="Add a skill, e.g. PostgreSQL" aria-label="New skill" />
        <Button type="button" variant="secondary" onClick={add}>
          <Plus /> Add
        </Button>
      </div>
      {value.length > 0 && (
        <ul className="divide-y divide-line rounded-md border border-line">
          {value.map((s, i) => (
            <li key={s.name} className="flex flex-wrap items-center gap-3 px-3 py-2">
              <span className="min-w-28 flex-1 text-[13px] text-fg">{s.name}</span>
              <div className="flex items-center gap-1" role="radiogroup" aria-label={`${s.name} proficiency`}>
                {[1, 2, 3, 4, 5].map((l) => (
                  <button key={l} type="button" role="radio" aria-checked={s.level === l} aria-label={`Level ${l}`} onClick={() => update(i, { level: l as Skill["level"] })} className="grid size-5 place-items-center">
                    <span className={cn("block h-2.5 w-1.5 rounded-sm transition-colors", l <= s.level ? "bg-accent" : "bg-white/10")} />
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-1.5 text-xs text-subtle">
                <input type="number" min={0} max={40} value={s.years} onChange={(e) => update(i, { years: Math.max(0, Math.min(40, Number(e.target.value))) })} className="h-7 w-12 rounded border border-line-strong bg-surface-2 px-1.5 text-center text-xs text-fg tabular focus:border-accent focus:outline-none" aria-label={`${s.name} years`} />
                yrs
              </label>
              <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="grid size-7 place-items-center rounded text-subtle hover:bg-surface-2 hover:text-danger" aria-label={`Remove ${s.name}`}>
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AuthorizationEditor({ value, onChange }: { value: CandidateProfile["workAuthorizations"]; onChange: (v: CandidateProfile["workAuthorizations"]) => void }) {
  const [country, setCountry] = useState("");
  const [status, setStatus] = useState<AuthStatus>("citizen");
  const id = useId();
  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <ul className="divide-y divide-line rounded-md border border-line">
          {value.map((a) => (
            <li key={a.country} className="flex items-center gap-3 px-3 py-2 text-[13px]">
              <span className="flex-1 text-fg">{COUNTRIES[a.country] ?? a.country}</span>
              <span className="text-muted">{AUTH_STATUS_LABEL[a.status]}</span>
              <button type="button" onClick={() => onChange(value.filter((x) => x.country !== a.country))} className="grid size-7 place-items-center rounded text-subtle hover:bg-surface-2 hover:text-danger" aria-label={`Remove ${a.country}`}>
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <CountrySelect id={`${id}-c`} value={country} onChange={setCountry} />
        <Select aria-label="Authorization status" value={status} onChange={(e) => setStatus(e.target.value as AuthStatus)}>
          {Object.entries(AUTH_STATUS_LABEL)
            .filter(([k]) => k !== "none")
            .map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
        </Select>
        <Button
          type="button"
          variant="secondary"
          disabled={!country}
          onClick={() => {
            onChange([...value.filter((a) => a.country !== country), { country, status }]);
            setCountry("");
          }}
        >
          <Plus /> Add
        </Button>
      </div>
    </div>
  );
}

export function ExperienceEditor({ value, onChange }: { value: Experience[]; onChange: (v: Experience[]) => void }) {
  const update = (i: number, patch: Partial<Experience>) => onChange(value.map((e, j) => (j === i ? { ...e, ...patch } : e)));
  return (
    <div className="space-y-3">
      {value.map((e, i) => (
        <fieldset key={e.id} className="rounded-lg border border-line p-4">
          <legend className="sr-only">Role {i + 1}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Title" htmlFor={`${e.id}-title`}>
              <Input id={`${e.id}-title`} value={e.title} onChange={(ev) => update(i, { title: ev.target.value })} />
            </Field>
            <Field label="Company" htmlFor={`${e.id}-co`}>
              <Input id={`${e.id}-co`} value={e.company} onChange={(ev) => update(i, { company: ev.target.value })} />
            </Field>
            <Field label="Start" htmlFor={`${e.id}-start`}>
              <Input id={`${e.id}-start`} type="month" value={e.startDate} onChange={(ev) => update(i, { startDate: ev.target.value })} />
            </Field>
            <Field label="End" htmlFor={`${e.id}-end`} hint={e.endDate ? undefined : "Current role"}>
              <div className="flex gap-2">
                <Input id={`${e.id}-end`} type="month" value={e.endDate ?? ""} onChange={(ev) => update(i, { endDate: ev.target.value || null })} />
                <Button type="button" variant={e.endDate ? "outline" : "secondary"} onClick={() => update(i, { endDate: e.endDate ? null : new Date().toISOString().slice(0, 7) })} className="shrink-0">
                  {e.endDate ? "Current" : "Ended"}
                </Button>
              </div>
            </Field>
          </div>
          <Field label="Highlights" htmlFor={`${e.id}-hl`} hint="One achievement per line. These feed tailoring." className="mt-3">
            <Textarea id={`${e.id}-hl`} value={e.highlights.join("\n")} onChange={(ev) => update(i, { highlights: ev.target.value.split("\n").slice(0, 8) })} onBlur={() => update(i, { highlights: e.highlights.map((h) => h.trim()).filter(Boolean) })} className="min-h-24 text-[13px]" />
          </Field>
          <Field label="Skills used" htmlFor={`${e.id}-sk`} className="mt-3">
            <TagInput id={`${e.id}-sk`} value={e.skills} onChange={(skills) => update(i, { skills })} placeholder="Type and press Enter" max={20} />
          </Field>
          <div className="mt-3 flex justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(value.filter((_, j) => j !== i))} className="text-danger hover:text-danger">
              <Trash2 /> Remove role
            </Button>
          </div>
        </fieldset>
      ))}
      <Button
        type="button"
        variant="secondary"
        onClick={() => onChange([...value, { id: crypto.randomUUID(), company: "", title: "", startDate: new Date().toISOString().slice(0, 7), endDate: null, description: "", highlights: [], skills: [] }])}
      >
        <Plus /> Add role
      </Button>
    </div>
  );
}

export function SenioritySelect({ id, value, onChange }: { id?: string; value: CandidateProfile["seniority"]; onChange: (v: CandidateProfile["seniority"]) => void }) {
  return (
    <Select id={id} value={value} onChange={(e) => onChange(e.target.value as CandidateProfile["seniority"])}>
      {Object.entries(SENIORITY_LABEL).map(([k, v]) => (
        <option key={k} value={k}>
          {v}
        </option>
      ))}
    </Select>
  );
}

export const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "SGD", "CHF", "AED", "INR"];

/** Strip empty optional values so the server schema sees clean input. */
export function cleanDraft(d: ProfileDraft): ProfileDraft {
  return {
    ...d,
    experience: d.experience.filter((e) => e.company.trim() && e.title.trim()).map((e) => ({ ...e, highlights: e.highlights.map((h) => h.trim()).filter(Boolean) })),
    links: Object.fromEntries(Object.entries(d.links).filter(([, v]) => v && v.trim())),
  };
}
