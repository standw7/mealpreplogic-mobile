import React, { createContext, useContext, useEffect, useState } from "react";
import * as SQLite from "expo-sqlite";
import { runMigrations } from "./migrations";

interface DatabaseContextValue {
  db: SQLite.SQLiteDatabase | null;
  isReady: boolean;
}

const DatabaseContext = createContext<DatabaseContextValue>({
  db: null,
  isReady: false,
});

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function init() {
      const database = await SQLite.openDatabaseAsync("mealpreplogic.db");
      await database.execAsync("PRAGMA journal_mode = WAL");
      await database.execAsync("PRAGMA foreign_keys = ON");
      await runMigrations(database);

      if (mounted) {
        setDb(database);
        setIsReady(true);
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, []);

  if (!isReady) {
    return null; // Or a loading spinner
  }

  return (
    <DatabaseContext.Provider value={{ db, isReady }}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase(): SQLite.SQLiteDatabase {
  const { db } = useContext(DatabaseContext);
  if (!db) {
    throw new Error("useDatabase must be used within a DatabaseProvider");
  }
  return db;
}
