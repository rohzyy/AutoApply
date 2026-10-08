import { describe, expect, it } from "vitest";
import { createDemoToken, verifyDemoToken } from "./demo-session";

const SECRET = "test-secret-that-is-long-enough-for-hmac-0001";

describe("demo session tokens", () => {
  it("round-trips a valid token", () => {
    expect(verifyDemoToken(createDemoToken("u1", SECRET), SECRET)?.uid).toBe("u1");
  });

  it("rejects tampered payloads and wrong secrets", () => {
    const token = createDemoToken("u1", SECRET);
    const [, mac] = token.split(".");
    const forged = `${Buffer.from(JSON.stringify({ uid: "admin", exp: 9e9 })).toString("base64url")}.${mac}`;
    expect(verifyDemoToken(forged, SECRET)).toBeNull();
    expect(verifyDemoToken(token, `${SECRET}x`)).toBeNull();
  });

  it("rejects expired tokens and fails closed without a secret", () => {
    const old = createDemoToken("u1", SECRET, Date.now() - 8 * 86_400_000);
    expect(verifyDemoToken(old, SECRET)).toBeNull();
    expect(verifyDemoToken(createDemoToken("u1", SECRET), "")).toBeNull();
    expect(() => createDemoToken("u1", "")).toThrow();
  });
});
