"use client";

import { MotionConfig } from "framer-motion";

export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.35, ease: EASE_OUT }}>
      {children}
    </MotionConfig>
  );
}
