import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useDatabase } from "../../lib/db/provider";
import { getSyncState } from "../../lib/db/sync-state";
import { syncRecipesFromNotion } from "../../lib/sync/notion";
import { Colors } from "../../constants/colors";

interface NotionSyncFormProps {
  onSynced?: (count: number) => void;
}

export default function NotionSyncForm({ onSynced }: NotionSyncFormProps) {
  const db = useDatabase();
  const [connected, setConnected] = useState<boolean | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    checkConnection();
  }, []);

  async function checkConnection() {
    try {
      const state = await getSyncState(db);
      setConnected(Boolean(state?.notionAccessToken));
    } catch {
      setConnected(false);
    }
  }

  async function handleSync() {
    if (syncing) return;
    setSyncing(true);
    setResult(null);

    try {
      const count = await syncRecipesFromNotion(db);
      const msg = `Imported ${count} recipe${count !== 1 ? "s" : ""} from Notion.`;
      setResult(msg);
      onSynced?.(count);
    } catch (error: any) {
      setResult(error.message || "Failed to sync from Notion.");
    } finally {
      setSyncing(false);
    }
  }

  // Still loading connection status
  if (connected === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // Not connected
  if (!connected) {
    return (
      <View style={styles.container}>
        <Text style={styles.icon}>N</Text>
        <Text style={styles.title}>Notion Not Connected</Text>
        <Text style={styles.subtitle}>
          Connect your Notion workspace in Settings to import recipes.
        </Text>
      </View>
    );
  }

  // Connected
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>N</Text>
      <Text style={styles.title}>Notion Connected</Text>
      <Text style={styles.subtitle}>
        Sync your recipes from Notion into MealPrepLogic.
      </Text>

      <TouchableOpacity
        style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
        onPress={handleSync}
        activeOpacity={0.7}
        disabled={syncing}
      >
        {syncing ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Text style={styles.syncButtonText}>Sync from Notion</Text>
        )}
      </TouchableOpacity>

      {result && <Text style={styles.result}>{result}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  icon: {
    fontSize: 48,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  syncButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 10,
    minWidth: 200,
    alignItems: "center",
  },
  syncButtonDisabled: {
    opacity: 0.6,
  },
  syncButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  result: {
    marginTop: 16,
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
  },
});
