import type { SQLiteDatabase } from "expo-sqlite";
import { SCHEMA_VERSION, CREATE_TABLES } from "./schema";

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  // Get current schema version
  const result = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version"
  );
  const currentVersion = result?.user_version ?? 0;

  if (currentVersion >= SCHEMA_VERSION) {
    return; // Already up to date
  }

  // Run initial schema creation
  if (currentVersion < 1) {
    await db.execAsync(CREATE_TABLES);

    // Insert default preferences row
    await db.runAsync(
      "INSERT OR IGNORE INTO preferences (id, macro_targets, solver_settings) VALUES (1, ?, ?)",
      JSON.stringify({
        calories: { enabled: true, value: 2000 },
        protein: { enabled: true, value: 150 },
        fat: { enabled: true, value: 65 },
        carbs: { enabled: true, value: 250 },
        fiber: { enabled: false, value: 30 },
        defaultFrequency: 3,
        numDays: 6,
        includeSnacks: false,
        combineLunchDinner: false,
        preferSimilarIngredients: false,
        selectedSlots: ["breakfast", "lunch", "dinner"],
        priorityOrder: ["calories", "protein", "fat", "carbs", "fiber"],
      }),
      "{}"
    );

    // Insert default sync_state row
    await db.runAsync(
      "INSERT OR IGNORE INTO sync_state (id) VALUES (1)"
    );
  }

  // Future migrations would go here:
  // if (currentVersion < 2) { ... }

  // Update schema version
  await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}
