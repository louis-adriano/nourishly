import { NextResponse } from 'next/server'
import groq from '@/lib/claude/client'
import { createClient } from '@/lib/supabase/server'
import { normaliseUnitsInFreeText } from '@/lib/units'

const SUBSTITUTION_LIMIT = 10

// ─── POST /api/substitutions ──────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const body = await request.json()
    console.log('[substitutions] body:', body)
    const { userMessage, recipe } = body

    if (!userMessage || !recipe) {
      return NextResponse.json(
        { error: 'userMessage and recipe are required' },
        { status: 400 }
      )
    }

    // ── Enforce substitution limit ──────────────────────────────────────────
    const { count, error: countError } = await supabase
      .from('substitutions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('recipe_id', recipe.id)

    if (countError) {
      console.error('[substitutions] count query error:', countError)
      return NextResponse.json({ error: countError.message }, { status: 500 })
    }

    const currentCount = count ?? 0

    if (currentCount >= SUBSTITUTION_LIMIT) {
      return NextResponse.json(
        {
          error: 'Substitution limit reached',
          message: `You've used all ${SUBSTITUTION_LIMIT} substitutions for this recipe.`,
          limitReached: true,
          count: SUBSTITUTION_LIMIT,
          limit: SUBSTITUTION_LIMIT,
          remaining: 0,
        },
        { status: 429 }
      )
    }

    // ── Call Groq ───────────────────────────────────────────────────────────
    const message = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are a nutrition expert helping suggest ingredient substitutions for recipes.

Current recipe:
${JSON.stringify(recipe, null, 2)}

User request: ${userMessage}

All ingredient quantities in your response MUST use metric units only: grams (g) or kilograms (kg) for solids, millilitres (ml) or litres (L) for liquids, or count (e.g. "2 cloves", "1 onion") for whole items. NEVER use cups, oz, lb, tsp/tbsp-as-imperial, or °F. If a temperature is mentioned, use °C.

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

    let parsed
    try {
      const raw = (message.choices[0].message.content ?? '{}')
        .replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
      parsed = JSON.parse(raw)
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse substitution response' },
        { status: 502 }
      )
    }

    // Safety net: normalise any leftover imperial units the model returned
    if (typeof parsed.substitute === 'string') {
      parsed.substitute = normaliseUnitsInFreeText(parsed.substitute)
    }
    if (typeof parsed.explanation === 'string') {
      parsed.explanation = normaliseUnitsInFreeText(parsed.explanation)
    }

    void supabase.from('substitutions').insert({
      user_id: user.id,
      recipe_id: body.recipe_id,
      original_ingredient: body.ingredient ?? 'unknown',
      substitute: parsed.substitute ?? '',
      explanation: parsed.explanation ?? '',
    })

    // ── Return response with updated usage metadata ─────────────────────────
    const newCount = currentCount + 1

    return NextResponse.json(
      {
        ...parsed,
        usage: {
          count: newCount,
          limit: SUBSTITUTION_LIMIT,
          remaining: SUBSTITUTION_LIMIT - newCount,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[substitutions] POST unexpected error:', JSON.stringify(error, Object.getOwnPropertyNames(error)))
    const msg = error instanceof Error ? error.message : 'Something went wrong'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ─── GET /api/substitutions?recipe_id=<id> — check remaining count ───────────

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const recipe_id = searchParams.get('recipe_id')

    if (!recipe_id) {
      return NextResponse.json({ error: 'recipe_id is required' }, { status: 400 })
    }

    const { count, error: countError } = await supabase
      .from('substitutions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('recipe_id', recipe_id)

    if (countError) {
      console.error('[substitutions] GET count query error:', countError)
      return NextResponse.json({ error: countError.message }, { status: 500 })
    }

    const currentCount = count ?? 0

    return NextResponse.json({
      count: currentCount,
      limit: SUBSTITUTION_LIMIT,
      remaining: SUBSTITUTION_LIMIT - currentCount,
      limitReached: currentCount >= SUBSTITUTION_LIMIT,
    })
  } catch (error) {
    console.error('[substitutions] GET unexpected error:', error)
    const msg = error instanceof Error ? error.message : 'Something went wrong'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}