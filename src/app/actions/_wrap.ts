import "server-only";
import { refresh } from "next/cache";
import { authorize } from "@/lib/auth/dal";
import type { User } from "@/lib/domain/types";
import { rateLimit } from "@/lib/infra/rate-limit";
import { toActionError, type ActionResult } from "@/lib/infra/errors";

/**
 * Every mutation goes through here: authenticate (and optionally check role), apply a
 * per-user mutation rate limit, map failures to a typed result, and refresh the router.
 */
export async function run<T>(
  context: string,
  fn: (user: User) => Promise<T>,
  opts: { roles?: User["role"][]; message?: string; refresh?: boolean } = {},
): Promise<ActionResult<T>> {
  try {
    const user = await authorize(opts.roles);
    await rateLimit("mutation", user.id);
    const data = await fn(user);
    if (opts.refresh !== false) refresh();
    return { ok: true, data, message: opts.message };
  } catch (err) {
    return toActionError(err, context);
  }
}
