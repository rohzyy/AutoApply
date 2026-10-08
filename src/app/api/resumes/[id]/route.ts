import { NextResponse, type NextRequest } from "next/server";
import { authorize } from "@/lib/auth/dal";
import { userRepo } from "@/lib/data";
import { errorResponse, notFound } from "@/lib/infra/errors";
import { rateLimit } from "@/lib/infra/rate-limit";
import { readDocument } from "@/lib/storage";
import { audit } from "@/lib/services/audit";

/** Owner-only download. Supabase: redirect to a 60-second signed URL. Demo: stream from memory. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/resumes/[id]">) {
  try {
    const user = await authorize();
    await rateLimit("api", user.id);
    const { id } = await ctx.params;
    const resume = await (await userRepo()).getResume(user.id, id);
    if (!resume) throw notFound("Resume");

    const doc = await readDocument(resume.storagePath);
    if (!doc) {
      return new NextResponse("This file isn't available — seeded demo resumes have no stored file. Upload your own to download it.", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
    }
    await audit(user, "resume.downloaded", "resume", id);
    if ("url" in doc) return NextResponse.redirect(doc.url);
    return new NextResponse(Buffer.from(doc.bytes), {
      headers: {
        "content-type": doc.mime,
        "content-disposition": `attachment; filename="${resume.fileName.replace(/"/g, "")}"`,
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (err) {
    return errorResponse(err, "resume.download");
  }
}
