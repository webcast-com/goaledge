import { NextRequest, NextResponse } from "next/server";

import { clearSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/logout
 *
 * Replaces NextAuth's `POST /api/auth/signout`. Expires the session cookie —
 * the token itself is stateless, so there is nothing to delete server-side.
 */
export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true, session: null });
  clearSession(response, request);
  return response;
}
