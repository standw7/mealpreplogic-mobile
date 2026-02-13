import type { SQLiteDatabase } from "expo-sqlite";
import type { MacroTargets } from "../types";

interface PreferencesRow {
  id: number;
  macro_targets: string; // JSON
  solver_settings: string; // JSON
  updated_at: string;
}

/**
 * Get the user's macro target preferences.
 * Returns MacroTargets or null if no preferences are stored.
 */
export async function getPreferences(
  db: SQLiteDatabase
): Promise<MacroTargets | null> {
  const row = await db.getFirstAsync<PreferencesRow>(
    "SELECT * FROM preferences WHERE id = 1"
  );

  if (!row) return null;

  try {
    return JSON.parse(row.macro_targets) as MacroTargets;
  } catch {
    return null;
  }
}

/**
 * Save the user's macro target preferences.
 */
export async function savePreferences(
  db: SQLiteDatabase,
  targets: MacroTargets
): Promise<void> {
  const now = new Date().toISOString();

  await db.runAsync(
    "UPDATE preferences SET macro_targets = ?, updated_at = ? WHERE id = 1",
    JSON.stringify(targets),
    now
  );
}
