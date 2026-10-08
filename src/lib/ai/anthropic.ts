import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { countryName } from "@/lib/domain/constants";
import type { AIProvider, ResumeExtraction, TailoringInput, TailoringOutput } from "./types";

const TailoringSchema = z.object({
  summary: z.string(),
  bullets: z.array(z.object({ original: z.string(), suggested: z.string(), reason: z.string() })),
  coverLetter: z.string(),
  skillAlignment: z.array(
    z.object({ skill: z.string(), status: z.enum(["matched", "transferable", "missing"]), evidence: z.string() }),
  ),
  recommendations: z.array(z.string()),
});

const ExtractionSchema = z.object({
  skills: z.array(z.object({ name: z.string(), level: z.number().int(), years: z.number() })),
  yearsExperience: z.number().nullable(),
  headline: z.string().nullable(),
});

const TAILOR_SYSTEM = `You are AutoApply's application tailoring assistant. You help international job candidates adapt their existing resume and write a cover letter for one specific role.

Rules that matter more than polish:
- Never invent employers, titles, dates, credentials, or metrics. Rewrites may reorder, sharpen, and surface skills the candidate already demonstrated; if a bullet would benefit from a number the candidate hasn't given, say so in the reason instead of making one up.
- Only rewrite bullets taken verbatim from the candidate's experience highlights, and copy the original text exactly into "original".
- For each required skill of the job, classify it as matched (clear evidence in the profile), transferable (closely related evidence), or missing, and cite the evidence briefly.
- Be candid about work authorization. If the candidate needs sponsorship, the cover letter should state it plainly and note relocation readiness, without apologizing.
- Recommendations are concrete next actions for the candidate, at most five.
- The cover letter is 4-6 short paragraphs, specific to the company, signed with the candidate's name. No generic filler.
The candidate reviews and approves everything before a human specialist checks it, so prefer accuracy over persuasion.`;

export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic";
  readonly model: string;
  private client: Anthropic;

  constructor(opts: { apiKey: string; model?: string }) {
    this.client = new Anthropic({ apiKey: opts.apiKey, maxRetries: 2, timeout: 90_000 });
    this.model = opts.model ?? "claude-opus-5-5";
  }

  async tailor(input: TailoringInput): Promise<TailoringOutput> {
    const { profile, job, breakdown, candidateName, resumeText } = input;
    const context = {
      candidate: {
        name: candidateName,
        headline: profile.headline,
        summary: profile.summary,
        location: `${profile.location.city}, ${countryName(profile.location.country)}`,
        yearsExperience: profile.yearsExperience,
        seniority: profile.seniority,
        skills: profile.skills.map((s) => `${s.name} (${s.years}y)`),
        experience: profile.experience.map((e) => ({
          company: e.company,
          title: e.title,
          period: `${e.startDate} – ${e.endDate ?? "present"}`,
          highlights: e.highlights,
          skills: e.skills,
        })),
        requiresSponsorship: profile.requiresSponsorship,
      },
      job: {
        title: job.title,
        company: job.company.name,
        companyDescription: job.company.description,
        location: job.locations.map((l) => `${l.city}, ${countryName(l.country)}`).join("; "),
        workMode: job.workMode,
        description: job.description,
        responsibilities: job.responsibilities,
        requiredSkills: job.requiredSkills,
        niceToHaveSkills: job.niceToHaveSkills,
        minYears: job.minYears,
        visaSponsorship: job.visaSponsorship,
      },
      matchAnalysis: {
        eligibility: breakdown.eligibility,
        factors: breakdown.factors.map((f) => `${f.label}: ${f.rating} — ${f.reason}`),
        missingSkills: breakdown.missingSkills,
      },
    };

    const content = [
      resumeText ? `<resume>\n${resumeText}\n</resume>` : "",
      `<context>\n${JSON.stringify(context, null, 2)}\n</context>`,
      "Produce the tailoring package for this candidate and role.",
    ]
      .filter(Boolean)
      .join("\n\n");

    const response = await this.client.beta.messages.parse({
      model: this.model,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: TAILOR_SYSTEM,
      messages: [{ role: "user", content }],
      output_config: { effort: "medium", format: betaZodOutputFormat(TailoringSchema) },
    });

    if (response.stop_reason === "refusal") throw new Error("Model declined the tailoring request");
    if (!response.parsed_output) throw new Error(`Unparseable tailoring output (stop_reason=${response.stop_reason})`);
    return response.parsed_output;
  }

  async extractResume(text: string): Promise<ResumeExtraction> {
    const response = await this.client.beta.messages.parse({
      model: this.model,
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system:
        "Extract structured data from a resume. Skills: canonical names (e.g. 'TypeScript', 'PostgreSQL'), level 1-5 from evidence, years of use. yearsExperience: total professional years, or null. headline: the candidate's current professional title, or null. Only use information present in the text.",
      messages: [{ role: "user", content: `<resume>\n${text.slice(0, 60_000)}\n</resume>` }],
      output_config: { effort: "low", format: betaZodOutputFormat(ExtractionSchema) },
    });

    if (response.stop_reason === "refusal" || !response.parsed_output) throw new Error("Resume extraction failed");
    const out = response.parsed_output;
    return {
      ...out,
      skills: out.skills.map((s) => ({ ...s, level: Math.min(5, Math.max(1, s.level)) as 1 | 2 | 3 | 4 | 5 })),
    };
  }
}
