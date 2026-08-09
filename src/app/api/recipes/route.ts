import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import groq from '@/lib/claude/client'
import { normaliseIngredientsToMetric, convertFahrenheitInText } from '@/lib/units'

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
  cuisine?: unknown
  cook_time_mins?: unknown
  ingredients?: unknown
  steps?: unknown
  nutrition?: unknown
}

interface ValidRecipe {
  title: string
  description: string
  cuisine?: string
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

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const activeFilters: string[] = body.activeFilters ?? []
    const previousTitles: string[] = body.previousTitles ?? []

    const supabase = await createClient()

    // 1. Auth
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    // 2. Profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('health_goal, dietary_restrictions, cuisine_preferences, dietary_notes, cuisine_notes')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Please complete onboarding first' },
        { status: 400 },
      )
    }

    // 3. Prompt
    const varietyInstructions = [
      'Focus on bold, flavourful dishes with complex seasoning.',
      'Focus on quick and simple weeknight meals.',
      'Focus on hearty, filling dishes with whole ingredients.',
      'Focus on light, fresh dishes with vibrant ingredients.',
      'Focus on comfort food that still meets the health goal.',
      'Focus on dishes with interesting textures and contrasting flavours.',
    ]
    const varietyHint = varietyInstructions[Math.floor(Math.random() * varietyInstructions.length)]

    const previousTitlesNote = previousTitles.length > 0
      ? `The user has already seen these recipes — do NOT generate any of them again or anything too similar: ${previousTitles.join(', ')}.`
      : ''

    const allPossibleFilters = ["Weight Loss", "Vegetarian", "Korean", "Japanese",
      "Italian", "Mexican", "Indian", "Thai", "Mediterranean", "American"]

    const inactiveFilters = allPossibleFilters.filter(f => !activeFilters.includes(f))

    const filterNote = activeFilters.length > 0
      ? `The user has selected these active filters: ${activeFilters.join(", ")}. You MUST respect these filters strictly.
     ${inactiveFilters.length > 0
       ? `The user has explicitly turned OFF: ${inactiveFilters.join(", ")}. Do NOT generate recipes matching these turned-off filters. For example if "Vegetarian" is turned off, include meat or fish.`
       : ""}`
      : "Generate varied recipes based on the user profile."

    const restrictions =
      Array.isArray(profile.dietary_restrictions) && profile.dietary_restrictions.length > 0
        ? profile.dietary_restrictions.join(', ')
        : 'None'

    const cuisines =
      Array.isArray(profile.cuisine_preferences) && profile.cuisine_preferences.length > 0
        ? profile.cuisine_preferences.join(', ')
        : 'Any'
    
    const dietaryNotes = (profile as Record<string, unknown>).dietary_notes as string | null
    const cuisineNotes = (profile as Record<string, unknown>).cuisine_notes as string | null

    const prompt = `You are a professional chef and nutritionist with deep knowledge of authentic cuisines. Generate exactly 4 personalised recipes based on this profile:

Health goal: ${profile.health_goal}
Dietary restrictions: ${restrictions}${dietaryNotes ? `\nAdditional dietary notes (STRICTLY follow these): ${dietaryNotes}` : ''}
Cuisine preferences: ${cuisines}${cuisineNotes ? `\nAdditional cuisine notes (STRICTLY follow these): ${cuisineNotes}` : ''}

${filterNote}
${varietyHint}
${previousTitlesNote}

STRICT RECIPE QUALITY REQUIREMENTS:
- Each recipe must have 8-15 ingredients minimum
- Ingredients must be specific and authentic (e.g. "Sichuan peppercorns", "gochujang paste", "fish sauce") — not generic (e.g. "spices", "seasoning")
- Steps must be detailed and reflect real cooking technique — at least 5 steps per recipe
- Recipes must be authentically prepared — if it's Kung Pao it needs dried chilies, Sichuan peppercorns, the proper sauce (soy, vinegar, sugar, cornstarch)
- Each recipe must include a cuisine field indicating its origin cuisine
- Each of the 4 recipes must be distinctly different — vary proteins, cooking methods, and flavour profiles. No repeating the same dish across generations.

Return ONLY a valid JSON array with exactly 4 recipe objects.
Each object must have these exact fields:
- title: string
- description: string (one sentence about the dish)
- cuisine: string (e.g. "Korean", "Chinese", "Italian", "Mexican")
- cook_time_mins: number
- ingredients: array of objects with { name: string, quantity: string, unit: string }
- steps: array of objects with { step_number: number, instruction: string }
- nutrition: object with { calories: number, protein_g: number, carbs_g: number, fat_g: number }

All ingredient quantities MUST use metric units only: grams (g) or kilograms (kg) for solids, millilitres (ml) or litres (L) for liquids, or count (e.g. "2 cloves", "1 onion") for whole items. NEVER use cups, oz, lb, tsp/tbsp-as-imperial, or °F. If a temperature is mentioned in a step, use °C.

Do not include any text before or after the JSON array.`

    // 4. Groq API
    console.log('[recipes] Sending prompt to Groq:\n', prompt)
    let groqResponse
    try {
      groqResponse = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4000,
        temperature: 0.9,
      })
      console.log('[recipes] Groq response:', {
        content: groqResponse.choices[0].message.content,
        finish_reason: groqResponse.choices[0].finish_reason,
        usage: groqResponse.usage,
      })
    } catch (err) {
      const apiErr = err as { message?: string; status?: number; error?: unknown }
      console.error('[recipes] Groq API error:', {
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
    const rawText = (groqResponse.choices[0].message.content ?? '')
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

    // 7. Save to Supabase (normalise any leftover imperial units to metric first)
    const rows = valid.map(recipe => ({
      user_id: user.id,
      title: recipe.title,
      description: recipe.description,
      cuisine: recipe.cuisine ?? null,
      ingredients_json: normaliseIngredientsToMetric(recipe.ingredients),
      steps_json: recipe.steps.map(step => ({
        ...step,
        instruction: convertFahrenheitInText(step.instruction),
      })),
      cook_time_mins: recipe.cook_time_mins,
      nutrition_json: recipe.nutrition,
    }))
    console.log('[recipes] Inserting rows:', JSON.stringify(rows))

    const { data: saved, error: saveError } = await supabase
      .from('recipes')
      .insert(rows)
      .select('recipe_id, title, description, cook_time_mins, ingredients_json, steps_json, nutrition_json')

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

    // 8. Return saved recipes with their database ids
    const recipes = saved.map((row, i) => ({
      id: row.recipe_id,
      title: row.title,
      description: row.description,
      cuisine: valid[i].cuisine ?? null,
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
