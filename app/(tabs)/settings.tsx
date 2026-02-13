import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Alert,
  StyleSheet,
  Linking,
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
import type { SyncState } from "../../lib/types";
import { Colors } from "../../constants/colors";
import SettingsRow from "../../components/common/SettingsRow";

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title.toUpperCase()}</Text>;
}

export default function SettingsScreen() {
  const db = useDatabase();
  const router = useRouter();

  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const [recipeCount, setRecipeCount] = useState(0);
  const [exporting, setExporting] = useState(false);

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

  const handleSyncNow = useCallback(() => {
    // Placeholder for Task 21 - manual sync
    Alert.alert("Sync", "Sync will be available in a future update.");
  }, []);

  const handleConnectNotion = useCallback(() => {
    // Placeholder for Task 23 - Notion integration
    Alert.alert("Notion", "Notion integration will be available in a future update.");
  }, []);

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
              const { saveSyncState } = await import("../../lib/db/sync-state");
              await saveSyncState(db, {
                notionAccessToken: null,
                notionWorkspaceId: null,
                notionDatabaseId: null,
              });
              await loadData();
            } catch (error) {
              console.error("Failed to disconnect Notion:", error);
            }
          },
        },
      ]
    );
  }, [db, loadData]);

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
            label="Sync Now"
            value={!isLoggedIn ? "Sign in to enable sync" : undefined}
            icon={<RefreshCw size={20} color={Colors.primary} />}
            onPress={isLoggedIn ? handleSyncNow : undefined}
            disabled={!isLoggedIn}
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
              <SettingsRow
                label="Disconnect Notion"
                icon={<Link size={20} color={Colors.error} />}
                onPress={handleDisconnectNotion}
              />
            </>
          ) : (
            <SettingsRow
              label="Connect Notion"
              icon={<Link size={20} color={Colors.primary} />}
              onPress={handleConnectNotion}
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
