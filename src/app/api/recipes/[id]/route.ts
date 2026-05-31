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
      .select('recipe_id, title, cook_time_mins, ingredients_json, steps_json, nutrition_json')
      .eq('recipe_id', params.id)
      .eq('user_id', user.id)
      .single()

    if (error || !row) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }

    const recipe = {
      id: row.recipe_id,
      title: row.title,
      description: '',
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
