import type { NextRequest } from "next/server";
import { authorize } from "@/lib/auth/dal";
import { errorResponse } from "@/lib/infra/errors";
import { rateLimit } from "@/lib/infra/rate-limit";
import { jobFeed, parseJobFilters } from "@/lib/services/jobs";

/** GET /api/v1/matches — the signed-in candidate's ranked, explained matches. Same filters as the UI. */
export async function GET(req: NextRequest) {
  try {
    const user = await authorize(["candidate"]);
    await rateLimit("api", user.id);
    const filters = parseJobFilters(Object.fromEntries(req.nextUrl.searchParams));
    const feed = await jobFeed(user, filters);
    return Response.json(
      {
        total: feed.total,
        count: feed.items.length,
        data: feed.items.map((m) => ({
          jobId: m.jobId,
          title: m.job.title,
          company: m.job.company.name,
          locations: m.job.locations,
          workMode: m.job.workMode,
          salary: m.job.salary,
          score: m.score,
          eligibility: m.breakdown.eligibility,
          factors: m.breakdown.factors.map((f) => ({ key: f.key, rating: f.rating, score: f.score, reason: f.reason })),
          missingSkills: m.breakdown.missingSkills,
          applicationStatus: m.applicationStatus,
        })),
      },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (err) {
    return errorResponse(err, "api.matches");
  }
}
