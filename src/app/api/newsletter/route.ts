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

    const existing = await db.orm.Newsletter.where({ email: normalizedEmail }).first()

    if (existing) {
      return NextResponse.json(
        { success: true, message: 'Successfully subscribed!' },
        { status: 200 }
      )
    }

    await db.orm.Newsletter.create({
      email: normalizedEmail,
      subscribedAt: new Date(),
      active: 1,
    })

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
    const result = await db.orm.Newsletter.aggregate((a) => ({ count: a.count() }))
    return NextResponse.json({ subscribers: result.count })
  } catch {
    return NextResponse.json({ subscribers: 0 })
  }
}