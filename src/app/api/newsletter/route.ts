import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getClientIp, rateLimit, rateLimitResponse } from '@/lib/rate-limit'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest) {
  // Rate limit: max 10 signups per IP per minute
  const rl = rateLimit(`newsletter:${getClientIp(request)}`, 10);
  if (!rl.ok) return rateLimitResponse(rl.retryAfterSec);

  try {
    const body = await request.json()
    const { email } = body

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid email address' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase()

    // Use $queryRaw to bypass potential Turbopack model caching issues
    const existing = await db.$queryRawUnsafe(
      `SELECT id FROM Newsletter WHERE email = '${normalizedEmail.replace(/'/g, "''")}' LIMIT 1`
    ) as Array<{ id: number }>

    if (existing.length > 0) {
      return NextResponse.json(
        { success: true, message: 'Successfully subscribed!' },
        { status: 200 }
      )
    }

    await db.$executeRawUnsafe(
      `INSERT INTO Newsletter (email, "subscribedAt", active) VALUES ('${normalizedEmail.replace(/'/g, "''")}', datetime('now'), 1)`
    )

    return NextResponse.json(
      { success: true, message: 'Welcome aboard! Check your email.' },
      { status: 201 }
    )
  } catch (error: unknown) {
    console.error('Newsletter API error:', error)
    return NextResponse.json(
      { success: false, error: 'Something went wrong' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const result = await db.$queryRawUnsafe('SELECT COUNT(*) as count FROM Newsletter') as Array<{ count: number }>
    return NextResponse.json({ subscribers: result[0]?.count ?? 0 })
  } catch {
    return NextResponse.json({ subscribers: 0 })
  }
}