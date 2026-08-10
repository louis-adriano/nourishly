import { NextResponse } from 'next/server'
import groq from '@/lib/claude/client'
import { createClient } from '@/lib/supabase/server'
import { normaliseUnitsInFreeText } from '@/lib/units'

const SUBSTITUTION_LIMIT = 10

function isValidNutrition(n: unknown): n is { calories: number; protein: number; carbs: number; fat: number } {
  if (!n || typeof n !== 'object') return false
  const obj = n as Record<string, unknown>
  return (
    typeof obj.calories === 'number' && obj.calories > 0 &&
    typeof obj.protein === 'number' && obj.protein >= 0 &&
    typeof obj.carbs === 'number' && obj.carbs >= 0 &&
    typeof obj.fat === 'number' && obj.fat >= 0
  )
}

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
    const prompt = `You are a professional chef helping with ingredient substitutions.

Current recipe ingredients:
${recipe.ingredients.map((ing: { quantity: string; unit: string; name: string }, i: number) => `${i}: ${ing.quantity}${ing.unit} ${ing.name}`).join('\n')}

User request: "${userMessage}"

Identify EXACTLY ONE ingredient from the numbered list above that the user
wants to substitute, and suggest a replacement. Even if the user's message
mentions something not in the list (like "vegan cheese" when the list has
"cheese"), find the closest matching ingredient by index.

Recalculate the full recipe's total nutrition after this substitution,
based on ALL ingredients in the list above (with the substitution applied),
for the same serving size as the original recipe. Base calorie/macro
estimates on standard nutritional data for each ingredient. Do not return
zero or null values — every field must be a realistic positive number.

Return ONLY a JSON object with this exact shape:
{
  "original_index": <number, the index from the list above>,
  "original_ingredient": "<exact name as it appears in the list>",
  "substitute": "<new ingredient name>",
  "substituteQuantity": "<quantity>",
  "substituteUnit": "<unit>",
  "explanation": "<brief explanation>",
  "updatedNutrition": { "calories": <number>, "protein": <number>, "carbs": <number>, "fat": <number> }
}

Do not include markdown formatting, only the raw JSON object.`

    const message = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt,
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

    // Extract the original ingredient directly from Groq's structured
    // original_index, instead of relying on the (unused) body.ingredient field.
    const originalIndex = typeof parsed.original_index === 'number' ? parsed.original_index : Number(parsed.original_index)
    const originalIngredient =
      recipe.ingredients[originalIndex]?.name ?? parsed.original_ingredient ?? 'unknown'

    const { error: substitutionInsertError } = await supabase.from('substitutions').insert({
      user_id: user.id,
      recipe_id: recipe.id,
      original_ingredient: originalIngredient,
      substitute: parsed.substitute ?? '',
      explanation: parsed.explanation ?? '',
    })
    if (substitutionInsertError) {
      console.error('[substitutions] substitutions insert error:', substitutionInsertError)
    }

    const { error: chatInsertError } = await supabase.from('recipe_chat_messages').insert([
      { user_id: user.id, recipe_id: recipe.id, role: 'user', content: userMessage },
      {
        user_id: user.id,
        recipe_id: recipe.id,
        role: 'ai',
        content: parsed.explanation ?? 'Here is a suggested substitute.',
      },
    ])
    if (chatInsertError) {
      console.error('[substitutions] recipe_chat_messages insert error:', chatInsertError)
    }

    if (!isValidNutrition(parsed.updatedNutrition)) {
      // fall back to the original recipe's nutrition unchanged
      parsed.updatedNutrition = recipe.nutrition ?? { calories: 0, protein: 0, carbs: 0, fat: 0 }
    }

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

    const { data: history, error: historyError } = await supabase
      .from('recipe_chat_messages')
      .select('role, content, created_at')
      .eq('user_id', user.id)
      .eq('recipe_id', recipe_id)
      .order('created_at', { ascending: true })

    if (historyError) {
      console.error('[substitutions] GET history query error:', historyError)
    }

    return NextResponse.json({
      count: currentCount,
      limit: SUBSTITUTION_LIMIT,
      remaining: SUBSTITUTION_LIMIT - currentCount,
      limitReached: currentCount >= SUBSTITUTION_LIMIT,
      messages: history ?? [],
    })
  } catch (error) {
    console.error('[substitutions] GET unexpected error:', error)
    const msg = error instanceof Error ? error.message : 'Something went wrong'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}