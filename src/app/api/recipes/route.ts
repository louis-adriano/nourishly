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
    let claudeResponse
    try {
      claudeResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      })
    } catch {
      return NextResponse.json(
        { error: 'Recipe generation unavailable, please try again' },
        { status: 503 },
      )
    }

    // 5. Parse
    const raw = claudeResponse.content[0]
    if (raw.type !== 'text') {
      return NextResponse.json(
        { error: 'Failed to parse recipe response' },
        { status: 502 },
      )
    }

    let parsed: RawRecipe[]
    try {
      parsed = JSON.parse(raw.text)
      if (!Array.isArray(parsed)) throw new Error('Response is not an array')
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse recipe response' },
        { status: 502 },
      )
    }

    // 6. Validate
    const valid = parsed.filter(isValidRecipe) as ValidRecipe[]
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

    const { data: saved, error: saveError } = await supabase
      .from('recipes')
      .insert(rows)
      .select('id, title, cook_time_mins, ingredients_json, steps_json, nutrition_json')

    if (saveError || !saved) {
      return NextResponse.json(
        { error: saveError?.message ?? 'Failed to save recipes' },
        { status: 500 },
      )
    }

    // 8. Return saved recipes with their database ids, merging description from valid[]
    const recipes = saved.map((row, i) => ({
      id: row.id,
      title: row.title,
      description: valid[i].description,
      cook_time_mins: row.cook_time_mins,
      ingredients: row.ingredients_json,
      steps: row.steps_json,
      nutrition: row.nutrition_json,
    }))

    return NextResponse.json({ recipes }, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
