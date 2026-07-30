import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface DayTotals {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

interface DayMeal {
  log_id: string
  recipe_id: string
  title: string | null
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

interface DayHistory {
  date: string
  meals: DayMeal[]
  totals: DayTotals
}

function offsetDate(dateStr: string, days: number): string {
  const date = new Date(dateStr + 'T00:00:00')
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const today = new Date().toISOString().split('T')[0]
    const sevenDaysAgo = offsetDate(today, -7)

    const { data: logs, error: logsError } = await supabase
      .from('meal_logs')
      .select('log_id, recipe_id, logged_date, calories, protein_g, carbs_g, fat_g, recipes(title)')
      .eq('user_id', user.id)
      .gte('logged_date', sevenDaysAgo)
      .lt('logged_date', today)
      .order('logged_date', { ascending: false })

    if (logsError) {
      return NextResponse.json({ error: logsError.message }, { status: 500 })
    }

    const daysByDate = new Map<string, DayHistory>()
    for (let i = 1; i <= 7; i++) {
      const date = offsetDate(today, -i)
      daysByDate.set(date, {
        date,
        meals: [],
        totals: { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
      })
    }

    for (const row of logs ?? []) {
      const day = daysByDate.get(row.logged_date)
      if (!day) continue

      day.meals.push({
        log_id: row.log_id,
        recipe_id: row.recipe_id,
        title: (row.recipes as unknown as { title: string } | null)?.title ?? null,
        calories: row.calories ?? 0,
        protein_g: row.protein_g ?? 0,
        carbs_g: row.carbs_g ?? 0,
        fat_g: row.fat_g ?? 0,
      })

      day.totals.calories += row.calories ?? 0
      day.totals.protein_g += row.protein_g ?? 0
      day.totals.carbs_g += row.carbs_g ?? 0
      day.totals.fat_g += row.fat_g ?? 0
    }

    const days = Array.from(daysByDate.values()).sort((a, b) => (a.date < b.date ? 1 : -1))

    return NextResponse.json({ days }, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
