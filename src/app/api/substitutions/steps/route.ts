import { NextResponse } from 'next/server'
import groq from '@/lib/claude/client'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const body = await request.json()
    const { recipe_title, ingredients } = body

    if (!recipe_title || !ingredients) {
      return NextResponse.json(
        { error: 'recipe_title and ingredients are required' },
        { status: 400 }
      )
    }

    const message = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 2000,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: `You are a professional chef. Given this recipe title and updated ingredients list, rewrite the cooking steps to match the new ingredients exactly.
Recipe: ${recipe_title}
Ingredients: ${JSON.stringify(ingredients)}
Return ONLY a JSON array of step objects with { step_number: number, instruction: string }.
No markdown, no extra text.`,
        },
      ],
    })

    let steps
    try {
      const raw = (message.choices[0].message.content ?? '[]')
        .replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
      steps = JSON.parse(raw)
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse steps response' },
        { status: 502 }
      )
    }

    return NextResponse.json({ steps }, { status: 200 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Something went wrong'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
