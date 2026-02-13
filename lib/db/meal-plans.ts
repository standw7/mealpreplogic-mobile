import type { SQLiteDatabase } from "expo-sqlite";
import { v4 as uuid } from "uuid";
import type {
  MealPlan,
  DayPlan,
  MealAssignment,
  MacroSummary,
  Recipe,
  MealSlot,
} from "../types";

interface MealPlanRow {
  id: string;
  name: string;
  plan_data: string; // JSON: { "Day 1": { "breakfast": "recipe-id", ... }, ... }
  daily_cal_target: number | null;
  daily_protein_target: number | null;
  daily_fat_target: number | null;
  daily_carb_target: number | null;
  daily_fiber_target: number | null;
  is_selected: number; // 0 or 1
  created_at: string;
  updated_at: string;
  synced_at: string | null;
}

/**
 * Convert a MealPlanRow to a MealPlan without hydrating recipe objects.
 * The days array will contain MealAssignment entries with recipe IDs only
 * (recipe objects will have just the id field populated).
 */
function rowToMealPlan(row: MealPlanRow): MealPlan {
  const planData: Record<string, Record<string, string>> = JSON.parse(
    row.plan_data || "{}"
  );

  const days: DayPlan[] = Object.entries(planData).map(([day, slots]) => {
    const meals: MealAssignment[] = Object.entries(slots).map(
      ([slot, recipeId]) => ({
        slot: slot as MealSlot,
        recipe: { id: recipeId } as Recipe,
      })
    );

    return {
      day,
      meals,
      totalCalories: 0,
      totalProtein: 0,
      totalFat: 0,
      totalCarbs: 0,
    };
  });

  const macroSummary: MacroSummary = {
    avgCalories: row.daily_cal_target ?? 0,
    avgProtein: row.daily_protein_target ?? 0,
    avgFat: row.daily_fat_target ?? 0,
    avgCarbs: row.daily_carb_target ?? 0,
    avgFiber: row.daily_fiber_target ?? 0,
  };

  return {
    id: row.id,
    label: row.name,
    days,
    macroSummary,
    selected: row.is_selected === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncedAt: row.synced_at,
  };
}

/**
 * Hydrate a MealPlan's day plans with full Recipe objects from a recipe map.
 */
export function hydrateMealPlan(
  plan: MealPlan,
  recipesById: Record<string, Recipe>
): MealPlan {
  const days: DayPlan[] = plan.days.map((dayPlan) => {
    const meals: MealAssignment[] = dayPlan.meals
      .map((ma) => {
        const recipe = recipesById[ma.recipe.id];
        if (!recipe) return null;
        return { slot: ma.slot, recipe };
      })
      .filter((m): m is MealAssignment => m !== null);

    return {
      day: dayPlan.day,
      meals,
      totalCalories: meals.reduce((sum, m) => sum + m.recipe.calories, 0),
      totalProtein: meals.reduce((sum, m) => sum + m.recipe.protein, 0),
      totalFat: meals.reduce((sum, m) => sum + m.recipe.fat, 0),
      totalCarbs: meals.reduce((sum, m) => sum + m.recipe.carbs, 0),
    };
  });

  return { ...plan, days };
}

/**
 * Convert a MealPlan to plan_data JSON for storage.
 */
function mealPlanToPlanData(
  days: DayPlan[]
): Record<string, Record<string, string>> {
  const planData: Record<string, Record<string, string>> = {};
  for (const dayPlan of days) {
    const slots: Record<string, string> = {};
    for (const meal of dayPlan.meals) {
      slots[meal.slot] = meal.recipe.id;
    }
    planData[dayPlan.day] = slots;
  }
  return planData;
}

/**
 * Get all meal plans, ordered by created_at DESC.
 * Returns raw plan data (recipe objects are not hydrated).
 */
export async function getAllMealPlans(
  db: SQLiteDatabase
): Promise<MealPlan[]> {
  const rows = await db.getAllAsync<MealPlanRow>(
    "SELECT * FROM meal_plans ORDER BY created_at DESC"
  );
  return rows.map(rowToMealPlan);
}

/**
 * Get a single meal plan by id.
 */
export async function getMealPlanById(
  db: SQLiteDatabase,
  id: string
): Promise<MealPlan | null> {
  const row = await db.getFirstAsync<MealPlanRow>(
    "SELECT * FROM meal_plans WHERE id = ?",
    id
  );
  return row ? rowToMealPlan(row) : null;
}

/**
 * Insert a new meal plan. Returns the generated id.
 */
export async function insertMealPlan(
  db: SQLiteDatabase,
  plan: Omit<MealPlan, "id" | "createdAt" | "updatedAt" | "syncedAt">
): Promise<string> {
  const id = uuid();
  const now = new Date().toISOString();
  const planData = JSON.stringify(mealPlanToPlanData(plan.days));

  await db.runAsync(
    `INSERT INTO meal_plans (id, name, plan_data, daily_cal_target, daily_protein_target, daily_fat_target, daily_carb_target, daily_fiber_target, is_selected, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    plan.label,
    planData,
    plan.macroSummary.avgCalories || null,
    plan.macroSummary.avgProtein || null,
    plan.macroSummary.avgFat || null,
    plan.macroSummary.avgCarbs || null,
    plan.macroSummary.avgFiber || null,
    plan.selected ? 1 : 0,
    now,
    now
  );

  return id;
}

/**
 * Select a meal plan: sets is_selected=0 on ALL plans,
 * then sets is_selected=1 on the given plan id.
 */
export async function selectMealPlan(
  db: SQLiteDatabase,
  id: string
): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(
    "UPDATE meal_plans SET is_selected = 0, updated_at = ?",
    now
  );
  await db.runAsync(
    "UPDATE meal_plans SET is_selected = 1, updated_at = ? WHERE id = ?",
    now,
    id
  );
}

/**
 * Delete a meal plan by id.
 */
export async function deleteMealPlan(
  db: SQLiteDatabase,
  id: string
): Promise<void> {
  await db.runAsync("DELETE FROM meal_plans WHERE id = ?", id);
}

/**
 * Delete all meal plans.
 */
export async function deleteAllMealPlans(
  db: SQLiteDatabase
): Promise<void> {
  await db.runAsync("DELETE FROM meal_plans");
}

/**
 * Get the currently selected meal plan (is_selected=1).
 */
export async function getSelectedMealPlan(
  db: SQLiteDatabase
): Promise<MealPlan | null> {
  const row = await db.getFirstAsync<MealPlanRow>(
    "SELECT * FROM meal_plans WHERE is_selected = 1"
  );
  return row ? rowToMealPlan(row) : null;
}
