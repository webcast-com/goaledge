import { afterEach, describe, expect, it } from "vitest";

import {
  DEFAULT_SESSION_MAX_AGE,
  createSessionToken,
  sessionSecret,
  verifySessionToken,
} from "./session-token";

const user = {
  id: "user_123",
  email: "tester@goaledge.com",
  name: "Tester",
  plan: "premium",
};

function b64url(value: string): string {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

afterEach(() => {
  delete process.env.AUTH_SECRET;
  delete process.env.NEXTAUTH_SECRET;
});

describe("createSessionToken", () => {
  it("issues a compact JWS with three base64url segments", async () => {
    const { token } = await createSessionToken(user);
    const parts = token.split(".");
    expect(parts).toHaveLength(3);
    for (const part of parts) {
      expect(part).toMatch(/^[A-Za-z0-9_-]+$/);
    }
    expect(JSON.parse(Buffer.from(parts[0], "base64url").toString())).toEqual({
      alg: "HS256",
      typ: "JWT",
    });
  });

  it("defaults to a 30 day lifetime", async () => {
    const { expiresAt } = await createSessionToken(user);
    const deltaSec = (expiresAt.getTime() - Date.now()) / 1000;
    expect(DEFAULT_SESSION_MAX_AGE).toBe(30 * 24 * 60 * 60);
    expect(deltaSec).toBeGreaterThan(DEFAULT_SESSION_MAX_AGE - 60);
    expect(deltaSec).toBeLessThanOrEqual(DEFAULT_SESSION_MAX_AGE);
  });

  it("never puts the password in the claims", async () => {
    const { claims } = await createSessionToken({
      ...user,
      password: "hunter2",
    } as typeof user);
    expect(JSON.stringify(claims)).not.toContain("hunter2");
  });
});

describe("verifySessionToken", () => {
  it("round-trips the claims", async () => {
    const { token } = await createSessionToken(user);
    const claims = await verifySessionToken(token);
    expect(claims).toMatchObject({
      sub: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan,
    });
    expect(claims?.exp).toBeGreaterThan(claims?.iat ?? 0);
  });

  it("rejects an empty or malformed token", async () => {
    expect(await verifySessionToken(null)).toBeNull();
    expect(await verifySessionToken(undefined)).toBeNull();
    expect(await verifySessionToken("")).toBeNull();
    expect(await verifySessionToken("not-a-token")).toBeNull();
    expect(await verifySessionToken("a.b")).toBeNull();
  });

  it("rejects a tampered payload", async () => {
    const { token } = await createSessionToken(user);
    const [header, payload, signature] = token.split(".");
    const forged = b64url(
      JSON.stringify({ sub: user.id, email: "admin@goaledge.com", plan: "premium", iat: 0, exp: 9_999_999_999 })
    );
    expect(await verifySessionToken(`${header}.${forged}.${signature}`)).toBeNull();
  });

  it("rejects a tampered signature", async () => {
    const { token } = await createSessionToken(user);
    const flipped = token.slice(0, -2) + (token.endsWith("A") ? "BB" : "AA");
    expect(await verifySessionToken(flipped)).toBeNull();
  });

  it("rejects a token signed with a different secret", async () => {
    process.env.AUTH_SECRET = "secret-one";
    const { token } = await createSessionToken(user);
    process.env.AUTH_SECRET = "secret-two";
    expect(await verifySessionToken(token)).toBeNull();
  });

  it("rejects an expired token", async () => {
    const { token } = await createSessionToken(user, -60);
    expect(await verifySessionToken(token)).toBeNull();
  });

  it('rejects alg:"none" tokens', async () => {
    const header = b64url(JSON.stringify({ alg: "none", typ: "JWT" }));
    const payload = b64url(
      JSON.stringify({ sub: user.id, email: user.email, iat: 0, exp: 9_999_999_999 })
    );
    expect(await verifySessionToken(`${header}.${payload}.`)).toBeNull();
    expect(await verifySessionToken(`${header}.${payload}.sig`)).toBeNull();
  });

  it("falls back to NEXTAUTH_SECRET so old cookies survive the upgrade", async () => {
    process.env.NEXTAUTH_SECRET = "legacy-secret";
    expect(sessionSecret()).toBe("legacy-secret");
    const { token } = await createSessionToken(user);

    delete process.env.NEXTAUTH_SECRET;
    process.env.AUTH_SECRET = "legacy-secret";
    expect(await verifySessionToken(token)).toMatchObject({ sub: user.id });
  });

  it("prefers AUTH_SECRET over NEXTAUTH_SECRET", () => {
    process.env.NEXTAUTH_SECRET = "legacy-secret";
    process.env.AUTH_SECRET = "new-secret";
    expect(sessionSecret()).toBe("new-secret");
  });
});
