import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const { data: row, error } = await supabase
      .from('recipes')
      .select('recipe_id, title, description, cook_time_mins, ingredients_json, steps_json, nutrition_json')
      .eq('recipe_id', params.id)
      .eq('user_id', user.id)
      .single()

    if (error || !row) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }

    const recipe = {
      id: row.recipe_id,
      title: row.title,
      description: row.description,
      cook_time_mins: row.cook_time_mins,
      ingredients: row.ingredients_json,
      steps: row.steps_json,
      nutrition: row.nutrition_json,
    }

    return NextResponse.json({ recipe }, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const body = await request.json()
    const { ingredients, steps, nutrition } = body

    const updates: Record<string, unknown> = {}
    if (ingredients) updates.ingredients_json = ingredients
    if (steps) updates.steps_json = steps
    if (nutrition) updates.nutrition_json = nutrition

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('recipes')
      .update(updates)
      .eq('recipe_id', params.id)
      .eq('user_id', user.id)
      .select('recipe_id')

    if (error) {
      console.error('[recipes PATCH] error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data || data.length === 0) {
      console.error('[recipes PATCH] no rows matched — recipe_id or user_id mismatch, or RLS blocked it', {
        recipe_id: params.id, user_id: user.id
      })
      return NextResponse.json({ error: 'Recipe not found or not owned by user' }, { status: 404 })
    }

    return NextResponse.json({ success: true, updated: data[0] })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Something went wrong'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
