import "server-only";
import { systemRepo } from "@/lib/data";
import type { Notification } from "@/lib/domain/types";
import { logger } from "@/lib/infra/logger";

type Kind = Notification["type"];

const PREF: Partial<Record<Kind, "notifyNewMatches" | "notifyReviewComplete" | "notifyApplicationUpdates">> = {
  match: "notifyNewMatches",
  review: "notifyReviewComplete",
  application: "notifyApplicationUpdates",
};

/** In-app notification that respects the user's preferences. Email delivery would hang off the same call. */
export async function notify(userId: string, n: { type: Kind; title: string; body: string; href?: string | null }) {
  const repo = systemRepo();
  try {
    const key = PREF[n.type];
    if (key) {
      const settings = await repo.getSettings(userId);
      if (!settings[key]) return;
    }
    await repo.createNotification({ userId, type: n.type, title: n.title, body: n.body, href: n.href ?? null, readAt: null });
  } catch (err) {
    logger.error("notify.failed", { userId, type: n.type, error: err });
  }
}
