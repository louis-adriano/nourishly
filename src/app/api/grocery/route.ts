import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface GroceryRow {
  item_id: string
  recipe_id: string | null
  ingredient_name: string
  quantity: string | null
  is_collected: boolean
  recipes: { title: string } | null
}

// ─── GET /api/grocery ───────────────────────────────────────────────────────────
// Returns grocery items grouped by recipe (plus a "General Items" group for
// items added manually, i.e. recipe_id is null).

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data, error } = await supabase
      .from('grocery_items')
      .select('item_id, recipe_id, ingredient_name, quantity, is_collected, recipes ( title )')
      .eq('user_id', user.id)
      .order('added_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const rows = (data ?? []) as unknown as GroceryRow[]

    const groupsById = new Map<string, { groupId: string; recipeName: string; items: GroceryRow[] }>()
    groupsById.set('group-general', { groupId: 'group-general', recipeName: 'General Items', items: [] })

    for (const row of rows) {
      const groupId = row.recipe_id ?? 'group-general'
      if (!groupsById.has(groupId)) {
        groupsById.set(groupId, { groupId, recipeName: row.recipes?.title ?? 'Recipe', items: [] })
      }
      groupsById.get(groupId)!.items.push(row)
    }

    // Keep "General Items" first, then recipe groups in the order they first appeared.
    const groups = [
      groupsById.get('group-general')!,
      ...[...groupsById.values()].filter(g => g.groupId !== 'group-general'),
    ].map(g => ({
      groupId: g.groupId,
      recipeName: g.recipeName,
      items: g.items.map(({ item_id, recipe_id, ingredient_name, quantity, is_collected }) => ({
        item_id, recipe_id, ingredient_name, quantity, is_collected,
      })),
    }))

    return NextResponse.json({ groups })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Something went wrong'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ─── POST /api/grocery ──────────────────────────────────────────────────────────
// Add a single manual item ({ ingredient_name, quantity }), or bulk-add a
// recipe's ingredients ({ recipe_id, ingredients: [{ name, quantity, unit }] }).

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const body = await request.json()

    if (Array.isArray(body.ingredients)) {
      const { recipe_id, ingredients } = body as {
        recipe_id: string
        ingredients: Array<{ name: string; quantity?: string | number; unit?: string }>
      }
      if (!recipe_id || ingredients.length === 0) {
        return NextResponse.json({ error: 'recipe_id and ingredients are required' }, { status: 400 })
      }

      const rows = ingredients.map(ing => ({
        user_id: user.id,
        recipe_id,
        ingredient_name: ing.name,
        quantity: [ing.quantity, ing.unit].filter(Boolean).join(' ').trim() || null,
        is_collected: false,
      }))

      const { data, error } = await supabase.from('grocery_items').insert(rows).select()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      return NextResponse.json({ items: data }, { status: 201 })
    }

    const { ingredient_name, quantity, recipe_id } = body as {
      ingredient_name: string
      quantity?: string
      recipe_id?: string
    }
    if (!ingredient_name || !ingredient_name.trim()) {
      return NextResponse.json({ error: 'ingredient_name is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('grocery_items')
      .insert({
        user_id: user.id,
        recipe_id: recipe_id ?? null,
        ingredient_name: ingredient_name.trim(),
        quantity: quantity?.trim() || null,
        is_collected: false,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ item: data }, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Something went wrong'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ─── PATCH /api/grocery ─────────────────────────────────────────────────────────
// Toggle an item's collected state: { item_id, is_collected }.

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { item_id, is_collected } = await request.json() as { item_id: string; is_collected: boolean }
    if (!item_id || typeof is_collected !== 'boolean') {
      return NextResponse.json({ error: 'item_id and is_collected are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('grocery_items')
      .update({ is_collected })
      .eq('item_id', item_id)
      .eq('user_id', user.id)
      .select('item_id')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data || data.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Something went wrong'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ─── DELETE /api/grocery ────────────────────────────────────────────────────────
// Delete a single item ({ item_id }) or an entire group ({ recipe_id }, where
// recipe_id may be null to clear the "General Items" group).

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const body = await request.json()

    if (body.item_id) {
      const { error } = await supabase
        .from('grocery_items')
        .delete()
        .eq('item_id', body.item_id)
        .eq('user_id', user.id)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true })
    }

    if ('recipe_id' in body) {
      let query = supabase.from('grocery_items').delete().eq('user_id', user.id)
      query = body.recipe_id ? query.eq('recipe_id', body.recipe_id) : query.is('recipe_id', null)

      const { error } = await query
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'item_id or recipe_id is required' }, { status: 400 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Something went wrong'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
