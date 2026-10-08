import "server-only";
import { requestIp } from "@/lib/auth/dal";
import { systemRepo } from "@/lib/data";
import type { User } from "@/lib/domain/types";
import { logger } from "@/lib/infra/logger";

/** Append-only audit trail. Failures are logged but never break the user's action. */
export async function audit(
  actor: Pick<User, "id" | "role"> | null,
  action: string,
  entityType: string,
  entityId: string | null,
  meta: Record<string, unknown> = {},
) {
  try {
    await systemRepo().addAudit({
      actorId: actor?.id ?? null,
      actorRole: actor?.role ?? "system",
      action,
      entityType,
      entityId,
      meta,
      ip: actor ? await requestIp().catch(() => null) : null,
    });
  } catch (err) {
    logger.error("audit.write_failed", { action, error: err });
  }
}
