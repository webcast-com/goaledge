import { NextRequest, NextResponse } from "next/server";

import { buildSession, getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/session
 *
 * Replaces NextAuth's `GET /api/auth/session`. Returns the signed-in user, or
 * `{ session: null }` for guests — always 200, so the client can call it on
 * every load without special-casing errors.
 *
 * The cookie is verified and the user re-read from the database, so plan
 * changes (premium purchase, referral bonus) show up on the next refresh.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    return NextResponse.json(
      { session: user ? buildSession(user) : null, user },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("Session error:", error);
    return NextResponse.json(
      { session: null, user: null, error: "Failed to read session" },
      { status: 500 }
    );
  }
}
