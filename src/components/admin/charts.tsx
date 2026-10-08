"use client";

import { useState } from "react";
import { cn, formatDate } from "@/lib/utils";

/**
 * Single-series daily column chart. One measure per chart (never dual-axis),
 * no legend (the panel title names the series), hover tooltip per bar, table for AT.
 */
export function DailyBars({ data, label, height = 140 }: { data: { date: string; count: number }[]; label: string; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.count));
  const niceMax = max <= 4 ? 4 : Math.ceil(max / 5) * 5;
  const w = 100 / data.length;
  const total = data.reduce((a, d) => a + d.count, 0);

  return (
    <figure className="relative">
      <div className="flex items-baseline justify-between px-1 pb-3">
        <p className="text-2xl font-semibold tabular">{total}</p>
        <p className="text-xs text-subtle">last {data.length} days</p>
      </div>
      <div className="relative" style={{ height }} onMouseLeave={() => setHover(null)}>
        {/* recessive gridlines */}
        {[0, 0.5, 1].map((t) => (
          <div key={t} className="absolute inset-x-0 border-t border-white/[0.05]" style={{ bottom: `${t * 100}%` }} aria-hidden>
            {t > 0 && <span className="absolute -top-2 right-0 bg-surface pl-1 text-[10px] tabular text-subtle">{Math.round(niceMax * t)}</span>}
          </div>
        ))}
        <svg className="absolute inset-0 h-full w-full overflow-visible pr-6" preserveAspectRatio="none" viewBox={`0 0 100 ${height}`} aria-hidden>
          {data.map((d, i) => {
            const h = (d.count / niceMax) * height;
            const x = i * w + w * 0.18;
            const bw = w * 0.64;
            return (
              <g key={d.date}>
                <rect x={i * w} y={0} width={w} height={height} fill="transparent" onMouseEnter={() => setHover(i)} />
                {d.count > 0 && <rect x={x} y={height - h} width={bw} height={h} rx={0.9} className={cn("transition-[fill] duration-150", hover === i ? "fill-[#5A8FFF]" : "fill-[#3D7BFF]")} style={{ pointerEvents: "none" }} />}
                {d.count === 0 && <rect x={x} y={height - 1} width={bw} height={1} className="fill-white/10" />}
              </g>
            );
          })}
        </svg>
        {hover !== null && (
          <div className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full rounded-md border border-line-strong bg-surface-3 px-2.5 py-1.5 text-xs shadow-lg" style={{ left: `calc(${(hover + 0.5) * w}% - ${((hover + 0.5) / data.length) * 24}px)` }}>
            <p className="text-subtle">{formatDate(data[hover]!.date + "T12:00:00Z", { weekday: "short", month: "short", day: "numeric" })}</p>
            <p className="font-medium tabular text-fg">
              {data[hover]!.count} {label}
            </p>
          </div>
        )}
      </div>
      <div className="mt-2 flex justify-between pr-6 text-[10px] text-subtle" aria-hidden>
        <span>{formatDate(data[0]!.date + "T12:00:00Z")}</span>
        <span>{formatDate(data[data.length - 1]!.date + "T12:00:00Z")}</span>
      </div>
      <table className="sr-only">
        <caption>{label} per day</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.date}>
              <th scope="row">{d.date}</th>
              <td>{d.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** Magnitude across many categories: one hue, labeled rows — identity comes from the label, not color. */
export function CategoryBars({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((a, d) => a + d.value, 0);
  return (
    <ul className="space-y-2.5">
      {data.map((d) => (
        <li key={d.label} className="grid grid-cols-[112px_1fr_56px] items-center gap-3 text-[13px]">
          <span className="truncate text-muted">{d.label}</span>
          <span className="h-2 overflow-hidden rounded-sm bg-white/[0.05]" aria-hidden>
            <span className="block h-full rounded-r-[3px] bg-accent/80" style={{ width: `${(d.value / max) * 100}%` }} />
          </span>
          <span className="text-right tabular text-fg">
            {d.value}
            <span className="ml-1 text-[11px] text-subtle">{total ? Math.round((d.value / total) * 100) : 0}%</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
