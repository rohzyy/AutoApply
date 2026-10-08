import "server-only";
import { serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSessionClient } from "@/lib/supabase/server";
import { MemoryRepository } from "./memory";
import type { Repository } from "./repository";
import { SupabaseRepository } from "./supabase";

const memory = new MemoryRepository();

/**
 * Repository bound to the signed-in user's session. In Supabase mode every query runs
 * under Row Level Security, so a bug in a service can't leak another user's data.
 */
export async function userRepo(): Promise<Repository> {
  if (serverEnv().dataMode === "demo") return memory;
  return new SupabaseRepository(await createSessionClient());
}

/**
 * Privileged repository for system-authored writes (matching worker, AI events, audit logs)
 * and staff operations. Callers must authorize the actor before using it.
 */
export function systemRepo(): Repository {
  if (serverEnv().dataMode === "demo") return memory;
  return new SupabaseRepository(createAdminClient());
}

export type { Repository };
