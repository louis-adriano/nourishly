import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ─── GET /api/saved-recipes?page=1 ───────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const from = (page - 1) * 20
    const to = page * 20 - 1

    const { data, error } = await supabase
      .from('saved_recipes')
      .select(`
        saved_id,
        saved_at,
        recipe_id,
        recipes (
          recipe_id,
          title,
          description,
          cook_time_mins,
          cuisine,
          nutrition_json,
          ingredients_json
        )
      `)
      .eq('user_id', user.id)
      .order('saved_at', { ascending: false })
      .range(from, to)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const rows = (data ?? []) as unknown as Array<{
      saved_id: string
      saved_at: string
      recipe_id: string
      recipes: {
        recipe_id: string
        title: string
        description: string
        cook_time_mins: number
        cuisine: string | null
        nutrition_json: unknown
        ingredients_json: unknown
      } | null
    }>

    const recipes = rows.map(row => ({
      saved_id: row.saved_id,
      saved_at: row.saved_at,
      recipe_id: row.recipe_id,
      recipe: row.recipes,
    }))

    return NextResponse.json({ recipes, page, hasMore: rows.length === 20 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Something went wrong'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ─── POST /api/saved-recipes ──────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const body = await request.json()
    const { recipe_id } = body as { recipe_id: string }

    const { data: existing } = await supabase
      .from('saved_recipes')
      .select('saved_id')
      .eq('user_id', user.id)
      .eq('recipe_id', recipe_id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Already saved', alreadySaved: true }, { status: 409 })
    }

    const { data, error } = await supabase
      .from('saved_recipes')
      .insert({ user_id: user.id, recipe_id })
      .select('saved_id, saved_at')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ saved_id: (data as { saved_id: string; saved_at: string }).saved_id, saved_at: (data as { saved_id: string; saved_at: string }).saved_at }, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Something went wrong'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ─── DELETE /api/saved-recipes ────────────────────────────────────────────────

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const body = await request.json()
    const { recipe_id } = body as { recipe_id: string }

    const { data, error } = await supabase
      .from('saved_recipes')
      .delete()
      .eq('user_id', user.id)
      .eq('recipe_id', recipe_id)
      .select('saved_id')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data || (data as unknown[]).length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Something went wrong'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
