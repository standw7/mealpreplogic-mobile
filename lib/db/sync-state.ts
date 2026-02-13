import type { SQLiteDatabase } from "expo-sqlite";
import type { SyncState } from "../types";

interface SyncStateRow {
  id: number;
  email: string | null;
  server_token: string | null;
  notion_access_token: string | null;
  notion_workspace_id: string | null;
  notion_database_id: string | null;
  last_sync_at: string | null;
}

function rowToSyncState(row: SyncStateRow): SyncState {
  return {
    email: row.email,
    serverToken: row.server_token,
    notionAccessToken: row.notion_access_token,
    notionWorkspaceId: row.notion_workspace_id,
    notionDatabaseId: row.notion_database_id,
    lastSyncAt: row.last_sync_at,
  };
}

/**
 * Get the current sync state.
 */
export async function getSyncState(
  db: SQLiteDatabase
): Promise<SyncState | null> {
  const row = await db.getFirstAsync<SyncStateRow>(
    "SELECT * FROM sync_state WHERE id = 1"
  );
  return row ? rowToSyncState(row) : null;
}

/**
 * Save partial sync state. Only updates the fields that are provided.
 * Maps camelCase keys to snake_case column names.
 */
export async function saveSyncState(
  db: SQLiteDatabase,
  state: Partial<SyncState>
): Promise<void> {
  const columnMap: Record<keyof SyncState, string> = {
    email: "email",
    serverToken: "server_token",
    notionAccessToken: "notion_access_token",
    notionWorkspaceId: "notion_workspace_id",
    notionDatabaseId: "notion_database_id",
    lastSyncAt: "last_sync_at",
  };

  const setClauses: string[] = [];
  const values: (string | null)[] = [];

  for (const [key, value] of Object.entries(state)) {
    const column = columnMap[key as keyof SyncState];
    if (column) {
      setClauses.push(`${column} = ?`);
      values.push(value ?? null);
    }
  }

  if (setClauses.length === 0) return;

  values.push("1"); // WHERE id = ?
  await db.runAsync(
    `UPDATE sync_state SET ${setClauses.join(", ")} WHERE id = ?`,
    ...values
  );
}

/**
 * Clear all sync state fields (for logout).
 * Sets all fields to NULL while keeping the row.
 */
export async function clearSyncState(
  db: SQLiteDatabase
): Promise<void> {
  await db.runAsync(
    `UPDATE sync_state SET
       email = NULL,
       server_token = NULL,
       notion_access_token = NULL,
       notion_workspace_id = NULL,
       notion_database_id = NULL,
       last_sync_at = NULL
     WHERE id = 1`
  );
}
