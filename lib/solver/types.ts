import type { RecipeCategory } from "../types";

/**
 * Simplified recipe data for the solver.
 * Mirrors the Python RecipeInput dataclass.
 */
export interface RecipeInput {
  id: string;
  name: string;
  category: RecipeCategory;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  frequencyLimit: number;
  rating: number | null;
  ingredients: string[] | null;
}

/**
 * Result from the solver.
 * Mirrors the Python SolvedPlan dataclass.
 */
export interface SolvedPlan {
  name: string;
  planData: Record<string, Record<string, string | null>>;
  macroSummary: {
    dailyAverages: Record<string, number>;
    dailyBreakdown: Array<Record<string, number | string>>;
  };
}
