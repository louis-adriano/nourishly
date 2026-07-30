import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  console.log('[onboarding] POST start')

  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  console.log('[onboarding] getUser ->', { userId: user?.id ?? null, userError: userError?.message ?? null })

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const body = await request.json()
  const { health_goal, dietary_restrictions, cuisine_preferences, daily_calories, daily_protein_g, daily_carbs_g, daily_fat_g, age, weight_kg, height_cm, sex } = body
  console.log('[onboarding] body ->', { health_goal, dietary_restrictions, cuisine_preferences, daily_calories, daily_protein_g, daily_carbs_g, daily_fat_g, age, weight_kg, height_cm, sex })

  if (!health_goal) {
    return NextResponse.json({ error: 'Health goal is required' }, { status: 400 })
  }

  const payload = {
    user_id: user.id,
    health_goal,
    dietary_restrictions: dietary_restrictions ?? [],
    cuisine_preferences: cuisine_preferences ?? [],
    daily_calories: typeof daily_calories === 'number' ? daily_calories : 2000,
    daily_protein_g: typeof daily_protein_g === 'number' ? daily_protein_g : 150,
    daily_carbs_g: typeof daily_carbs_g === 'number' ? daily_carbs_g : 200,
    daily_fat_g: typeof daily_fat_g === 'number' ? daily_fat_g : 65,
    ...(typeof age === 'number' && !Number.isNaN(age) ? { age } : {}),
    ...(typeof weight_kg === 'number' && !Number.isNaN(weight_kg) ? { weight_kg } : {}),
    ...(typeof height_cm === 'number' && !Number.isNaN(height_cm) ? { height_cm } : {}),
    ...(sex ? { sex } : {}),
    onboarding_done: true,
  }
  console.log('[onboarding] upserting payload ->', payload)

  const { error } = await supabase
    .from('profiles')
    .upsert(payload, { onConflict: 'user_id' })

  if (error) {
    console.error('[onboarding] upsert error ->', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    })
    return NextResponse.json(
      { error: error.message, code: error.code, details: error.details },
      { status: 500 },
    )
  }

  console.log('[onboarding] upsert success for user', user.id)
  return NextResponse.json({ success: true }, { status: 200 })
}