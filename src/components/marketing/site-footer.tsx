import Link from "next/link";
import { Logo } from "@/components/ui/marks";

const COLUMNS = [
  { title: "Product", links: [["How it works", "/#how-it-works"], ["Matching engine", "/#matching"], ["Pricing", "/pricing"], ["Security", "/#security"]] },
  { title: "Candidates", links: [["Create account", "/signup"], ["Sign in", "/login"], ["International search", "/#international"]] },
  { title: "Company", links: [["Operations console", "/admin"], ["System status", "/api/health"]] },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-4 text-[13px] leading-relaxed text-muted">
            AI-powered, human-assisted job search for candidates building a career across borders.
          </p>
        </div>
        {COLUMNS.map((c) => (
          <div key={c.title}>
            <p className="text-[13px] font-medium text-fg">{c.title}</p>
            <ul className="mt-3 space-y-2.5">
              {c.links.map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="text-[13px] text-muted transition-colors hover:text-fg">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto flex max-w-[1200px] flex-col justify-between gap-2 border-t border-line px-4 py-6 text-xs text-subtle sm:flex-row sm:px-6">
        <p>© 2026 AutoApply. A capstone project.</p>
        <p>Nothing is ever submitted without your approval.</p>
      </div>
    </footer>
  );
}
