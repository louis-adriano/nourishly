'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

type HealthGoal =
  | 'weight-loss'
  | 'muscle-gain'
  | 'general-wellness'
  | 'athletic-performance'

type DietaryRestriction =
  | 'vegetarian'
  | 'vegan'
  | 'gluten-free'
  | 'dairy-free'
  | 'nut-free'
  | 'low-carb'
  | 'keto'
  | 'paleo'
  | 'halal'
  | 'kosher'

type CuisinePreference =
  | 'italian'
  | 'mexican'
  | 'chinese'
  | 'japanese'
  | 'indian'
  | 'thai'
  | 'mediterranean'
  | 'american'
  | 'french'
  | 'korean'

// ─── Step 1 data ──────────────────────────────────────────────────────────────

interface GoalCard {
  id: HealthGoal
  label: string
  description: string
  icon: React.ReactNode
}

const goals: GoalCard[] = [
  {
    id: 'weight-loss',
    label: 'Weight Loss',
    description: 'Reduce body weight healthily',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
    ),
  },
  {
    id: 'muscle-gain',
    label: 'Muscle Gain',
    description: 'Build strength and muscle mass',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
        <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
        <line x1="6" y1="1" x2="6" y2="4" />
        <line x1="10" y1="1" x2="10" y2="4" />
        <line x1="14" y1="1" x2="14" y2="4" />
      </svg>
    ),
  },
  {
    id: 'general-wellness',
    label: 'General Wellness',
    description: 'Maintain a balanced healthy lifestyle',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
  },
  {
    id: 'athletic-performance',
    label: 'Athletic Performance',
    description: 'Optimise nutrition for sports',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polygon points="10 8 16 12 10 16 10 8" />
      </svg>
    ),
  },
]

// ─── Step 2 data ──────────────────────────────────────────────────────────────

const dietaryOptions: { id: DietaryRestriction; label: string }[] = [
  { id: 'vegetarian',  label: 'Vegetarian'  },
  { id: 'vegan',       label: 'Vegan'       },
  { id: 'gluten-free', label: 'Gluten-Free' },
  { id: 'dairy-free',  label: 'Dairy-Free'  },
  { id: 'nut-free',    label: 'Nut-Free'    },
  { id: 'low-carb',    label: 'Low-Carb'    },
  { id: 'keto',        label: 'Keto'        },
  { id: 'paleo',       label: 'Paleo'       },
  { id: 'halal',       label: 'Halal'       },
  { id: 'kosher',      label: 'Kosher'      },
]

// ─── Step 3 data ──────────────────────────────────────────────────────────────

const cuisineOptions: { id: CuisinePreference; label: string }[] = [
  { id: 'italian',       label: 'Italian'       },
  { id: 'mexican',       label: 'Mexican'       },
  { id: 'chinese',       label: 'Chinese'       },
  { id: 'japanese',      label: 'Japanese'      },
  { id: 'indian',        label: 'Indian'        },
  { id: 'thai',          label: 'Thai'          },
  { id: 'mediterranean', label: 'Mediterranean' },
  { id: 'american',      label: 'American'      },
  { id: 'french',        label: 'French'        },
  { id: 'korean',        label: 'Korean'        },
]

// ─── Shared helpers ───────────────────────────────────────────────────────────

function toggle<T>(set: T[], value: T): T[] {
  return set.includes(value) ? set.filter(v => v !== value) : [...set, value]
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1)
  const [selectedGoal, setSelectedGoal] = useState<HealthGoal | null>(null)
  const [selectedDiet, setSelectedDiet] = useState<DietaryRestriction[]>([])
  const [selectedCuisines, setSelectedCuisines] = useState<CuisinePreference[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleFinishSetup = async () => {
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        health_goal: selectedGoal,
        dietary_restrictions: selectedDiet,
        cuisine_preferences: selectedCuisines,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Something went wrong')
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  // ── Shared UI pieces ────────────────────────────────────────────────────────

  const stepLabel = (
    <div className="mb-8">
      <p className="text-center text-sm font-medium text-gray-400 tracking-widest uppercase mb-3">
        Step {currentStep} of 3
      </p>
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div
          className="bg-[#2C7A4B] h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${(currentStep / 3) * 100}%` }}
        />
      </div>
    </div>
  )

  const backButton = (targetStep: 1 | 2) => (
    <button
      onClick={() => setCurrentStep(targetStep)}
      className="px-8 py-3 rounded-xl text-sm font-semibold text-gray-500 border border-gray-200 bg-white hover:bg-gray-50 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#2C7A4B]"
    >
      Back
    </button>
  )

  // ── Step 1 ──────────────────────────────────────────────────────────────────

  if (currentStep === 1) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
          {stepLabel}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-8 py-10">
            <div className="text-center mb-10">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">What is your health goal?</h1>
              <p className="text-gray-500 text-base">Help us personalise your nutrition plan</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
              {goals.map(goal => {
                const isSelected = selectedGoal === goal.id
                return (
                  <button
                    key={goal.id}
                    onClick={() => setSelectedGoal(goal.id)}
                    className={[
                      'flex items-start gap-4 text-left rounded-xl border-2 px-5 py-5 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#2C7A4B]',
                      isSelected ? 'border-[#2C7A4B] bg-[#f0f9f4]' : 'border-gray-200 bg-white hover:border-[#2C7A4B]/40 hover:bg-gray-50',
                    ].join(' ')}
                    aria-pressed={isSelected}
                  >
                    <span className={['mt-0.5 flex-shrink-0 rounded-lg p-2 transition-colors duration-150', isSelected ? 'bg-[#2C7A4B] text-white' : 'bg-gray-100 text-gray-500'].join(' ')}>
                      {goal.icon}
                    </span>
                    <span className="flex flex-col">
                      <span className={['text-base font-semibold transition-colors duration-150', isSelected ? 'text-[#2C7A4B]' : 'text-gray-800'].join(' ')}>
                        {goal.label}
                      </span>
                      <span className="text-sm text-gray-500 mt-0.5">{goal.description}</span>
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setCurrentStep(2)}
                disabled={selectedGoal === null}
                className={['px-8 py-3 rounded-xl text-sm font-semibold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#2C7A4B]', selectedGoal !== null ? 'bg-[#2C7A4B] text-white hover:bg-[#235f3a] cursor-pointer' : 'bg-gray-200 text-gray-400 cursor-not-allowed'].join(' ')}
                aria-disabled={selectedGoal === null}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Step 2 ──────────────────────────────────────────────────────────────────

  if (currentStep === 2) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
          {stepLabel}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-8 py-10">
            <div className="text-center mb-10">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Select your dietary restrictions</h1>
              <p className="text-gray-500 text-base">We&apos;ll make sure your recipes match your preferences</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
              {dietaryOptions.map(option => {
                const isChecked = selectedDiet.includes(option.id)
                return (
                  <label
                    key={option.id}
                    className={['flex items-center gap-3 rounded-xl border-2 px-5 py-4 cursor-pointer transition-all duration-150', isChecked ? 'border-[#2C7A4B] bg-[#f0f9f4]' : 'border-gray-200 bg-white hover:border-[#2C7A4B]/40 hover:bg-gray-50'].join(' ')}
                  >
                    <span className={['flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors duration-150', isChecked ? 'bg-[#2C7A4B] border-[#2C7A4B]' : 'bg-white border-gray-300'].join(' ')}>
                      {isChecked && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <input type="checkbox" checked={isChecked} onChange={() => setSelectedDiet(toggle(selectedDiet, option.id))} className="sr-only" aria-label={option.label} />
                    <span className={['text-sm font-medium transition-colors duration-150', isChecked ? 'text-[#2C7A4B]' : 'text-gray-700'].join(' ')}>
                      {option.label}
                    </span>
                  </label>
                )
              })}
            </div>
            <div className="flex justify-between items-center">
              {backButton(1)}
              {selectedDiet.length === 0 ? (
                <button onClick={() => setCurrentStep(3)} className="text-sm font-medium text-gray-400 underline underline-offset-4 hover:text-gray-600 transition-colors duration-150 cursor-pointer">
                  Skip
                </button>
              ) : (
                <button onClick={() => setCurrentStep(3)} className="px-8 py-3 rounded-xl text-sm font-semibold bg-[#2C7A4B] text-white hover:bg-[#235f3a] transition-all duration-150 cursor-pointer">
                  Next
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Step 3 ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        {stepLabel}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-8 py-10">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Choose your favourite cuisines</h1>
            <p className="text-gray-500 text-base">Select all that apply — we&apos;ll find the best recipes for you</p>
          </div>
          <div className="flex flex-wrap gap-3 mb-10">
            {cuisineOptions.map(option => {
              const isSelected = selectedCuisines.includes(option.id)
              return (
                <button
                  key={option.id}
                  onClick={() => setSelectedCuisines(toggle(selectedCuisines, option.id))}
                  className={['px-5 py-2.5 rounded-full border-2 text-sm font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#2C7A4B]', isSelected ? 'border-[#2C7A4B] bg-[#2C7A4B] text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-[#2C7A4B]/40 hover:bg-gray-50'].join(' ')}
                  aria-pressed={isSelected}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
          {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}
          <div className="flex justify-between">
            {backButton(2)}
            <button
              onClick={handleFinishSetup}
              disabled={loading}
              className="px-8 py-3 rounded-xl text-sm font-semibold bg-[#2C7A4B] text-white hover:bg-[#235f3a] transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#2C7A4B] cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Finish Setup'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}