# Nourishly

AI-powered nutrition and recipe planning platform.

## Overview

Nourishly helps people plan meals around their health goals and dietary preferences. It uses AI to generate recipes and suggest ingredient substitutions, then lets users log meals, track daily nutrition, save favourite recipes, and build grocery lists — all personalised from an AI-calculated calorie target set during onboarding.

## Tech Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Supabase** (PostgreSQL + Auth)
- **Groq** (`llama-3.3-70b-versatile`) for AI recipe generation and substitutions
- **PWA** via `next-pwa` — installable, offline-capable
- **Vercel** for deployment

## Features

- AI recipe generation with dietary filters
- Ingredient substitution chat
- Meal logging with categories (Breakfast / Lunch / Dinner / Snacks)
- Nutrition dashboard with calorie ring and macro tracking
- Saved recipes with search
- Grocery list
- Onboarding flow with AI-calculated calorie targets
- Google + email authentication
- Mobile-native responsive design
- Installable PWA

## Getting Started

1. Clone the repo:
   ```bash
   git clone <repo-url>
   cd nourishly
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file in the project root with the required variables (see [Environment Variables](#environment-variables)).
4. Run the development server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL of the Supabase project used for auth and database access |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key for the Supabase client |
| `GROQ_API_KEY` | API key for Groq, used to call `llama-3.3-70b-versatile` for recipe generation and substitutions |

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login, register, privacy, terms
│   ├── (dashboard)/     # Dashboard, generate, grocery, profile, saved
│   ├── (onboarding)/    # Onboarding flow
│   ├── api/             # Route handlers (auth, recipes, meal-logs,
│   │                     nutrition, grocery, saved-recipes, substitutions)
│   └── auth/callback/   # Supabase auth callback
├── components/
│   ├── auth/
│   ├── layout/
│   └── ui/
├── lib/
│   ├── claude/          # Groq client wrapper
│   └── supabase/        # Supabase client helpers
└── types/
```

## Database

Data is stored in Supabase (PostgreSQL) with **Row Level Security (RLS) enabled on all tables**. Main tables:

- `profiles`
- `recipes`
- `meal_logs`
- `saved_recipes`
- `substitutions`
- `grocery_items`

## Deployment

The app is deployed on **Vercel**, connected to this GitHub repo. Pushes to `main` auto-deploy to production.

## Contributing

- Branch naming: `feature/*` for new features, `fix/*` for bug fixes.
- Open PRs against the `dev` branch (the integration branch), not `main`.

## License

Academic project — NIT3003/NIT3004 IT Capstone.
