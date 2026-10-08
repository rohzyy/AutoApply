import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { userRepo } from "@/lib/data";
import type { User } from "@/lib/domain/types";
import { serverEnv } from "@/lib/env";
import { AppError } from "@/lib/infra/errors";
import { createSessionClient } from "@/lib/supabase/server";
import { DEMO_SESSION_COOKIE, verifyDemoToken } from "./demo-session";

/**
 * Data Access Layer for identity. Every page, action and route handler resolves the
 * caller through here — never from client-provided ids.
 */
export const getSessionUserId = cache(async (): Promise<string | null> => {
  // Identity is per-request by definition: opt out of prerendering before touching the clock or cookies.
  await connection();
  const env = serverEnv();
  if (env.dataMode === "demo") {
    const token = (await cookies()).get(DEMO_SESSION_COOKIE)?.value;
    return verifyDemoToken(token, env.sessionSecret)?.uid ?? null;
  }
  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  return data.claims.sub;
});

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const uid = await getSessionUserId();
  if (!uid) return null;
  return (await userRepo()).getUser(uid);
});

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Candidate surfaces: signed in and finished onboarding. */
export async function requireCandidate(): Promise<User> {
  const user = await requireUser();
  if (user.role === "candidate" && !user.onboardedAt) redirect("/onboarding");
  return user;
}

export async function requireStaff(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "admin" && user.role !== "reviewer") redirect("/dashboard");
  return user;
}

export const isStaff = (u: User) => u.role === "admin" || u.role === "reviewer";

/** For Server Actions / route handlers: throw instead of redirecting. */
export async function authorize(roles?: User["role"][]): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new AppError("unauthorized", "Please sign in to continue.");
  if (roles && !roles.includes(user.role)) throw new AppError("forbidden", "You don't have permission to do that.");
  return user;
}

export async function requestIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
}
