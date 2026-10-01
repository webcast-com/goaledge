import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

type RequestRecord = { url: URL; init?: RequestInit };

let requests: RequestRecord[];
let responseForRequest: (request: RequestRecord) => Response;
let db: typeof import("./db").db;

function jsonResponse(data: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

beforeEach(async () => {
  vi.resetModules();
  requests = [];
  responseForRequest = () => jsonResponse([]);
  vi.stubEnv("SUPABASE_URL", "https://goaledge-test.supabase.co");
  vi.stubEnv("SUPABASE_SECRET_KEY", "test-server-key");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = { url: new URL(String(input)), init };
      requests.push(request);
      return responseForRequest(request);
    }),
  );

  ({ db } = await import("./db"));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Supabase database adapter", () => {
  it("translates filters, ordering and dates to PostgREST and decodes rows", async () => {
    responseForRequest = () =>
      jsonResponse(
        [{
          id: "tip-1",
          status: "upcoming",
          created_at: "2026-09-30T10:00:00.000Z",
          updated_at: "2026-09-30T10:00:00.000Z",
        }],
        { "Content-Range": "0-0/1" },
      );

    const cutoff = new Date("2026-09-01T00:00:00.000Z");
    const tips = await db.orm.Tip.where({ status: "upcoming" })
      .where((tip) => tip.createdAt.gte(cutoff))
      .orderBy((tip) => tip.createdAt.desc())
      .limit(10)
      .all();

    expect(tips).toHaveLength(1);
    expect(tips[0].createdAt).toBeInstanceOf(Date);
    expect(tips[0].createdAt.toISOString()).toBe("2026-09-30T10:00:00.000Z");
    expect(requests).toHaveLength(1);
    expect(requests[0].url.pathname).toBe("/rest/v1/tips");
    expect(requests[0].url.searchParams.get("status")).toBe("eq.upcoming");
    expect(requests[0].url.searchParams.get("created_at")).toBe("gte.2026-09-01T00:00:00.000Z");
    expect(requests[0].url.searchParams.get("order")).toBe("created_at.desc");
    expect(new Headers(requests[0].init?.headers).get("apikey")).toBe("test-server-key");
    expect(new Headers(requests[0].init?.headers).get("authorization")).toBe("Bearer test-server-key");
  });

  it("encodes writes as snake_case and decodes the returned row", async () => {
    responseForRequest = () =>
      jsonResponse({
        id: "setting-1",
        key: "football_api_key",
        value: "saved-key",
        updated_at: "2026-10-01T12:00:00.000Z",
      });

    const saved = await db.orm.AppSetting.create({
      key: "football_api_key",
      value: "saved-key",
      updatedAt: new Date("2026-10-01T12:00:00.000Z"),
    });

    expect(saved.updatedAt).toBeInstanceOf(Date);
    expect(requests[0].url.pathname).toBe("/rest/v1/app_settings");
    expect(JSON.parse(String(requests[0].init?.body))).toEqual({
      key: "football_api_key",
      value: "saved-key",
      updated_at: "2026-10-01T12:00:00.000Z",
    });
  });

  it("uses the update branch of upsert without overwriting omitted fields", async () => {
    responseForRequest = (request) => {
      if (request.init?.method === "PATCH") {
        return jsonResponse([{
          id: "tip-1",
          league: "Premier League",
          home_team: "Arsenal",
          status: "won",
          updated_at: "2026-10-01T12:00:00.000Z",
        }]);
      }
      return jsonResponse([{ id: "tip-1", status: "won" }]);
    };

    const result = await db.orm.Tip.where({ id: "tip-1" }).upsert({
      create: { id: "tip-1", league: "Premier League", homeTeam: "Arsenal" },
      update: { league: "Premier League", homeTeam: "Arsenal" },
    });

    expect(result?.status).toBe("won");
    expect(requests).toHaveLength(2);
    expect(requests[1].init?.method).toBe("PATCH");
    expect(JSON.parse(String(requests[1].init?.body))).toMatchObject({
      league: "Premier League",
      home_team: "Arsenal",
    });
    expect(JSON.parse(String(requests[1].init?.body))).not.toHaveProperty("status");
  });

  it("loads included referral users with a follow-up query and preserves field selection", async () => {
    responseForRequest = (request) => {
      if (request.url.pathname.endsWith("/referrals")) {
        return jsonResponse([{
          id: "ref-1",
          referrer_id: "user-1",
          referred_id: "user-2",
          status: "pending",
        }]);
      }
      if (request.url.pathname.endsWith("/users")) {
        return jsonResponse([{ id: "user-2", name: "New member", email: "new@example.com" }]);
      }
      return jsonResponse([]);
    };

    const referrals = await db.orm.Referral.include("referred", (user) =>
      user.select("name", "email"),
    ).all();

    expect(referrals[0].referred).toEqual({ name: "New member", email: "new@example.com" });
    expect(requests).toHaveLength(2);
    expect(requests[1].url.pathname).toBe("/rest/v1/users");
    expect(requests[1].url.searchParams.get("select")).toBe("name,email,id");
    expect(requests[1].url.searchParams.get("id")).toBe("in.(user-2)");
  });

  it("uses Supabase exact counts for aggregate queries", async () => {
    responseForRequest = () => new Response(null, {
      status: 200,
      headers: { "Content-Range": "*/7" },
    });

    await expect(db.orm.Newsletter.aggregate((a) => ({ subscribers: a.count() })))
      .resolves.toEqual({ subscribers: 7 });
    expect(requests[0].url.pathname).toBe("/rest/v1/newsletter_subscribers");
    expect(requests[0].init?.method).toBe("HEAD");
  });
});
