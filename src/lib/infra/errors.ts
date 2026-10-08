import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { logger } from "./logger";

export type ErrorCode = "unauthorized" | "forbidden" | "not_found" | "validation" | "conflict" | "rate_limited" | "plan_limit" | "internal";

const STATUS: Record<ErrorCode, number> = {
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  validation: 422,
  conflict: 409,
  rate_limited: 429,
  plan_limit: 402,
  internal: 500,
};

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
  }
  get status() {
    return STATUS[this.code];
  }
}

export const notFound = (what: string) => new AppError("not_found", `${what} not found`);
export const forbidden = (msg = "You don't have access to this resource") => new AppError("forbidden", msg);

/** Result shape every Server Action returns, so the client can render success and failure states uniformly. */
export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; code: ErrorCode; fieldErrors?: Record<string, string[]> };

export function toActionError(err: unknown, context: string): Extract<ActionResult, { ok: false }> {
  if (err instanceof AppError) {
    return { ok: false, error: err.message, code: err.code };
  }
  if (err instanceof z.ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const key = issue.path.join(".") || "_";
      (fieldErrors[key] ??= []).push(issue.message);
    }
    return { ok: false, error: "Please fix the highlighted fields.", code: "validation", fieldErrors };
  }
  // Next.js uses thrown errors for redirect()/notFound(); never swallow them.
  unstable_rethrow(err);
  logger.error("action.failed", { context, error: err });
  return { ok: false, error: "Something went wrong on our side. Please try again.", code: "internal" };
}

export function errorResponse(err: unknown, context: string) {
  unstable_rethrow(err);
  if (err instanceof AppError) {
    return Response.json({ error: { code: err.code, message: err.message } }, { status: err.status });
  }
  if (err instanceof z.ZodError) {
    return Response.json({ error: { code: "validation", message: "Invalid request", issues: err.issues } }, { status: 422 });
  }
  logger.error("route.failed", { context, error: err });
  return Response.json({ error: { code: "internal", message: "Internal error" } }, { status: 500 });
}
