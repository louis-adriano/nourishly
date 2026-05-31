import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { anthropic } from '@/lib/claude/client'

// ─── Session-based substitution counter ───────────────────────────────────────
// Stored in memory on the server. Resets if the server restarts (fine for dev
// and capstone). For production you'd move this into a DB or Redis.

const SUBSTITUTION_LIMIT = 10

// Map<sessionId, count>
const substitutionCounts = new Map<string, number>()

function getSessionId(): string {
  const cookieStore = cookies()
  let sessionId = cookieStore.get('substitution_session')?.value

  if (!sessionId) {
    // Generate a simple unique ID — no extra libraries needed
    sessionId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  }

  return sessionId
}

// ─── POST /api/substitutions ──────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userMessage, recipe } = body

    if (!userMessage || !recipe) {
      return NextResponse.json(
        { error: 'userMessage and recipe are required' },
        { status: 400 }
      )
    }

    // ── Enforce substitution limit ──────────────────────────────────────────
    const sessionId = getSessionId()
    const currentCount = substitutionCounts.get(sessionId) ?? 0

    if (currentCount >= SUBSTITUTION_LIMIT) {
      return NextResponse.json(
        {
          error: 'Substitution limit reached',
          message: `You've used all ${SUBSTITUTION_LIMIT} substitutions for this session. Start a new session to get more suggestions.`,
          limitReached: true,
          count: currentCount,
          limit: SUBSTITUTION_LIMIT,
        },
        { status: 429 }
      )
    }

    // ── Call Claude ─────────────────────────────────────────────────────────
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are a nutrition expert helping suggest ingredient substitutions for recipes.

Current recipe:
${JSON.stringify(recipe, null, 2)}

User request: ${userMessage}

Respond with a JSON object only (no markdown, no extra text) in this exact format:
{
  "substitute": "the substitute ingredient name",
  "explanation": "brief explanation of why this works and any preparation notes",
  "updatedNutrition": {
    "calories": <number>,
    "protein": <number>,
    "carbs": <number>,
    "fat": <number>
  }
}`,
        },
      ],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude')
    }

    const result = JSON.parse(content.text)

    // ── Increment count only after a successful Claude response ─────────────
    const newCount = currentCount + 1
    substitutionCounts.set(sessionId, newCount)

    // ── Build response — set session cookie if this is a new session ────────
    const response = NextResponse.json(
      {
        ...result,
        // Include usage info so the frontend can show remaining count
        usage: {
          count: newCount,
          limit: SUBSTITUTION_LIMIT,
          remaining: SUBSTITUTION_LIMIT - newCount,
        },
      },
      { status: 200 }
    )

    // Set the cookie if it didn't already exist
    const cookieStore = cookies()
    if (!cookieStore.get('substitution_session')?.value) {
      response.cookies.set('substitution_session', sessionId, {
        httpOnly: true,
        sameSite: 'lax',
        // Session cookie — expires when the browser is closed
        path: '/',
      })
    }

    return response
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Something went wrong'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ─── GET /api/substitutions — check remaining count ───────────────────────────
// Optional: lets the frontend poll how many substitutions are left.

export async function GET() {
  const sessionId = getSessionId()
  const currentCount = substitutionCounts.get(sessionId) ?? 0

  return NextResponse.json({
    count: currentCount,
    limit: SUBSTITUTION_LIMIT,
    remaining: SUBSTITUTION_LIMIT - currentCount,
    limitReached: currentCount >= SUBSTITUTION_LIMIT,
  })
}