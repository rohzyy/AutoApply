import "server-only";
import { randomUUID } from "node:crypto";
import { systemRepo, userRepo } from "@/lib/data";
import type { Plan, PlanId, User } from "@/lib/domain/types";
import { AppError } from "@/lib/infra/errors";
import { audit } from "./audit";
import { notify } from "./notifications";

/* ---------- Payment provider abstraction ---------- */

export interface ChargeResult {
  ok: boolean;
  providerRef: string;
  error?: string;
}

export interface PaymentProvider {
  name: string;
  charge(input: { userId: string; amount: number; currency: string; description: string; idempotencyKey: string }): Promise<ChargeResult>;
}

/** Stand-in for Stripe/Paddle. Swap in a real adapter; checkout + webhooks write the same tables. */
class MockPaymentProvider implements PaymentProvider {
  name = "mock";
  async charge(input: { idempotencyKey: string }) {
    return { ok: true, providerRef: `pi_mock_${input.idempotencyKey.slice(0, 18)}` };
  }
}

const payments: PaymentProvider = new MockPaymentProvider();

/* ---------- Plans & limits ---------- */

export async function listPlans() {
  return systemRepo().listPlans();
}

export async function currentPlan(userId: string): Promise<{ plan: Plan; subscription: Awaited<ReturnType<ReturnType<typeof systemRepo>["getSubscription"]>> }> {
  const repo = systemRepo();
  const [sub, plans] = await Promise.all([repo.getSubscription(userId), repo.listPlans({ includeInactive: true })]);
  const plan = plans.find((p) => p.id === (sub?.planId ?? "entry")) ?? plans[0]!;
  return { plan, subscription: sub };
}

const monthStart = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
};

export async function assertWithinLimit(userId: string, kind: "tailored" | "review") {
  const { plan } = await currentPlan(userId);
  const repo = systemRepo();
  if (kind === "tailored") {
    const limit = plan.limits.tailoredPerMonth;
    if (limit === null) return;
    const used = await repo.countTailoredSince(userId, monthStart());
    if (used >= limit) throw new AppError("plan_limit", `You've used all ${limit} tailored applications on ${plan.name} this month. Upgrade for more.`);
  } else {
    const limit = plan.limits.humanReviewsPerMonth;
    if (limit === null) return;
    if (limit === 0) throw new AppError("plan_limit", `Human review is included from the Professional plan.`);
    const used = await repo.countReviewsSince(userId, monthStart());
    if (used >= limit) throw new AppError("plan_limit", `You've used all ${limit} human reviews on ${plan.name} this month.`);
  }
}

export async function usage(userId: string) {
  const repo = systemRepo();
  const since = monthStart();
  const [{ plan, subscription }, tailored, reviews] = await Promise.all([currentPlan(userId), repo.countTailoredSince(userId, since), repo.countReviewsSince(userId, since)]);
  return { plan, subscription, tailored, reviews };
}

export async function changePlan(user: User, planId: PlanId, interval: "month" | "year") {
  const repo = systemRepo();
  const plan = (await repo.listPlans()).find((p) => p.id === planId);
  if (!plan) throw new AppError("not_found", "That plan isn't available.");
  const current = await repo.getSubscription(user.id);
  if (current?.planId === planId && current.interval === interval && current.status === "active") {
    throw new AppError("conflict", `You're already on ${plan.name}.`);
  }

  const amount = interval === "year" ? plan.priceYearly : plan.priceMonthly;
  const idempotencyKey = randomUUID();
  const charge = await payments.charge({ userId: user.id, amount, currency: plan.currency, description: `${plan.name} — ${interval}ly`, idempotencyKey });
  const periodEnd = new Date(Date.now() + (interval === "year" ? 365 : 30) * 86_400_000).toISOString();

  const subscription = await repo.upsertSubscription({ userId: user.id, planId, status: charge.ok ? "active" : "past_due", interval, currentPeriodEnd: periodEnd, cancelAtPeriodEnd: false });
  await repo.createPayment({
    userId: user.id,
    subscriptionId: subscription.id,
    amount,
    currency: plan.currency,
    status: charge.ok ? "succeeded" : "failed",
    provider: payments.name,
    providerRef: charge.providerRef,
    description: `${plan.name} — ${interval === "year" ? "annual" : "monthly"}`,
  });
  await audit(user, "subscription.changed", "subscription", subscription.id, { from: current?.planId ?? null, to: planId, interval });
  if (!charge.ok) throw new AppError("internal", charge.error ?? "Payment failed. Please try another method.");
  await notify(user.id, { type: "billing", title: `You're on ${plan.name}`, body: `Your plan changed to ${plan.name}. Receipt is in Settings.`, href: "/settings#billing" });
  return subscription;
}

export async function cancelSubscription(user: User) {
  const repo = systemRepo();
  const sub = await repo.getSubscription(user.id);
  if (!sub) throw new AppError("not_found", "No active subscription.");
  await repo.upsertSubscription({ ...sub, cancelAtPeriodEnd: true });
  await audit(user, "subscription.cancel_scheduled", "subscription", sub.id);
}

export async function billingOverview(user: User) {
  const [u, paymentsList] = await Promise.all([usage(user.id), (await userRepo()).listPayments(user.id)]);
  return { ...u, payments: paymentsList };
}
