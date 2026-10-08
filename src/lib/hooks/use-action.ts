"use client";

import { useCallback, useTransition } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/infra/errors";

/**
 * Runs a Server Action inside a transition and turns its typed result into UI feedback.
 * Callers get `pending` for loading states and the result for field-level errors.
 */
export function useAction<Args extends unknown[], T>(
  action: (...args: Args) => Promise<ActionResult<T>>,
  opts: { successToast?: boolean; errorToast?: boolean; onSuccess?: (data: T) => void } = {},
) {
  const [pending, startTransition] = useTransition();
  const { successToast = true, errorToast = true, onSuccess } = opts;

  const execute = useCallback(
    (...args: Args) =>
      new Promise<ActionResult<T>>((resolve) => {
        startTransition(async () => {
          let res: ActionResult<T>;
          try {
            res = await action(...args);
          } catch {
            res = { ok: false, error: "Network error — check your connection and try again.", code: "internal" };
          }
          if (res.ok) {
            if (successToast && res.message) toast.success(res.message);
            onSuccess?.(res.data);
          } else if (errorToast) {
            toast.error(res.error);
          }
          resolve(res);
        });
      }),
    [action, successToast, errorToast, onSuccess],
  );

  return { execute, pending };
}
