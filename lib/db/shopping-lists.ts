import type { SQLiteDatabase } from "expo-sqlite";
import { v4 as uuid } from "uuid";
import type { ShoppingItem, ShoppingList } from "../types";

interface ShoppingListRow {
  id: string;
  meal_plan_id: string;
  items: string; // JSON array of ShoppingItem
  created_at: string;
  updated_at: string;
}

function rowToShoppingList(row: ShoppingListRow): ShoppingList {
  return {
    id: row.id,
    planId: row.meal_plan_id,
    planLabel: "", // Not stored in DB; must be joined from meal_plans if needed
    items: JSON.parse(row.items || "[]") as ShoppingItem[],
    createdAt: row.created_at,
  };
}

/**
 * Get a shopping list by its id.
 */
export async function getShoppingListById(
  db: SQLiteDatabase,
  id: string
): Promise<ShoppingList | null> {
  const row = await db.getFirstAsync<ShoppingListRow>(
    "SELECT * FROM shopping_lists WHERE id = ?",
    id
  );
  return row ? rowToShoppingList(row) : null;
}

/**
 * Get the most recently created shopping list.
 */
export async function getCurrentShoppingList(
  db: SQLiteDatabase
): Promise<ShoppingList | null> {
  const row = await db.getFirstAsync<ShoppingListRow>(
    "SELECT * FROM shopping_lists ORDER BY created_at DESC LIMIT 1"
  );
  return row ? rowToShoppingList(row) : null;
}

/**
 * Insert a new shopping list. Returns the generated id.
 */
export async function insertShoppingList(
  db: SQLiteDatabase,
  planId: string,
  items: ShoppingItem[]
): Promise<string> {
  const id = uuid();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO shopping_lists (id, meal_plan_id, items, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
    id,
    planId,
    JSON.stringify(items),
    now,
    now
  );

  return id;
}

/**
 * Update the items on an existing shopping list.
 */
export async function updateShoppingListItems(
  db: SQLiteDatabase,
  id: string,
  items: ShoppingItem[]
): Promise<void> {
  const now = new Date().toISOString();

  await db.runAsync(
    "UPDATE shopping_lists SET items = ?, updated_at = ? WHERE id = ?",
    JSON.stringify(items),
    now,
    id
  );
}

/**
 * Delete all shopping lists associated with a given meal plan.
 */
export async function deleteShoppingListsForPlan(
  db: SQLiteDatabase,
  planId: string
): Promise<void> {
  await db.runAsync(
    "DELETE FROM shopping_lists WHERE meal_plan_id = ?",
    planId
  );
}
