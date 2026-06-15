import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const today = new Date().toISOString().split('T')[0]

    const { data: logs, error: logsError } = await supabase
      .from('meal_logs')
      .select('log_id, recipe_id, logged_date, calories, protein_g, carbs_g, fat_g, recipes(title)')
      .eq('user_id', user.id)
      .eq('logged_date', today)

    if (logsError) {
      return NextResponse.json({ error: logsError.message }, { status: 500 })
    }

    const totals = (logs ?? []).reduce(
      (acc, row) => ({
        calories: acc.calories + (row.calories ?? 0),
        protein_g: acc.protein_g + (row.protein_g ?? 0),
        carbs_g: acc.carbs_g + (row.carbs_g ?? 0),
        fat_g: acc.fat_g + (row.fat_g ?? 0),
      }),
      { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
    )

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('daily_calories, daily_protein_g, daily_carbs_g, daily_fat_g')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: profileError?.message ?? 'Profile not found' }, { status: 500 })
    }

    return NextResponse.json(
      {
        totals,
        targets: {
          daily_calories: profile.daily_calories,
          daily_protein_g: profile.daily_protein_g,
          daily_carbs_g: profile.daily_carbs_g,
          daily_fat_g: profile.daily_fat_g,
        },
        logs: (logs ?? []).map(log => ({
          ...log,
          recipe_title: (log.recipes as unknown as { title: string } | null)?.title ?? null,
        })),
      },
      { status: 200 },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
