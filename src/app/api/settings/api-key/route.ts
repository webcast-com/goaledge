import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/settings/api-key
 * Returns whether an API key is configured (never the key itself).
 * Also validates the key by making a test request to football-data.org.
 */
export async function GET() {
  try {
    const setting = await db.appSetting.findUnique({
      where: { key: "football_api_key" },
    });

    const apiKey = setting?.value || process.env.FOOTBALL_API_KEY || "";

    if (!apiKey) {
      return NextResponse.json({
        configured: false,
        source: apiKey ? "env" : null,
        validated: false,
      });
    }

    // Validate the key with a lightweight test request
    let validated = false;
    let testError = "";
    let plan = "";
    try {
      const res = await fetch("https://api.football-data.org/v4/competitions/PL", {
        headers: { "X-Auth-Token": apiKey },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        validated = true;
        const data = await res.json();
        // Check rate limit headers
        const remaining = res.headers.get("x-requests-available-remaining");
        const limit = res.headers.get("x-requests-available");
        plan = data.competition ? "active" : "unknown";
      } else if (res.status === 429) {
        validated = true; // Key works, just rate limited
        testError = "Rate limited — too many requests";
      } else if (res.status === 403) {
        validated = false;
        testError = "Invalid API key";
      } else {
        testError = `HTTP ${res.status}`;
      }
    } catch (err) {
      testError = err instanceof Error ? err.message : "Connection failed";
    }

    return NextResponse.json({
      configured: validated,
      source: setting ? "database" : "env",
      validated,
      error: testError,
      plan,
    });
  } catch {
    return NextResponse.json(
      { configured: false, error: "Failed to check settings" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/settings/api-key
 * Save an API key to the database and validate it.
 * Body: { key: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const apiKey = body?.key?.trim();

    if (!apiKey || apiKey.length < 10) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid API key" },
        { status: 400 },
      );
    }

    // Validate the key before saving
    let validated = false;
    let testData: Record<string, unknown> | null = null;
    let testError = "";
    try {
      const res = await fetch("https://api.football-data.org/v4/competitions/PL", {
        headers: { "X-Auth-Token": apiKey },
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        validated = true;
        const data = await res.json();
        testData = {
          competition: data.competition?.name || "Premier League",
          remaining: res.headers.get("x-requests-available-remaining"),
          limit: res.headers.get("x-requests-available"),
        };
      } else if (res.status === 429) {
        validated = true;
        testError = "Key valid but rate-limited right now";
      } else if (res.status === 403) {
        testError = "Invalid API key — access denied";
      } else if (res.status === 404) {
        testError = "Invalid API key — endpoint not found";
      } else {
        testError = `API returned status ${res.status}`;
      }
    } catch (err) {
      testError = err instanceof Error ? err.message : "Connection failed";
    }

    if (!validated) {
      return NextResponse.json({
        success: false,
        error: testError || "Could not validate the API key",
      });
    }

    // Save to database
    await db.appSetting.upsert({
      where: { key: "football_api_key" },
      create: { key: "football_api_key", value: apiKey },
      update: { value: apiKey },
    });

    return NextResponse.json({
      success: true,
      message: "API key saved and validated!",
      test: testData,
      warning: testError || undefined,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to save API key" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/settings/api-key
 * Remove the stored API key from the database.
 */
export async function DELETE() {
  try {
    await db.appSetting.deleteMany({
      where: { key: "football_api_key" },
    });

    // Clear in-memory cache in football-api
    try {
      const { clearApiKey } = await import("@/lib/football-api");
      clearApiKey();
    } catch {
      // ignore
    }

    return NextResponse.json({
      success: true,
      message: "API key removed",
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to remove API key" },
      { status: 500 },
    );
  }
}