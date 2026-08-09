// ─── Imperial → metric safety net ──────────────────────────────────────────
// Groq is instructed to only return metric units, but as a fallback this
// catches common leftover imperial units and converts them to approximate
// metric values so they never reach the UI or the recipes table.

interface Ingredient {
  name: string
  quantity: string
  unit: string
}

const VOLUME_TO_ML: Record<string, number> = {
  cup: 250,
  cups: 250,
  tbsp: 15,
  tablespoon: 15,
  tablespoons: 15,
  tsp: 5,
  teaspoon: 5,
  teaspoons: 5,
  'fl oz': 30,
  'fluid ounce': 30,
  'fluid ounces': 30,
  pint: 470,
  pints: 470,
  quart: 950,
  quarts: 950,
  gallon: 3785,
  gallons: 3785,
}

const WEIGHT_TO_G: Record<string, number> = {
  oz: 28,
  ounce: 28,
  ounces: 28,
  lb: 454,
  lbs: 454,
  pound: 454,
  pounds: 454,
}

function toNumber(quantity: string): number | null {
  const trimmed = quantity.trim()
  // Handle simple fractions like "1/2" and mixed numbers like "1 1/2"
  const mixedMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/)
  if (mixedMatch) {
    return Number(mixedMatch[1]) + Number(mixedMatch[2]) / Number(mixedMatch[3])
  }
  const fractionMatch = trimmed.match(/^(\d+)\/(\d+)$/)
  if (fractionMatch) {
    return Number(fractionMatch[1]) / Number(fractionMatch[2])
  }
  const num = parseFloat(trimmed)
  return Number.isFinite(num) ? num : null
}

function roundNice(n: number): number {
  if (n >= 100) return Math.round(n / 5) * 5
  return Math.round(n)
}

// Normalises a single ingredient's unit in place (returns a new object).
function normaliseIngredient(ingredient: Ingredient): Ingredient {
  const rawUnit = (ingredient.unit ?? '').trim().toLowerCase()
  const amount = toNumber(ingredient.quantity ?? '')

  if (amount === null) return ingredient

  if (rawUnit in VOLUME_TO_ML) {
    const ml = amount * VOLUME_TO_ML[rawUnit]
    if (ml >= 1000) {
      return { ...ingredient, quantity: (ml / 1000).toFixed(2).replace(/\.?0+$/, ''), unit: 'L' }
    }
    return { ...ingredient, quantity: String(roundNice(ml)), unit: 'ml' }
  }

  if (rawUnit in WEIGHT_TO_G) {
    const g = amount * WEIGHT_TO_G[rawUnit]
    if (g >= 1000) {
      return { ...ingredient, quantity: (g / 1000).toFixed(2).replace(/\.?0+$/, ''), unit: 'kg' }
    }
    return { ...ingredient, quantity: String(roundNice(g)), unit: 'g' }
  }

  return ingredient
}

export function normaliseIngredientsToMetric(ingredients: Ingredient[]): Ingredient[] {
  return ingredients.map(normaliseIngredient)
}

// Converts imperial quantity/unit mentions embedded in free text (e.g. a
// substitution suggestion like "use 1 cup of Greek yogurt") to metric.
const FREE_TEXT_UNIT_PATTERN =
  /(\d+(?:\.\d+)?(?:\/\d+)?(?: \d+\/\d+)?)\s*(fl\.?\s?oz|fluid ounces?|cups?|tbsp\.?|tablespoons?|tsp\.?|teaspoons?|lbs?\.?|pounds?|oz\.?|ounces?)\b/gi

export function normaliseUnitsInFreeText(text: string): string {
  const withMetricUnits = text.replace(FREE_TEXT_UNIT_PATTERN, (match, qty: string, unit: string) => {
    const amount = toNumber(qty)
    if (amount === null) return match

    const key = unit.toLowerCase().replace(/\.$/, '')
    if (key.startsWith('fl') || key.startsWith('fluid')) {
      const ml = amount * VOLUME_TO_ML['fl oz']
      return ml >= 1000 ? `${(ml / 1000).toFixed(2).replace(/\.?0+$/, '')}L` : `${roundNice(ml)}ml`
    }
    if (key in VOLUME_TO_ML) {
      const ml = amount * VOLUME_TO_ML[key]
      return ml >= 1000 ? `${(ml / 1000).toFixed(2).replace(/\.?0+$/, '')}L` : `${roundNice(ml)}ml`
    }
    if (key in WEIGHT_TO_G) {
      const g = amount * WEIGHT_TO_G[key]
      return g >= 1000 ? `${(g / 1000).toFixed(2).replace(/\.?0+$/, '')}kg` : `${roundNice(g)}g`
    }
    return match
  })

  return convertFahrenheitInText(withMetricUnits)
}

// Converts a Fahrenheit temperature mentioned in free text (e.g. recipe
// steps) to Celsius, e.g. "Bake at 350°F" -> "Bake at 177°C".
export function convertFahrenheitInText(text: string): string {
  return text.replace(/(\d+(?:\.\d+)?)\s*°?\s*F\b/gi, (_match, deg: string) => {
    const f = parseFloat(deg)
    const c = Math.round((f - 32) * (5 / 9))
    return `${c}°C`
  })
}
