import type { NextRequest } from "next/server";
import { z } from "zod";
import { authorize } from "@/lib/auth/dal";
import { systemRepo } from "@/lib/data";
import { AppError, errorResponse } from "@/lib/infra/errors";
import { rateLimit } from "@/lib/infra/rate-limit";
import { listTracker, saveJob } from "@/lib/services/applications";

const Body = z.object({ jobId: z.string().min(1).max(64) });

export async function GET() {
  try {
    const user = await authorize(["candidate"]);
    await rateLimit("api", user.id);
    const apps = await listTracker(user);
    return Response.json({ data: apps.map((a) => ({ id: a.id, jobId: a.jobId, title: a.job.title, company: a.job.company.name, status: a.status, stage: a.stage, score: a.score, updatedAt: a.updatedAt })) });
  } catch (err) {
    return errorResponse(err, "api.applications.list");
  }
}

/**
 * POST /api/v1/applications — save a job to the tracker.
 * Requires an `Idempotency-Key` header; replays return the original response instead of acting twice.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await authorize(["candidate"]);
    await rateLimit("mutation", user.id);
    const key = req.headers.get("idempotency-key");
    if (!key || !/^[\w-]{8,100}$/.test(key)) throw new AppError("validation", "Send an Idempotency-Key header (8–100 url-safe characters).");

    const scoped = `applications:create:${user.id}:${key}`;
    const repo = systemRepo();
    const replay = await repo.getIdempotentResponse(scoped);
    if (replay) return Response.json(replay, { status: 200, headers: { "idempotent-replay": "true" } });

    const { jobId } = Body.parse(await req.json().catch(() => ({})));
    const app = await saveJob(user, jobId);
    const body = { id: app.id, jobId: app.jobId, status: app.status, createdAt: app.createdAt };
    await repo.saveIdempotentResponse(scoped, body);
    return Response.json(body, { status: 201 });
  } catch (err) {
    return errorResponse(err, "api.applications.create");
  }
}
