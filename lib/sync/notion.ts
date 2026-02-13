import * as WebBrowser from "expo-web-browser";
import type { SQLiteDatabase } from "expo-sqlite";
import { getSyncState, saveSyncState } from "../db/sync-state";
import { insertRecipe, updateRecipe, getAllRecipes } from "../db/recipes";
import type { Recipe } from "../types";

const API_BASE = "https://mealpreplogic-production.up.railway.app";

/**
 * Get the Notion OAuth URL from the backend.
 */
export async function getNotionAuthUrl(token: string): Promise<string> {
  const res = await fetch(`${API_BASE}/auth/notion`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to get Notion auth URL");
  const data = await res.json();
  return data.url;
}

/**
 * Start the Notion OAuth flow in a browser.
 * Returns true if the connection was successful.
 */
export async function connectNotion(db: SQLiteDatabase): Promise<boolean> {
  const syncState = await getSyncState(db);
  if (!syncState?.serverToken)
    throw new Error("Must be logged in to connect Notion");

  const url = await getNotionAuthUrl(syncState.serverToken);

  // Open browser for OAuth
  const result = await WebBrowser.openAuthSessionAsync(
    url,
    "mealpreplogic://auth/notion/callback" // redirect URI
  );

  if (result.type === "success" && result.url) {
    // Extract auth code from redirect URL
    const urlObj = new URL(result.url);
    const code = urlObj.searchParams.get("code");

    if (code) {
      // Exchange code for token via backend
      const res = await fetch(`${API_BASE}/auth/notion/callback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${syncState.serverToken}`,
        },
        body: JSON.stringify({ code }),
      });

      if (res.ok) {
        const data = await res.json();
        // Update local sync state with Notion credentials
        await saveSyncState(db, {
          notionAccessToken: data.notion_access_token || "connected",
          notionWorkspaceId: data.notion_workspace_id,
        });
        return true;
      }
    }
  }

  return false;
}

/**
 * Fetch available Notion databases for the user to select from.
 */
export async function getNotionDatabases(
  token: string
): Promise<Array<{ id: string; title: string }>> {
  const res = await fetch(`${API_BASE}/auth/notion/databases`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch databases");
  return res.json();
}

/**
 * Select a Notion database for recipe sync.
 */
export async function selectNotionDatabase(
  db: SQLiteDatabase,
  databaseId: string
): Promise<void> {
  const syncState = await getSyncState(db);
  if (!syncState?.serverToken) throw new Error("Not logged in");

  const res = await fetch(`${API_BASE}/auth/notion/database`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${syncState.serverToken}`,
    },
    body: JSON.stringify({ database_id: databaseId }),
  });

  if (!res.ok) throw new Error("Failed to select database");

  await saveSyncState(db, { notionDatabaseId: databaseId });
}

/**
 * Sync recipes from Notion via the backend.
 * Returns the number of recipes imported/updated.
 */
export async function syncRecipesFromNotion(
  db: SQLiteDatabase
): Promise<number> {
  const syncState = await getSyncState(db);
  if (!syncState?.serverToken) throw new Error("Not logged in");

  const res = await fetch(`${API_BASE}/recipes/sync-notion`, {
    method: "POST",
    headers: { Authorization: `Bearer ${syncState.serverToken}` },
  });

  if (!res.ok) throw new Error("Failed to sync from Notion");

  const recipes = await res.json();
  let count = 0;

  for (const serverRecipe of recipes) {
    const normalized = normalizeNotionRecipe(serverRecipe);
    const existing = (await getAllRecipes(db)).find(
      (r) => r.notionPageId === normalized.notionPageId
    );

    if (existing) {
      await updateRecipe(db, existing.id, normalized);
    } else {
      await insertRecipe(db, normalized);
    }
    count++;
  }

  return count;
}

/**
 * Disconnect Notion from the user's account.
 * Best-effort server disconnect, then clears local state.
 */
export async function disconnectNotion(db: SQLiteDatabase): Promise<void> {
  const syncState = await getSyncState(db);
  if (syncState?.serverToken) {
    await fetch(`${API_BASE}/auth/notion`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${syncState.serverToken}` },
    }).catch(() => {}); // Best-effort server disconnect
  }

  await saveSyncState(db, {
    notionAccessToken: null,
    notionWorkspaceId: null,
    notionDatabaseId: null,
  } as any);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeNotionRecipe(server: any): Partial<Recipe> {
  return {
    name: server.name,
    category: server.category,
    calories: server.calories || 0,
    protein: server.protein || 0,
    fat: server.fat || 0,
    carbs: server.carbohydrates || server.carbs || 0,
    fiber: server.fiber || 0,
    ingredients: server.ingredients || [],
    instructions: server.instructions,
    imageUrl: server.image_url,
    source: "notion",
    sourceUrl: server.source_url,
    notionPageId: server.notion_page_id,
    rating: server.rating,
    frequency: server.frequency_limit,
    servings: server.servings || 1,
  };
}
