import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Alert,
  StyleSheet,
  Linking,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { File as ExpoFile, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import {
  User,
  RefreshCw,
  Database,
  Info,
  LogOut,
  Link,
} from "lucide-react-native";

import { useDatabase } from "../../lib/db/provider";
import { getSyncState, clearSyncState } from "../../lib/db/sync-state";
import { getAllRecipes, getRecipeCount } from "../../lib/db/recipes";
import type { SyncState, SyncConflict } from "../../lib/types";
import { Colors } from "../../constants/colors";
import SettingsRow from "../../components/common/SettingsRow";
import SyncConflictModal from "../../components/common/SyncConflictModal";
import OfflineBanner from "../../components/common/OfflineBanner";
import { useIsOnline } from "../../lib/utils/network";
import { performSync, resolveConflicts } from "../../lib/sync/sync";
import {
  connectNotion,
  disconnectNotion,
  getNotionDatabases,
  selectNotionDatabase,
} from "../../lib/sync/notion";

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title.toUpperCase()}</Text>;
}

export default function SettingsScreen() {
  const db = useDatabase();
  const router = useRouter();
  const isOnline = useIsOnline();

  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const [recipeCount, setRecipeCount] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [connectingNotion, setConnectingNotion] = useState(false);
  const [notionDatabases, setNotionDatabases] = useState<Array<{ id: string; title: string }>>([]);
  const [loadingDatabases, setLoadingDatabases] = useState(false);

  const isLoggedIn = Boolean(syncState?.email);

  const loadData = useCallback(async () => {
    try {
      const [state, count] = await Promise.all([
        getSyncState(db),
        getRecipeCount(db),
      ]);
      setSyncState(state);
      setRecipeCount(count);
    } catch (error) {
      console.error("Failed to load settings data:", error);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleSignOut = useCallback(async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await clearSyncState(db);
            setSyncState(null);
          } catch (error) {
            console.error("Failed to sign out:", error);
          }
        },
      },
    ]);
  }, [db]);

  const handleSyncNow = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);

    try {
      const result = await performSync(db);

      if (result.error) {
        Alert.alert("Sync Error", result.error);
      } else if (result.conflicts.length > 0) {
        setConflicts(result.conflicts);
        Alert.alert(
          "Sync Completed with Conflicts",
          `Pulled ${result.pulled} recipe${result.pulled !== 1 ? "s" : ""}, ` +
            `pushed ${result.pushed} recipe${result.pushed !== 1 ? "s" : ""}.\n\n` +
            `${result.conflicts.length} conflict${result.conflicts.length !== 1 ? "s" : ""} ` +
            `need${result.conflicts.length === 1 ? "s" : ""} to be resolved.`,
          [{ text: "Resolve Now", onPress: () => {} }]
        );
      } else {
        Alert.alert(
          "Sync Complete",
          `Pulled ${result.pulled} recipe${result.pulled !== 1 ? "s" : ""}, ` +
            `pushed ${result.pushed} recipe${result.pushed !== 1 ? "s" : ""}.`
        );
      }

      // Refresh data after sync
      await loadData();
    } catch (error: any) {
      Alert.alert("Sync Error", error.message || "An unexpected error occurred.");
    } finally {
      setSyncing(false);
    }
  }, [db, syncing, loadData]);

  const handleResolveConflicts = useCallback(
    async (resolutions: Array<{ type: string; id: string; keep: "local" | "server" }>) => {
      if (!syncState?.serverToken) return;

      try {
        const mapped = resolutions.map((r) => {
          const conflict = conflicts.find(
            (c) => (c.localVersion as any).id === r.id
          );
          return { conflict: conflict!, keep: r.keep };
        });

        await resolveConflicts(db, syncState.serverToken, mapped);
        setConflicts([]);
        Alert.alert("Conflicts Resolved", "All conflicts have been resolved.");
        await loadData();
      } catch (error: any) {
        Alert.alert("Error", error.message || "Failed to resolve conflicts.");
      }
    },
    [db, syncState, conflicts, loadData]
  );

  const handleLoadDatabases = useCallback(async () => {
    if (!syncState?.serverToken) return;
    setLoadingDatabases(true);
    try {
      const dbs = await getNotionDatabases(syncState.serverToken);
      setNotionDatabases(dbs);
    } catch (error) {
      console.error("Failed to load Notion databases:", error);
    } finally {
      setLoadingDatabases(false);
    }
  }, [syncState?.serverToken]);

  const handleConnectNotion = useCallback(async () => {
    if (!isLoggedIn) {
      Alert.alert("Sign In Required", "Please sign in before connecting Notion.");
      return;
    }
    if (connectingNotion) return;
    setConnectingNotion(true);

    try {
      const success = await connectNotion(db);
      if (success) {
        Alert.alert("Success", "Notion workspace connected.");
        await loadData();
        // Load databases for selection
        await handleLoadDatabases();
      } else {
        Alert.alert("Cancelled", "Notion connection was cancelled.");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to connect Notion.");
    } finally {
      setConnectingNotion(false);
    }
  }, [db, isLoggedIn, connectingNotion, loadData, handleLoadDatabases]);

  const handleDisconnectNotion = useCallback(async () => {
    Alert.alert(
      "Disconnect Notion",
      "Are you sure you want to disconnect your Notion workspace?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: async () => {
            try {
              await disconnectNotion(db);
              setNotionDatabases([]);
              await loadData();
            } catch (error) {
              console.error("Failed to disconnect Notion:", error);
            }
          },
        },
      ]
    );
  }, [db, loadData]);

  const handleSelectDatabase = useCallback(
    async (databaseId: string) => {
      try {
        await selectNotionDatabase(db, databaseId);
        setNotionDatabases([]);
        await loadData();
        Alert.alert("Success", "Notion database selected.");
      } catch (error: any) {
        Alert.alert("Error", error.message || "Failed to select database.");
      }
    },
    [db, loadData]
  );

  const handleExportRecipes = useCallback(async () => {
    if (exporting) return;
    setExporting(true);

    try {
      const recipes = await getAllRecipes(db);

      if (recipes.length === 0) {
        Alert.alert("Export", "No recipes to export.");
        setExporting(false);
        return;
      }

      const json = JSON.stringify(recipes, null, 2);
      const file = new ExpoFile(Paths.cache, "mealpreplogic-recipes.json");
      if (file.exists) {
        file.delete();
      }
      file.create();
      file.write(json);

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(file.uri, {
          mimeType: "application/json",
          dialogTitle: "Export Recipes",
          UTI: "public.json",
        });
      } else {
        Alert.alert("Export", "Sharing is not available on this device.");
      }
    } catch (error) {
      console.error("Failed to export recipes:", error);
      Alert.alert("Export Error", "Failed to export recipes. Please try again.");
    } finally {
      setExporting(false);
    }
  }, [db, exporting]);

  const handleImportRecipes = useCallback(() => {
    // Placeholder for future import functionality
    Alert.alert("Import", "Recipe import will be available in a future update.");
  }, []);

  const formatLastSync = (date: string | null): string => {
    if (!date) return "Never synced";
    try {
      const d = new Date(date);
      return `Last synced: ${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    } catch {
      return "Never synced";
    }
  };

  const notionConnected = Boolean(syncState?.notionAccessToken);

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <OfflineBanner />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Account Section */}
        <SectionHeader title="Account" />
        <View style={styles.section}>
          {!isLoggedIn ? (
            <SettingsRow
              label="Sign In"
              icon={<User size={20} color={Colors.primary} />}
              onPress={() => router.push("/(auth)/login")}
            />
          ) : (
            <>
              <SettingsRow
                label="Email"
                value={syncState?.email ?? ""}
                icon={<User size={20} color={Colors.primary} />}
              />
              <SettingsRow
                label="Sign Out"
                icon={<LogOut size={20} color={Colors.error} />}
                onPress={handleSignOut}
              />
            </>
          )}
        </View>

        {/* Sync Section */}
        <SectionHeader title="Sync" />
        <View style={styles.section}>
          <SettingsRow
            label={formatLastSync(syncState?.lastSyncAt ?? null)}
            icon={<RefreshCw size={20} color={Colors.textSecondary} />}
          />
          <SettingsRow
            label={syncing ? "Syncing..." : "Sync Now"}
            value={
              !isOnline
                ? "Offline"
                : !isLoggedIn
                  ? "Sign in to enable sync"
                  : undefined
            }
            icon={
              syncing ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <RefreshCw size={20} color={Colors.primary} />
              )
            }
            onPress={isLoggedIn && !syncing && isOnline ? handleSyncNow : undefined}
            disabled={!isLoggedIn || syncing || !isOnline}
          />
        </View>

        {/* Notion Section */}
        <SectionHeader title="Notion" />
        <View style={styles.section}>
          {notionConnected ? (
            <>
              <SettingsRow
                label="Notion Connected"
                value={syncState?.notionWorkspaceId ?? "Workspace"}
                icon={<Link size={20} color={Colors.success} />}
              />
              {syncState?.notionDatabaseId ? (
                <SettingsRow
                  label="Database Selected"
                  value={syncState.notionDatabaseId.slice(0, 8) + "..."}
                  icon={<Database size={20} color={Colors.success} />}
                  onPress={handleLoadDatabases}
                />
              ) : (
                <SettingsRow
                  label={loadingDatabases ? "Loading databases..." : "Select Database"}
                  icon={
                    loadingDatabases ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                      <Database size={20} color={Colors.warning} />
                    )
                  }
                  onPress={!loadingDatabases ? handleLoadDatabases : undefined}
                  disabled={loadingDatabases}
                />
              )}
              {notionDatabases.length > 0 &&
                notionDatabases.map((dbItem) => (
                  <SettingsRow
                    key={dbItem.id}
                    label={dbItem.title || "Untitled"}
                    value={dbItem.id === syncState?.notionDatabaseId ? "Selected" : undefined}
                    icon={<Database size={20} color={Colors.textSecondary} />}
                    onPress={() => handleSelectDatabase(dbItem.id)}
                  />
                ))}
              <SettingsRow
                label="Disconnect Notion"
                icon={<Link size={20} color={Colors.error} />}
                onPress={handleDisconnectNotion}
              />
            </>
          ) : (
            <SettingsRow
              label={connectingNotion ? "Connecting..." : "Connect Notion"}
              value={
                !isOnline
                  ? "Offline"
                  : !isLoggedIn
                    ? "Sign in first"
                    : undefined
              }
              icon={
                connectingNotion ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <Link size={20} color={Colors.primary} />
                )
              }
              onPress={isOnline && isLoggedIn && !connectingNotion ? handleConnectNotion : undefined}
              disabled={!isOnline || !isLoggedIn || connectingNotion}
            />
          )}
        </View>

        {/* Data Section */}
        <SectionHeader title="Data" />
        <View style={styles.section}>
          <SettingsRow
            label="Recipes"
            value={`${recipeCount}`}
            icon={<Database size={20} color={Colors.textSecondary} />}
          />
          <SettingsRow
            label={exporting ? "Exporting..." : "Export Recipes (JSON)"}
            icon={<Database size={20} color={Colors.primary} />}
            onPress={handleExportRecipes}
            disabled={exporting}
          />
          <SettingsRow
            label="Import Recipes (JSON)"
            icon={<Database size={20} color={Colors.primary} />}
            onPress={handleImportRecipes}
          />
        </View>

        {/* About Section */}
        <SectionHeader title="About" />
        <View style={styles.section}>
          <SettingsRow
            label="Version"
            value="1.0.0"
            icon={<Info size={20} color={Colors.textSecondary} />}
          />
          <SettingsRow
            label="MealPrepLogic"
            icon={<Info size={20} color={Colors.primary} />}
            onPress={() => Linking.openURL("https://mealpreplogic.com")}
          />
        </View>

        <View style={styles.footer} />
      </ScrollView>

      <SyncConflictModal
        conflicts={conflicts}
        visible={conflicts.length > 0}
        onResolve={handleResolveConflicts}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f2f2f7",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
    letterSpacing: 0.5,
  },
  section: {
    backgroundColor: Colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  footer: {
    height: 40,
  },
});
