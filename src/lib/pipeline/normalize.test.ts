import { describe, expect, it } from "vitest";
import { detectSponsorship, inferSeniority, jobFingerprint, normalizePosting, normalizeTitle, parseLocation, parseSalary } from "./normalize";

describe("normalization", () => {
  it("cleans titles", () => {
    expect(normalizeTitle("Sr. Backend Eng (Payments) - Remote")).toBe("Senior Backend Engineer");
  });

  it("infers seniority", () => {
    expect(inferSeniority("Staff Engineer")).toBe("lead");
    expect(inferSeniority("Senior Designer")).toBe("senior");
    expect(inferSeniority("Head of Data")).toBe("executive");
    expect(inferSeniority("Software Engineer")).toBe("mid");
  });

  it("parses locations and work modes", () => {
    expect(parseLocation("Berlin, Germany (Hybrid)")).toEqual({ places: [{ city: "Berlin", country: "DE" }], workMode: "hybrid", remoteCountries: [] });
    expect(parseLocation("Austin, United States (Remote)").remoteCountries).toEqual(["US"]);
  });

  it("parses salary ranges across currencies", () => {
    expect(parseSalary("€90k–€115k")).toEqual({ min: 90000, max: 115000, currency: "EUR" });
    expect(parseSalary("AUD 150k–175k")).toEqual({ min: 150000, max: 175000, currency: "AUD" });
    expect(parseSalary("Competitive")).toBeNull();
  });

  it("detects sponsorship language", () => {
    expect(detectSponsorship("Visa sponsorship is available for this role.")).toBe("yes");
    expect(detectSponsorship("We are unable to sponsor visas.")).toBe("no");
    expect(detectSponsorship("Join our team.")).toBe("unknown");
  });

  it("fingerprints cross-posted roles identically", () => {
    expect(jobFingerprint("helix.example", "Sr. Backend Engineer - Remote", "NL")).toBe(jobFingerprint("HELIX.example", "Senior Backend Engineer", "nl"));
  });

  it("rejects malformed postings instead of throwing", () => {
    expect(normalizePosting({ source: "x" } as never, "c1", new Date().toISOString())).toBeNull();
  });
});
