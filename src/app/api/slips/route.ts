import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

interface SlipLeg {
  homeTeam: string;
  awayTeam: string;
  league: string;
  prediction: string;
  predictionType: string;
  odds: string;
  matchTime: string;
}

const SLUG_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"; // no ambiguous chars
const SLUG_LENGTH = 6;

function generateSlug(): string {
  let slug = "";
  const bytes = new Uint8Array(SLUG_LENGTH);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < SLUG_LENGTH; i++) {
    slug += SLUG_ALPHABET[bytes[i] % SLUG_ALPHABET.length];
  }
  return slug;
}

/**
 * POST /api/slips
 * Body: { email?, legs, stake?, totalOdds?, potentialReturn? }
 * Creates a shareable slip and returns its public URL.
 */
export async function POST(request: NextRequest) {
  const rl = rateLimit(`slips:${getClientIp(request)}`, 20);
  if (!rl.ok) return rateLimitResponse(rl.retryAfterSec);

  try {
    const body = await request.json();
    const legs: SlipLeg[] = Array.isArray(body.legs) ? body.legs : [];

    if (legs.length === 0 || legs.length > 20) {
      return NextResponse.json(
        { error: "A slip needs between 1 and 20 legs" },
        { status: 400 }
      );
    }

    for (const leg of legs) {
      if (!leg?.homeTeam || !leg?.awayTeam || !leg?.prediction || !leg?.odds) {
        return NextResponse.json(
          { error: "Each leg needs homeTeam, awayTeam, prediction and odds" },
          { status: 400 }
        );
      }
    }

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() || null : null;
    const stake = Number.isFinite(Number(body.stake)) ? Math.round(Number(body.stake)) : null;
    const totalOdds = Number.isFinite(Number(body.totalOdds)) ? Number(body.totalOdds) : null;
    const potentialReturn = Number.isFinite(Number(body.potentialReturn))
      ? Math.round(Number(body.potentialReturn))
      : null;

    // Collision-safe: try a few slugs before failing
    let slug = generateSlug();
    for (let attempt = 0; attempt < 5; attempt++) {
      const existing = await db.orm.SharedSlip.first({ slug });
      if (!existing) break;
      slug = generateSlug();
    }

    const slip = await db.orm.SharedSlip.create({
      slug,
      email,
      legs: JSON.stringify(legs),
      stake,
      totalOdds,
      potentialReturn,
    });

    return NextResponse.json(
      {
        success: true,
        slug: slip.slug,
        url: `/slip/${slip.slug}`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create slip error:", error);
    return NextResponse.json(
      { error: "Failed to create slip" },
      { status: 500 }
    );
  }
}
