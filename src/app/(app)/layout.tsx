import { AppShell } from "@/components/app/shell/app-shell";

export default function CandidateLayout({ children }: { children: React.ReactNode }) {
  return <AppShell variant="candidate">{children}</AppShell>;
}
