import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const body = await request.json()
  const { health_goal, dietary_restrictions, cuisine_preferences } = body

  if (!health_goal) {
    return NextResponse.json({ error: 'Health goal is required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('profiles')
    .upsert({
      user_id: user.id,
      health_goal,
      dietary_restrictions: dietary_restrictions || [],
      cuisine_preferences: cuisine_preferences || [],
      onboarding_done: true,
    })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 200 })
}