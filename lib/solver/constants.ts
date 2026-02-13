import type { RecipeCategory } from "../types";

/**
 * Active meal slots for plan generation.
 */
export const MEAL_SLOTS: RecipeCategory[] = ["breakfast", "lunch", "dinner"];

/**
 * Directional preference per macro:
 *   "le" = prefer at or under target
 *   "ge" = prefer at or over target
 *
 * Enforced via a steep soft penalty so going the wrong direction is roughly
 * 10x more expensive than straying the same amount in the preferred direction.
 */
export const MACRO_CAPS: Record<string, "le" | "ge"> = {
  calories: "le",
  protein: "ge",
  fat: "le",
  carbs: "le",
  fiber: "ge",
};

/**
 * Penalty for crossing target in the WRONG direction (per normalised unit).
 * Set to roughly match the top priority weight so going the wrong direction
 * costs ~2x going the right direction by the same amount.
 */
export const CAP_PENALTY = 1000.0;

/**
 * Penalty per day-slot for reusing a recipe from a previous plan.
 * Must be LOW relative to deviation costs so the solver prefers to reuse
 * recipes rather than stray more than ~200 cal from the calorie target.
 * At 30, reusing all 3 meals in a 3-day block = 270 total reuse cost,
 * which equals ~180 cal/day deviation cost (at priority weight 1000).
 */
export const REUSE_PENALTY = 30.0;

/**
 * Per-assignment penalty for lower-rated recipes.  A 5-star recipe gets 0
 * penalty; a 1-star recipe gets RATING_WEIGHT * 0.8 ~ 6.4 per slot.
 * Low enough that macro matching always dominates, high enough to break ties.
 */
export const RATING_WEIGHT = 8.0;

/**
 * Penalty per distinct protein type used across the plan when the user
 * enables "prefer similar ingredients".  Encourages the solver to
 * consolidate around fewer proteins (e.g. all-chicken rather than
 * chicken + beef + pork) to simplify shopping.
 */
export const PROTEIN_VARIETY_PENALTY = 500.0;

/**
 * Keyword lists for categorising a recipe's main protein.
 */
export const PROTEIN_KEYWORDS: Record<string, string[]> = {
  chicken: ["chicken"],
  beef: ["beef", "steak", "brisket", "ground beef"],
  pork: ["pork", "bacon", "ham", "sausage"],
  turkey: ["turkey"],
  fish: [
    "salmon", "tuna", "tilapia", "cod", "fish",
    "trout", "mahi", "halibut", "bass", "snapper", "swordfish",
  ],
  seafood: ["shrimp", "prawn", "crab", "lobster", "scallop"],
  tofu: ["tofu", "tempeh", "seitan"],
  eggs: ["egg", "eggs", "frittata", "omelette", "omelet"],
  lamb: ["lamb"],
  duck: ["duck"],
};

/**
 * Hard-bound max deviation from target (both directions).
 * Prevents Plans 2+ from straying wildly even in edge cases.
 * Scaled by priority rank.  If infeasible, falls back to soft-only.
 */
export const BASE_MAX_DEV: Record<string, number> = {
  calories: 200,
  protein: 20,
  fat: 20,
  carbs: 40,
  fiber: 15,
};
