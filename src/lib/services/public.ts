import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { systemRepo } from "@/lib/data";

export const PLANS_TAG = "plans";

/** Pricing is data. Cached into the static shell and invalidated when an admin edits a plan. */
export async function publicPlans() {
  "use cache";
  cacheTag(PLANS_TAG);
  cacheLife("hours");
  return systemRepo().listPlans();
}
