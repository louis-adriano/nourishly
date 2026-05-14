"use client";

import { useState } from "react";

type HealthGoal = "weight-loss" | "muscle-gain" | "general-wellness" | "athletic-performance";

interface GoalCard {
  id: HealthGoal;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const goals: GoalCard[] = [
  {
    id: "weight-loss",
    label: "Weight Loss",
    description: "Reduce body weight healthily",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
    ),
  },
  {
    id: "muscle-gain",
    label: "Muscle Gain",
    description: "Build strength and muscle mass",
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
    id: "general-wellness",
    label: "General Wellness",
    description: "Maintain a balanced healthy lifestyle",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
  },
  {
    id: "athletic-performance",
    label: "Athletic Performance",
    description: "Optimise nutrition for sports",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polygon points="10 8 16 12 10 16 10 8" />
      </svg>
    ),
  },
];

export default function OnboardingPage() {
  const [selectedGoal, setSelectedGoal] = useState<HealthGoal | null>(null);

  const handleNext = () => {
    // Placeholder — navigation to be wired up later
    console.log("Selected goal:", selectedGoal);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">

        {/* Progress label */}
        <p className="text-center text-sm font-medium text-gray-400 tracking-widest uppercase mb-8">
          Step 1 of 3
        </p>

        {/* Card container */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-8 py-10">

          {/* Heading */}
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              What is your health goal?
            </h1>
            <p className="text-gray-500 text-base">
              Help us personalise your nutrition plan
            </p>
          </div>

          {/* Goal cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
            {goals.map((goal) => {
              const isSelected = selectedGoal === goal.id;
              return (
                <button
                  key={goal.id}
                  onClick={() => setSelectedGoal(goal.id)}
                  className={[
                    "flex items-start gap-4 text-left rounded-xl border-2 px-5 py-5 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#2C7A4B]",
                    isSelected
                      ? "border-[#2C7A4B] bg-[#f0f9f4]"
                      : "border-gray-200 bg-white hover:border-[#2C7A4B]/40 hover:bg-gray-50",
                  ].join(" ")}
                  aria-pressed={isSelected}
                >
                  {/* Icon */}
                  <span
                    className={[
                      "mt-0.5 flex-shrink-0 rounded-lg p-2 transition-colors duration-150",
                      isSelected
                        ? "bg-[#2C7A4B] text-white"
                        : "bg-gray-100 text-gray-500",
                    ].join(" ")}
                  >
                    {goal.icon}
                  </span>

                  {/* Text */}
                  <span className="flex flex-col">
                    <span
                      className={[
                        "text-base font-semibold transition-colors duration-150",
                        isSelected ? "text-[#2C7A4B]" : "text-gray-800",
                      ].join(" ")}
                    >
                      {goal.label}
                    </span>
                    <span className="text-sm text-gray-500 mt-0.5">
                      {goal.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Next button */}
          <div className="flex justify-end">
            <button
              onClick={handleNext}
              disabled={selectedGoal === null}
              className={[
                "px-8 py-3 rounded-xl text-sm font-semibold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#2C7A4B]",
                selectedGoal !== null
                  ? "bg-[#2C7A4B] text-white hover:bg-[#235f3a] cursor-pointer"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed",
              ].join(" ")}
              aria-disabled={selectedGoal === null}
            >
              Next
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}