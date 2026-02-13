export type RecipeCategory = "breakfast" | "lunch" | "dinner" | "snack" | "dessert";
export type RecipeSource = "notion" | "web" | "manual";

export interface Recipe {
  id: string;
  name: string;
  category: RecipeCategory;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber?: number;
  ingredients?: string[];
  instructions?: string | null;
  imageUrl?: string;
  source: RecipeSource;
  sourceUrl?: string;
  notionPageId?: string | null;
  rating?: number;
  frequency?: number;
  servings: number;
  createdAt: string;
  updatedAt: string;
  syncedAt?: string | null;
}

export interface RecipeUpdatePayload {
  name?: string;
  category?: RecipeCategory;
  calories?: number;
  protein?: number;
  fat?: number;
  carbohydrates?: number;
  fiber?: number;
  ingredients?: string[];
  instructions?: string;
  image_url?: string;
  source_url?: string;
  rating?: number;
  frequency_limit?: number;
  servings?: number;
}

export interface MacroTarget {
  enabled: boolean;
  value: number;
}

export interface MacroTargets {
  calories: MacroTarget;
  protein: MacroTarget;
  fat: MacroTarget;
  carbs: MacroTarget;
  fiber: MacroTarget;
  defaultFrequency: number;
  numDays: number;
  includeSnacks: boolean;
  combineLunchDinner: boolean;
  preferSimilarIngredients: boolean;
  selectedSlots: string[];
  priorityOrder: string[];
}

export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack" | "dessert";

export interface MealAssignment {
  slot: MealSlot;
  recipe: Recipe;
}

export interface DayPlan {
  day: string;
  meals: MealAssignment[];
  totalCalories: number;
  totalProtein: number;
  totalFat: number;
  totalCarbs: number;
}

export interface MacroSummary {
  avgCalories: number;
  avgProtein: number;
  avgFat: number;
  avgCarbs: number;
  avgFiber: number;
}

export interface MealPlan {
  id: string;
  label: string;
  days: DayPlan[];
  macroSummary: MacroSummary;
  selected: boolean;
  createdAt: string;
  updatedAt?: string;
  syncedAt?: string | null;
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  checked: boolean;
  category?: string;
}

export interface ShoppingList {
  id: string;
  planId: string;
  planLabel: string;
  items: ShoppingItem[];
  createdAt: string;
}

export interface User {
  id: number;
  email: string;
  has_password: boolean;
  notion_workspace_id?: string | null;
  notion_database_id?: string | null;
  preferences?: MacroTargets | null;
  created_at: string;
  updated_at: string;
}

export interface RecipeFilters {
  category?: RecipeCategory;
  source?: RecipeSource;
  search?: string;
}

export interface GeneratePlansRequest {
  targets: MacroTargets;
}

export interface ScrapeRecipeResponse {
  recipe: Partial<Recipe>;
  preview: boolean;
}

export interface SyncState {
  lastSyncAt: string | null;
  serverToken: string | null;
  email: string | null;
  notionAccessToken: string | null;
  notionWorkspaceId: string | null;
  notionDatabaseId: string | null;
}

export interface SyncConflict {
  type: "recipe" | "meal_plan";
  localVersion: Recipe | MealPlan;
  serverVersion: Recipe | MealPlan;
}

export interface Preferences {
  macroTargets: MacroTargets;
  updatedAt: string;
}
