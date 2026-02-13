/**
 * Meal reroll logic.
 *
 * When a user wants to swap a specific meal in their plan, this module
 * finds a suitable replacement recipe that:
 *   - Belongs to the same category as the slot
 *   - Is not already used anywhere in the plan
 *   - Is as close as possible in macros to the replaced recipe
 *
 * Ported from the Python plans router (`POST /{plan_id}/reroll`).
 */

import type { Recipe, MealPlan, DayPlan, MacroSummary, MealSlot } from "../types";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface RerollResult {
  updatedPlan: MealPlan;
  newRecipe: Recipe;
}

// ---------------------------------------------------------------------------
// Tolerance thresholds (mirrors the Python TOLERANCES dict)
// ---------------------------------------------------------------------------

const TOLERANCES = {
  calories: 100,
  protein: 10,
  fat: 10,
  carbs: 10,
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Check whether a candidate recipe is within the tolerance window of
 * the current recipe across all four macro dimensions.
 */
function withinTolerance(candidate: Recipe, current: Recipe): boolean {
  if (Math.abs((candidate.calories || 0) - (current.calories || 0)) > TOLERANCES.calories) return false;
  if (Math.abs((candidate.protein || 0) - (current.protein || 0)) > TOLERANCES.protein) return false;
  if (Math.abs((candidate.fat || 0) - (current.fat || 0)) > TOLERANCES.fat) return false;
  if (Math.abs((candidate.carbs || 0) - (current.carbs || 0)) > TOLERANCES.carbs) return false;
  return true;
}

/**
 * Compute a normalised squared-distance score between a candidate and
 * the current recipe across four macro dimensions.  Lower is better.
 *
 * Uses the same formula as the Python backend:
 *   sum( ((candidate_val - current_val) / max(current_val, 1))^2 )
 */
function macroDistance(candidate: Recipe, current: Recipe): number {
  let score = 0;
  for (const field of ["calories", "protein", "fat", "carbs"] as const) {
    const cVal = candidate[field] || 0;
    const curVal = current[field] || 0;
    const denom = Math.max(curVal, 1);
    score += ((cVal - curVal) / denom) ** 2;
  }
  return score;
}

/**
 * Recompute the macro summary (daily averages) from a plan's day data.
 */
function computeMacroSummary(days: DayPlan[]): MacroSummary {
  const numDays = Math.max(days.length, 1);

  let totalCalories = 0;
  let totalProtein = 0;
  let totalFat = 0;
  let totalCarbs = 0;
  let totalFiber = 0;

  for (const day of days) {
    for (const meal of day.meals) {
      totalCalories += meal.recipe.calories || 0;
      totalProtein += meal.recipe.protein || 0;
      totalFat += meal.recipe.fat || 0;
      totalCarbs += meal.recipe.carbs || 0;
      totalFiber += meal.recipe.fiber || 0;
    }
  }

  return {
    avgCalories: Math.round((totalCalories / numDays) * 10) / 10,
    avgProtein: Math.round((totalProtein / numDays) * 10) / 10,
    avgFat: Math.round((totalFat / numDays) * 10) / 10,
    avgCarbs: Math.round((totalCarbs / numDays) * 10) / 10,
    avgFiber: Math.round((totalFiber / numDays) * 10) / 10,
  };
}

/**
 * Recompute per-day macro totals for a DayPlan from its meal assignments.
 */
function recomputeDayTotals(day: DayPlan): DayPlan {
  let totalCalories = 0;
  let totalProtein = 0;
  let totalFat = 0;
  let totalCarbs = 0;

  for (const meal of day.meals) {
    totalCalories += meal.recipe.calories || 0;
    totalProtein += meal.recipe.protein || 0;
    totalFat += meal.recipe.fat || 0;
    totalCarbs += meal.recipe.carbs || 0;
  }

  return {
    ...day,
    totalCalories,
    totalProtein,
    totalFat,
    totalCarbs,
  };
}

// ---------------------------------------------------------------------------
// Main reroll function
// ---------------------------------------------------------------------------

/**
 * Replace a recipe in the given day/slot with a suitable alternative.
 *
 * When block-based grouping is in effect (the same recipe appears in the
 * same slot across multiple days), ALL occurrences of the old recipe in
 * that slot are replaced so the plan stays consistent.
 *
 * @param plan       The current meal plan
 * @param day        Target day label, e.g. "Day 1"
 * @param slot       Target slot, e.g. "breakfast"
 * @param allRecipes Full list of recipes available to the user
 * @returns          Updated plan + the new recipe, or null if no candidates
 */
export function rerollMeal(
  plan: MealPlan,
  day: string,
  slot: string,
  allRecipes: Recipe[],
): RerollResult | null {
  // ------------------------------------------------------------------
  // 1. Find the current recipe at day/slot
  // ------------------------------------------------------------------
  const targetDay = plan.days.find((d) => d.day === day);
  if (!targetDay) return null;

  const targetMeal = targetDay.meals.find((m) => m.slot === slot);
  if (!targetMeal) return null;

  const currentRecipe = targetMeal.recipe;
  if (!currentRecipe) return null;

  // ------------------------------------------------------------------
  // 2. Collect all recipe IDs currently used anywhere in the plan
  //    (excluding the recipe being replaced)
  // ------------------------------------------------------------------
  const usedIds = new Set<string>();
  for (const dayPlan of plan.days) {
    for (const meal of dayPlan.meals) {
      if (meal.recipe.id !== currentRecipe.id) {
        usedIds.add(meal.recipe.id);
      }
    }
  }

  // Also exclude the current recipe itself
  usedIds.add(currentRecipe.id);

  // ------------------------------------------------------------------
  // 3. Filter to candidates: same category as the slot, not in plan
  // ------------------------------------------------------------------
  const candidates = allRecipes.filter(
    (r) => r.category === (slot as MealSlot) && !usedIds.has(r.id),
  );

  if (candidates.length === 0) return null;

  // ------------------------------------------------------------------
  // 4. Apply tolerance filter
  // ------------------------------------------------------------------
  const eligible = candidates.filter((c) => withinTolerance(c, currentRecipe));

  // ------------------------------------------------------------------
  // 5. Pick: randomly from eligible, or closest macro match from all
  // ------------------------------------------------------------------
  let best: Recipe;

  if (eligible.length > 0) {
    const idx = Math.floor(Math.random() * eligible.length);
    best = eligible[idx];
  } else {
    // Sort by macro distance and pick the closest
    candidates.sort((a, b) => macroDistance(a, currentRecipe) - macroDistance(b, currentRecipe));
    best = candidates[0];
  }

  // ------------------------------------------------------------------
  // 6. Replace ALL occurrences of the old recipe in the same slot
  //    across all days (block-based grouping)
  // ------------------------------------------------------------------
  const updatedDays: DayPlan[] = plan.days.map((dayPlan) => {
    const updatedMeals = dayPlan.meals.map((meal) => {
      if (meal.slot === slot && meal.recipe.id === currentRecipe.id) {
        return { ...meal, recipe: best };
      }
      return meal;
    });

    return recomputeDayTotals({ ...dayPlan, meals: updatedMeals });
  });

  // ------------------------------------------------------------------
  // 7. Recalculate macro summary
  // ------------------------------------------------------------------
  const macroSummary = computeMacroSummary(updatedDays);

  // ------------------------------------------------------------------
  // 8. Return updated plan and new recipe
  // ------------------------------------------------------------------
  const updatedPlan: MealPlan = {
    ...plan,
    days: updatedDays,
    macroSummary,
    updatedAt: new Date().toISOString(),
  };

  return { updatedPlan, newRecipe: best };
}
