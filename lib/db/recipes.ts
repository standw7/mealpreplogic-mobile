import type { Recipe, RecipeCategory, RecipeSource, RecipeFilters } from "../types";
import type { SQLiteDatabase } from "expo-sqlite";
import { v4 as uuid } from "uuid";

interface RecipeRow {
  id: string;
  name: string;
  category: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  ingredients: string; // JSON
  instructions: string | null;
  image_url: string | null;
  source: string;
  source_url: string | null;
  notion_page_id: string | null;
  rating: number | null;
  frequency_limit: number;
  servings: number;
  created_at: string;
  updated_at: string;
  synced_at: string | null;
}

function rowToRecipe(row: RecipeRow): Recipe {
  return {
    id: row.id,
    name: row.name,
    category: row.category as RecipeCategory,
    calories: row.calories,
    protein: row.protein,
    fat: row.fat,
    carbs: row.carbs,
    fiber: row.fiber,
    ingredients: JSON.parse(row.ingredients || "[]"),
    instructions: row.instructions,
    imageUrl: row.image_url ?? undefined,
    source: row.source as RecipeSource,
    sourceUrl: row.source_url ?? undefined,
    notionPageId: row.notion_page_id,
    rating: row.rating ?? undefined,
    frequency: row.frequency_limit,
    servings: row.servings,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncedAt: row.synced_at,
  };
}

export async function getAllRecipes(
  db: SQLiteDatabase,
  filters?: RecipeFilters
): Promise<Recipe[]> {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filters?.category) {
    conditions.push("category = ?");
    params.push(filters.category);
  }

  if (filters?.source) {
    conditions.push("source = ?");
    params.push(filters.source);
  }

  if (filters?.search) {
    conditions.push("name LIKE ?");
    params.push(`%${filters.search}%`);
  }

  const where = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";
  const sql = `SELECT * FROM recipes${where} ORDER BY created_at DESC`;

  const rows = await db.getAllAsync<RecipeRow>(sql, ...params);
  return rows.map(rowToRecipe);
}

export async function getRecipeById(
  db: SQLiteDatabase,
  id: string
): Promise<Recipe | null> {
  const row = await db.getFirstAsync<RecipeRow>(
    "SELECT * FROM recipes WHERE id = ?",
    id
  );
  return row ? rowToRecipe(row) : null;
}

export async function getRecipesByIds(
  db: SQLiteDatabase,
  ids: string[]
): Promise<Recipe[]> {
  if (ids.length === 0) return [];

  const placeholders = ids.map(() => "?").join(", ");
  const sql = `SELECT * FROM recipes WHERE id IN (${placeholders})`;

  const rows = await db.getAllAsync<RecipeRow>(sql, ...ids);
  return rows.map(rowToRecipe);
}

export async function insertRecipe(
  db: SQLiteDatabase,
  recipe: Partial<Recipe>
): Promise<Recipe> {
  const now = new Date().toISOString();
  const id = recipe.id || uuid();

  await db.runAsync(
    `INSERT INTO recipes (
      id, name, category, calories, protein, fat, carbs, fiber,
      ingredients, instructions, image_url, source, source_url,
      notion_page_id, rating, frequency_limit, servings,
      created_at, updated_at, synced_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    recipe.name ?? "",
    recipe.category ?? "dinner",
    recipe.calories ?? 0,
    recipe.protein ?? 0,
    recipe.fat ?? 0,
    recipe.carbs ?? 0,
    recipe.fiber ?? 0,
    JSON.stringify(recipe.ingredients ?? []),
    recipe.instructions ?? null,
    recipe.imageUrl ?? null,
    recipe.source ?? "manual",
    recipe.sourceUrl ?? null,
    recipe.notionPageId ?? null,
    recipe.rating ?? null,
    recipe.frequency ?? 3,
    recipe.servings ?? 1,
    now,
    now,
    recipe.syncedAt ?? null
  );

  return (await getRecipeById(db, id))!;
}

export async function updateRecipe(
  db: SQLiteDatabase,
  id: string,
  updates: Partial<Recipe>
): Promise<Recipe | null> {
  const now = new Date().toISOString();
  const setClauses: string[] = [];
  const params: (string | number | null)[] = [];

  if (updates.name !== undefined) {
    setClauses.push("name = ?");
    params.push(updates.name);
  }
  if (updates.category !== undefined) {
    setClauses.push("category = ?");
    params.push(updates.category);
  }
  if (updates.calories !== undefined) {
    setClauses.push("calories = ?");
    params.push(updates.calories);
  }
  if (updates.protein !== undefined) {
    setClauses.push("protein = ?");
    params.push(updates.protein);
  }
  if (updates.fat !== undefined) {
    setClauses.push("fat = ?");
    params.push(updates.fat);
  }
  if (updates.carbs !== undefined) {
    setClauses.push("carbs = ?");
    params.push(updates.carbs);
  }
  if (updates.fiber !== undefined) {
    setClauses.push("fiber = ?");
    params.push(updates.fiber);
  }
  if (updates.ingredients !== undefined) {
    setClauses.push("ingredients = ?");
    params.push(JSON.stringify(updates.ingredients));
  }
  if (updates.instructions !== undefined) {
    setClauses.push("instructions = ?");
    params.push(updates.instructions ?? null);
  }
  if (updates.imageUrl !== undefined) {
    setClauses.push("image_url = ?");
    params.push(updates.imageUrl ?? null);
  }
  if (updates.source !== undefined) {
    setClauses.push("source = ?");
    params.push(updates.source);
  }
  if (updates.sourceUrl !== undefined) {
    setClauses.push("source_url = ?");
    params.push(updates.sourceUrl ?? null);
  }
  if (updates.notionPageId !== undefined) {
    setClauses.push("notion_page_id = ?");
    params.push(updates.notionPageId ?? null);
  }
  if (updates.rating !== undefined) {
    setClauses.push("rating = ?");
    params.push(updates.rating ?? null);
  }
  if (updates.frequency !== undefined) {
    setClauses.push("frequency_limit = ?");
    params.push(updates.frequency);
  }
  if (updates.servings !== undefined) {
    setClauses.push("servings = ?");
    params.push(updates.servings);
  }
  if (updates.syncedAt !== undefined) {
    setClauses.push("synced_at = ?");
    params.push(updates.syncedAt ?? null);
  }

  // Always update updated_at
  setClauses.push("updated_at = ?");
  params.push(now);

  if (setClauses.length === 1) {
    // Only updated_at, nothing else to change
    return getRecipeById(db, id);
  }

  params.push(id);
  const sql = `UPDATE recipes SET ${setClauses.join(", ")} WHERE id = ?`;

  await db.runAsync(sql, ...params);
  return getRecipeById(db, id);
}

export async function deleteRecipe(
  db: SQLiteDatabase,
  id: string
): Promise<void> {
  await db.runAsync("DELETE FROM recipes WHERE id = ?", id);
}

export async function getRecipesUpdatedSince(
  db: SQLiteDatabase,
  since: string
): Promise<Recipe[]> {
  const rows = await db.getAllAsync<RecipeRow>(
    `SELECT * FROM recipes
     WHERE updated_at > ?
       AND (synced_at IS NULL OR updated_at > synced_at)
     ORDER BY updated_at ASC`,
    since
  );
  return rows.map(rowToRecipe);
}

export async function getRecipeCount(
  db: SQLiteDatabase
): Promise<number> {
  const result = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM recipes"
  );
  return result?.count ?? 0;
}
