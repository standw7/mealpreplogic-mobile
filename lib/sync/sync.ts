import type { SQLiteDatabase } from "expo-sqlite";
import type { Recipe, SyncConflict } from "../types";
import {
  getAllRecipes,
  getRecipeById,
  insertRecipe,
  updateRecipe,
  getRecipesUpdatedSince,
} from "../db/recipes";
import { getSyncState, saveSyncState } from "../db/sync-state";
import { getPreferences, savePreferences } from "../db/preferences";
import {
  fetchServerRecipes,
  pushRecipeToServer,
  fetchServerPreferences,
  pushPreferences,
} from "./api";

export interface SyncResult {
  pulled: number;
  pushed: number;
  conflicts: SyncConflict[];
  error?: string;
}

/**
 * Perform a full two-way sync between the local SQLite database and the
 * remote MealPrepLogic server.
 *
 * Steps:
 * 1. PULL  - fetch server recipes and upsert locally (detecting conflicts).
 * 2. PUSH  - send locally-modified recipes to the server.
 * 3. PREFS - sync macro-target preferences in both directions.
 * 4. Update lastSyncAt timestamp on success.
 */
export async function performSync(
  db: SQLiteDatabase
): Promise<SyncResult> {
  const syncState = await getSyncState(db);
  if (!syncState?.serverToken) {
    return { pulled: 0, pushed: 0, conflicts: [], error: "Not logged in" };
  }

  const token = syncState.serverToken;
  const lastSync = syncState.lastSyncAt;
  const result: SyncResult = { pulled: 0, pushed: 0, conflicts: [] };

  try {
    // ── PULL: Fetch server recipes ──────────────────────────────────────
    const serverRecipes = await fetchServerRecipes(
      token,
      lastSync || undefined
    );

    for (const serverRecipe of serverRecipes) {
      const normalized = normalizeServerRecipe(serverRecipe);

      // Check if the recipe already exists locally by id
      const localMatch = normalized.id
        ? await getRecipeById(db, normalized.id)
        : null;

      if (!localMatch) {
        // New on server -- insert locally
        await insertRecipe(db, normalized);
        result.pulled++;
      } else if (
        localMatch.syncedAt &&
        localMatch.updatedAt &&
        localMatch.updatedAt > localMatch.syncedAt
      ) {
        // Both sides modified since last sync -- conflict
        result.conflicts.push({
          type: "recipe",
          localVersion: localMatch,
          serverVersion: normalized as Recipe,
        });
      } else {
        // Server is newer (or local is unchanged) -- update local
        await updateRecipe(db, localMatch.id, normalized);
        result.pulled++;
      }
    }

    // ── PUSH: Send locally-changed recipes ──────────────────────────────
    const localChanges = await getRecipesUpdatedSince(
      db,
      lastSync || "1970-01-01"
    );

    for (const recipe of localChanges) {
      try {
        await pushRecipeToServer(token, recipe);
        // Mark as synced so it isn't re-pushed next time
        await updateRecipe(db, recipe.id, {
          syncedAt: new Date().toISOString(),
        } as Partial<Recipe>);
        result.pushed++;
      } catch (err) {
        // Individual push failure -- skip, don't break entire sync
        console.warn("Failed to push recipe:", recipe.name, err);
      }
    }

    // ── SYNC PREFERENCES ────────────────────────────────────────────────
    try {
      const serverPrefs = await fetchServerPreferences(token);
      if (serverPrefs && Object.keys(serverPrefs).length > 0) {
        await savePreferences(db, serverPrefs);
      }
      const localPrefs = await getPreferences(db);
      if (localPrefs) {
        await pushPreferences(token, localPrefs);
      }
    } catch {
      // Preferences sync failure is non-critical
    }

    // ── Update last sync timestamp ──────────────────────────────────────
    await saveSyncState(db, { lastSyncAt: new Date().toISOString() });
  } catch (err: any) {
    result.error = err.message || "Sync failed";
  }

  return result;
}

/**
 * Apply a batch of conflict resolutions.
 *
 * For each resolution the caller specifies whether to keep the "local" or
 * "server" version. When "server" is chosen the local row is overwritten;
 * when "local" is chosen the local version is pushed to the server.
 */
export async function resolveConflicts(
  db: SQLiteDatabase,
  token: string,
  resolutions: Array<{
    conflict: SyncConflict;
    keep: "local" | "server";
  }>
): Promise<void> {
  for (const { conflict, keep } of resolutions) {
    if (conflict.type !== "recipe") continue;

    const local = conflict.localVersion as Recipe;
    const server = conflict.serverVersion as Recipe;

    if (keep === "server") {
      // Overwrite local with server data
      await updateRecipe(db, local.id, {
        ...normalizeServerRecipe(server),
        syncedAt: new Date().toISOString(),
      } as Partial<Recipe>);
    } else {
      // Push local to server, then mark synced
      try {
        await pushRecipeToServer(token, local);
        await updateRecipe(db, local.id, {
          syncedAt: new Date().toISOString(),
        } as Partial<Recipe>);
      } catch (err) {
        console.warn("Failed to push conflict resolution:", local.name, err);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Normalize a server recipe response to the local Partial<Recipe> shape.
 *
 * The server's RecipeResponse serializer already outputs camelCase fields
 * (imageUrl, sourceUrl, notionPageId, createdAt, etc.) so we map those
 * directly. We also handle any residual snake_case fields just in case.
 */
function normalizeServerRecipe(server: any): Partial<Recipe> {
  return {
    id: String(server.id),
    name: server.name,
    category: server.category,
    calories: server.calories || 0,
    protein: server.protein || 0,
    fat: server.fat || 0,
    carbs: server.carbohydrates || server.carbs || 0,
    fiber: server.fiber || 0,
    ingredients: server.ingredients || [],
    instructions: server.instructions,
    imageUrl: server.imageUrl || server.image_url,
    source: server.source || "manual",
    sourceUrl: server.sourceUrl || server.source_url,
    notionPageId: server.notionPageId || server.notion_page_id,
    rating: server.rating,
    frequency: server.frequency ?? server.frequency_limit,
    servings: server.servings || 1,
    createdAt: server.createdAt || server.created_at,
    updatedAt:
      server.updatedAt || server.updated_at || server.createdAt || server.created_at,
    syncedAt: new Date().toISOString(),
  };
}
