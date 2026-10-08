import { NextResponse, type NextRequest } from "next/server";
import { logger } from "@/lib/infra/logger";
import { exchangeOAuthCode } from "@/lib/services/auth";

/** OAuth / email-confirmation landing: trade the one-time code for a session cookie. */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const nextParam = url.searchParams.get("next") ?? "/dashboard";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/dashboard";

  if (!code) return NextResponse.redirect(new URL("/login?error=missing_code", url.origin));
  try {
    const user = await exchangeOAuthCode(code);
    const destination = user && user.role === "candidate" && !user.onboardedAt ? "/onboarding" : next;
    return NextResponse.redirect(new URL(destination, url.origin));
  } catch (err) {
    logger.warn("auth.callback_failed", { error: err });
    return NextResponse.redirect(new URL("/login?error=callback", url.origin));
  }
}
