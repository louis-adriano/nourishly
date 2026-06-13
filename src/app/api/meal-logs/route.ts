import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ─── POST /api/meal-logs ───────────────────────────────────────────────────────
// Saves a recipe's nutrition to meal_logs for today's date.
// Returns 409 if the same recipe has already been logged today.

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // ── Auth check ────────────────────────────────────────────────────────────
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be logged in to log a meal.' },
        { status: 401 }
      )
    }

    // ── Validate request body ─────────────────────────────────────────────────
    const body = await request.json()
    const { recipe_id, calories, protein_g, carbs_g, fat_g } = body

    if (!recipe_id || calories == null || protein_g == null || carbs_g == null || fat_g == null) {
      return NextResponse.json(
        { error: 'recipe_id, calories, protein_g, carbs_g and fat_g are all required.' },
        { status: 400 }
      )
    }

    // ── Build today's date (YYYY-MM-DD) ───────────────────────────────────────
    const today = new Date().toISOString().split('T')[0]

    // ── Check for duplicate log today ─────────────────────────────────────────
    const { data: existing, error: checkError } = await supabase
      .from('meal_logs')
      .select('log_id')
      .eq('user_id', user.id)
      .eq('recipe_id', recipe_id)
      .eq('logged_date', today)
      .maybeSingle()

    if (checkError) {
      throw new Error(checkError.message)
    }

    if (existing) {
      return NextResponse.json(
        {
          error: 'Already logged today',
          message: 'You\'ve already marked this recipe as cooked today.',
          alreadyLogged: true,
        },
        { status: 409 }
      )
    }

    // ── Insert meal log ───────────────────────────────────────────────────────
    const { data, error: insertError } = await supabase
      .from('meal_logs')
      .insert({
        user_id: user.id,
        recipe_id,
        logged_date: today,
        calories,
        protein_g,
        carbs_g,
        fat_g,
      })
      .select()
      .single()

    if (insertError) {
      throw new Error(insertError.message)
    }

    return NextResponse.json(
      {
        message: 'Recipe logged successfully!',
        log: data,
      },
      { status: 201 }
    )
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Something went wrong'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ─── GET /api/meal-logs ────────────────────────────────────────────────────────
// Returns today's meal logs for the logged-in user.

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be logged in to view meal logs.' },
        { status: 401 }
      )
    }

    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('meal_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('logged_date', today)
      .order('logged_date', { ascending: false })

    if (error) throw new Error(error.message)

    return NextResponse.json({ logs: data }, { status: 200 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Something went wrong'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}