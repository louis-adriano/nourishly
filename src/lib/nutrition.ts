// ─── Shared nutrition-target calculation (Mifflin–St Jeor) ────────────────────
// Used by onboarding and the Profile page so the formula only lives in one place.

export type HealthGoal =
  | 'weight-loss'
  | 'muscle-gain'
  | 'general-wellness'
  | 'athletic-performance'

export type Sex = 'male' | 'female' | 'prefer-not-to-say'

interface NutritionInput {
  weight_kg: number
  height_cm: number
  age: number
  sex: Sex | string
  health_goal: HealthGoal | string | null
}

interface NutritionTargets {
  daily_calories: number
  daily_protein_g: number
  daily_carbs_g: number
  daily_fat_g: number
}

export function calculateNutritionTargets({
  weight_kg,
  height_cm,
  age,
  sex,
  health_goal,
}: NutritionInput): NutritionTargets {
  // Mifflin-St Jeor uses a male/female offset; default to the female offset
  // (the more conservative estimate) when the user prefers not to say.
  const bmr = sex === 'male'
    ? 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
    : 10 * weight_kg + 6.25 * height_cm - 5 * age - 161

  const tdee = bmr * 1.375

  let calories = tdee
  if (health_goal === 'weight-loss') calories = tdee - 500
  else if (health_goal === 'muscle-gain') calories = tdee + 300

  return {
    daily_calories: Math.round(calories),
    daily_protein_g: Math.round((calories * 0.25) / 4),
    daily_carbs_g: Math.round((calories * 0.45) / 4),
    daily_fat_g: Math.round((calories * 0.30) / 9),
  }
}
