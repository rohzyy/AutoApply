import "server-only";
import { z } from "zod";
import { DEV_SESSION_SECRET } from "@/lib/auth/demo-session";

const ServerEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
  SUPABASE_STORAGE_BUCKET: z.string().default("documents"),
  SESSION_SECRET: z.string().min(32).optional(),
  ANTHROPIC_API_KEY: z.string().min(10).optional(),
  AI_MODEL: z.string().default("claude-opus-5-5"),
  CRON_SECRET: z.string().min(16).optional(),
  ADMIN_EMAILS: z.string().optional(),
});

export type ServerEnv = z.infer<typeof ServerEnvSchema> & { dataMode: "supabase" | "demo"; sessionSecret: string };

let cached: ServerEnv | null = null;


export function serverEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = ServerEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid environment configuration: ${parsed.error.issues.map((i) => i.path.join(".")).join(", ")}`);
  }
  const env = parsed.data;
  const dataMode = env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY && env.SUPABASE_SERVICE_ROLE_KEY ? "supabase" : "demo";

  // Empty in production without SESSION_SECRET: sessions can't be signed or verified, so demo sign-in fails closed.
  const sessionSecret = env.SESSION_SECRET ?? (env.NODE_ENV === "production" ? "" : DEV_SESSION_SECRET);
  cached = { ...env, dataMode, sessionSecret };
  return cached;
}

export const isDemoMode = () => serverEnv().dataMode === "demo";
