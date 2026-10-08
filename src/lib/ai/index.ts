import "server-only";
import { serverEnv } from "@/lib/env";
import { logger } from "@/lib/infra/logger";
import { AnthropicProvider } from "./anthropic";
import { HeuristicProvider } from "./heuristic";
import type { AIProvider, TailoringInput } from "./types";

let primary: AIProvider | null = null;
const fallback = new HeuristicProvider();

export function getAIProvider(): AIProvider {
  if (primary) return primary;
  const env = serverEnv();
  primary = env.ANTHROPIC_API_KEY ? new AnthropicProvider({ apiKey: env.ANTHROPIC_API_KEY, model: env.AI_MODEL }) : fallback;
  return primary;
}

/**
 * Runs a model-backed task and degrades to the deterministic provider on failure,
 * so a provider outage never blocks a candidate's workflow.
 */
export async function withFallback<T>(task: string, run: (p: AIProvider) => Promise<T>): Promise<{ result: T; provider: AIProvider }> {
  const provider = getAIProvider();
  const started = Date.now();
  try {
    const result = await run(provider);
    logger.info("ai.task.succeeded", { task, provider: provider.name, model: provider.model, ms: Date.now() - started });
    return { result, provider };
  } catch (err) {
    if (provider === fallback) throw err;
    logger.warn("ai.task.fallback", { task, provider: provider.name, error: err instanceof Error ? err.message : String(err) });
    return { result: await run(fallback), provider: fallback };
  }
}

export type { AIProvider, TailoringInput };
