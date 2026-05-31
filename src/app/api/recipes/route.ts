import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { anthropic } from '@/lib/claude/client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Ingredient {
  name: string
  quantity: string
  unit: string
}

interface Step {
  step_number: number
  instruction: string
}

interface Nutrition {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

interface RawRecipe {
  title?: unknown
  description?: unknown
  cook_time_mins?: unknown
  ingredients?: unknown
  steps?: unknown
  nutrition?: unknown
}

interface ValidRecipe {
  title: string
  description: string
  cook_time_mins: number
  ingredients: Ingredient[]
  steps: Step[]
  nutrition: Nutrition
}

// ─── Validation ───────────────────────────────────────────────────────────────

function isValidRecipe(r: RawRecipe): r is RawRecipe & ValidRecipe {
  if (typeof r.title !== 'string' || !r.title) return false
  if (typeof r.description !== 'string' || !r.description) return false
  if (typeof r.cook_time_mins !== 'number') return false
  if (!Array.isArray(r.ingredients) || r.ingredients.length === 0) return false
  if (!Array.isArray(r.steps) || r.steps.length === 0) return false
  if (!r.nutrition || typeof r.nutrition !== 'object') return false
  const n = r.nutrition as Record<string, unknown>
  if (
    typeof n.calories !== 'number' ||
    typeof n.protein_g !== 'number' ||
    typeof n.carbs_g !== 'number' ||
    typeof n.fat_g !== 'number'
  ) return false
  return true
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST() {
  try {
    const supabase = await createClient()

    // 1. Auth
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    // 2. Profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('health_goal, dietary_restrictions, cuisine_preferences')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Please complete onboarding first' },
        { status: 400 },
      )
    }

    // 3. Prompt
    const restrictions =
      Array.isArray(profile.dietary_restrictions) && profile.dietary_restrictions.length > 0
        ? profile.dietary_restrictions.join(', ')
        : 'None'

    const cuisines =
      Array.isArray(profile.cuisine_preferences) && profile.cuisine_preferences.length > 0
        ? profile.cuisine_preferences.join(', ')
        : 'Any'

    const prompt = `You are a professional nutritionist and chef. Generate exactly 4 personalised recipes based on the following user profile:
Health goal: ${profile.health_goal}
Dietary restrictions: ${restrictions}
Cuisine preferences: ${cuisines}

Return ONLY a valid JSON array with exactly 4 recipe objects. Each object must have these exact fields:
- title: string
- description: string (one sentence about the dish)
- cook_time_mins: number
- ingredients: array of objects with { name: string, quantity: string, unit: string }
- steps: array of objects with { step_number: number, instruction: string }
- nutrition: object with { calories: number, protein_g: number, carbs_g: number, fat_g: number }

Do not include any text before or after the JSON array.`

    // 4. Claude API
    console.log('[recipes] Sending prompt to Claude:\n', prompt)
    let claudeResponse
    try {
      claudeResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      })
      console.log('[recipes] Claude response:', {
        content: claudeResponse.content,
        stop_reason: claudeResponse.stop_reason,
        usage: claudeResponse.usage,
      })
    } catch (err) {
      const apiErr = err as { message?: string; status?: number; error?: unknown }
      console.error('[recipes] Claude API error:', {
        message: apiErr.message,
        status: apiErr.status,
        error: apiErr.error,
      })
      return NextResponse.json(
        { error: 'Recipe generation unavailable, please try again' },
        { status: 503 },
      )
    }

    // 5. Parse
    const rawText = (claudeResponse.content[0] as { type: string; text: string }).text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim()

    let parsed: unknown
    try {
      parsed = JSON.parse(rawText)
    } catch {
      console.error('[recipes] JSON parse failed. Raw text:', rawText.slice(0, 500))
      return NextResponse.json({ error: 'Failed to parse recipe response' }, { status: 502 })
    }

    if (!Array.isArray(parsed)) {
      return NextResponse.json({ error: 'Failed to parse recipe response' }, { status: 502 })
    }
    console.log('[recipes] Parsed array length:', parsed.length)

    // 6. Validate
    const valid = (parsed as RawRecipe[]).filter(isValidRecipe) as ValidRecipe[]
    console.log('[recipes] Valid recipes after filter:', valid.length, 'first:', valid[0] ?? null)
    if (valid.length === 0) {
      return NextResponse.json(
        { error: 'No valid recipes returned' },
        { status: 422 },
      )
    }

    // 7. Save to Supabase
    const rows = valid.map(recipe => ({
      user_id: user.id,
      title: recipe.title,
      ingredients_json: recipe.ingredients,
      steps_json: recipe.steps,
      cook_time_mins: recipe.cook_time_mins,
      nutrition_json: recipe.nutrition,
    }))
    console.log('[recipes] Inserting rows:', JSON.stringify(rows))

    const { data: saved, error: saveError } = await supabase
      .from('recipes')
      .insert(rows)
      .select('recipe_id, title, cook_time_mins, ingredients_json, steps_json, nutrition_json')

    console.log('[recipes] Supabase insert result — data:', saved, 'error:', {
      message: saveError?.message,
      code: (saveError as Record<string, unknown> | null)?.code,
      details: (saveError as Record<string, unknown> | null)?.details,
      hint: (saveError as Record<string, unknown> | null)?.hint,
    })

    if (saveError || !saved) {
      return NextResponse.json(
        { error: saveError?.message ?? 'Failed to save recipes' },
        { status: 500 },
      )
    }

    // 8. Return saved recipes with their database ids, merging description from valid[]
    const recipes = saved.map((row, i) => ({
      id: row.recipe_id,
      title: row.title,
      description: valid[i].description,
      cook_time_mins: row.cook_time_mins,
      ingredients: row.ingredients_json,
      steps: row.steps_json,
      nutrition: row.nutrition_json,
    }))

    console.log('[recipes] Final response:', JSON.stringify({ recipes }))
    return NextResponse.json({ recipes }, { status: 200 })
  } catch (err) {
    console.error('[recipes] Unexpected error:', err)
    const message = err instanceof Error ? err.message : 'An unexpected error occurred'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
