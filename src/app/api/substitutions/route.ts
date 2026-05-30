import { NextResponse } from 'next/server'
import { anthropic } from '@/lib/claude/client'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userMessage, recipe } = body

    if (!userMessage || !recipe) {
      return NextResponse.json(
        { error: 'userMessage and recipe are required' },
        { status: 400 }
      )
    }

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are a nutrition expert helping suggest ingredient substitutions for recipes.

Current recipe:
${JSON.stringify(recipe, null, 2)}

User request: ${userMessage}

Respond with a JSON object only (no markdown, no extra text) in this exact format:
{
  "substitute": "the substitute ingredient name",
  "explanation": "brief explanation of why this works and any preparation notes",
  "updatedNutrition": {
    "calories": <number>,
    "protein": <number>,
    "carbs": <number>,
    "fat": <number>
  }
}`,
        },
      ],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude')
    }

    const result = JSON.parse(content.text)
    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Something went wrong'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
