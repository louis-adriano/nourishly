import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ─── GET /api/grocery ─────────────────────────────────────────────────────────
// Fetch all grocery items for the logged-in user, grouped by recipe.

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    // Fetch all items for this user, joined with recipes to get the title
    const { data: items, error } = await supabase
      .from('grocery_items')
      .select(`
        item_id,
        recipe_id,
        ingredient_name,
        quantity,
        is_collected,
        added_at,
        recipes ( title )
      `)
      .eq('user_id', user.id)
      .order('added_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Group items by recipe_id
    const groupMap = new Map<string, {
      groupId: string
      recipeName: string
      items: typeof items
    }>()

    for (const item of items ?? []) {
      const groupId = item.recipe_id ?? 'group-general'
      const recipeName = item.recipe_id
        ? ((item.recipes as { title: string } | null)?.title ?? 'Unknown Recipe')
        : 'General Items'

      if (!groupMap.has(groupId)) {
        groupMap.set(groupId, { groupId, recipeName, items: [] })
      }
      groupMap.get(groupId)!.items.push(item)
    }

    // Always include General Items group even if empty
    if (!groupMap.has('group-general')) {
      groupMap.set('group-general', {
        groupId: 'group-general',
        recipeName: 'General Items',
        items: [],
      })
    }

    // Return recipe groups first, General Items last
    const groups = [...groupMap.values()].sort((a, b) => {
      if (a.groupId === 'group-general') return 1
      if (b.groupId === 'group-general') return -1
      return 0
    })

    return NextResponse.json({ groups }, { status: 200 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ─── POST /api/grocery ────────────────────────────────────────────────────────
// Add a new grocery item manually (General Items — no recipe_id).

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const body = await request.json()
    const { ingredient_name, quantity } = body

    if (!ingredient_name?.trim()) {
      return NextResponse.json(
        { error: 'ingredient_name is required' },
        { status: 400 }
      )
    }

    const { data: newItem, error } = await supabase
      .from('grocery_items')
      .insert({
        user_id: user.id,
        recipe_id: null,
        ingredient_name: ingredient_name.trim(),
        quantity: quantity?.trim() ?? '',
        is_collected: false,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ item: newItem }, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ─── PATCH /api/grocery ───────────────────────────────────────────────────────
// Toggle is_collected for a single item.

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const body = await request.json()
    const { item_id, is_collected } = body

    if (!item_id || is_collected === undefined) {
      return NextResponse.json(
        { error: 'item_id and is_collected are required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('grocery_items')
      .update({ is_collected })
      .eq('item_id', item_id)
      .eq('user_id', user.id) // RLS guard — users can only update their own items

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ─── DELETE /api/grocery ──────────────────────────────────────────────────────
// Delete a single item by item_id, or all items in a group by recipe_id.
// Body: { item_id } OR { recipe_id } (recipe_id: null = General Items)

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const body = await request.json()
    const { item_id, recipe_id } = body

    if (!item_id && recipe_id === undefined) {
      return NextResponse.json(
        { error: 'item_id or recipe_id is required' },
        { status: 400 }
      )
    }

    if (item_id) {
      // Delete a single item
      const { error } = await supabase
        .from('grocery_items')
        .delete()
        .eq('item_id', item_id)
        .eq('user_id', user.id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    } else {
      // Delete all items in a group
      // recipe_id === null means General Items
      const query = supabase
        .from('grocery_items')
        .delete()
        .eq('user_id', user.id)

      const { error } = recipe_id === null
        ? await query.is('recipe_id', null)
        : await query.eq('recipe_id', recipe_id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}