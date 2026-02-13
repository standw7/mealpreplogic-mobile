import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useDatabase } from "../../lib/db/provider";
import { insertRecipe } from "../../lib/db/recipes";
import type { Recipe } from "../../lib/types";
import { Colors } from "../../constants/colors";

import ManualRecipeForm from "../../components/recipes/ManualRecipeForm";
import UrlImportForm from "../../components/recipes/UrlImportForm";
import BulkUrlImportForm from "../../components/recipes/BulkUrlImportForm";

type Tab = "manual" | "url" | "bulk";

const TABS: { key: Tab; label: string }[] = [
  { key: "manual", label: "Manual" },
  { key: "url", label: "URL" },
  { key: "bulk", label: "Bulk URL" },
];

export default function AddRecipeScreen() {
  const db = useDatabase();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("manual");
  const [saving, setSaving] = useState(false);

  const saveRecipe = useCallback(
    async (recipeData: Partial<Recipe>) => {
      try {
        setSaving(true);
        await insertRecipe(db, {
          ...recipeData,
          source: recipeData.source ?? "manual",
        });
        Alert.alert("Success", "Recipe saved!", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } catch (error: any) {
        console.error("Failed to save recipe:", error);
        Alert.alert("Error", error.message || "Failed to save recipe.");
      } finally {
        setSaving(false);
      }
    },
    [db, router]
  );

  const saveBulkRecipes = useCallback(
    async (recipes: Partial<Recipe>[]) => {
      try {
        setSaving(true);
        let saved = 0;
        for (const recipeData of recipes) {
          await insertRecipe(db, {
            ...recipeData,
            source: recipeData.source ?? "web",
          });
          saved++;
        }
        Alert.alert(
          "Success",
          `${saved} recipe${saved !== 1 ? "s" : ""} saved!`,
          [{ text: "OK", onPress: () => router.back() }]
        );
      } catch (error: any) {
        console.error("Failed to save recipes:", error);
        Alert.alert("Error", error.message || "Failed to save recipes.");
      } finally {
        setSaving(false);
      }
    },
    [db, router]
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      {/* Tab bar */}
      <View style={styles.tabBar}>
        {TABS.map(({ key, label }) => {
          const isActive = activeTab === key;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Tab content */}
      <View style={styles.tabContent}>
        {activeTab === "manual" && (
          <ManualRecipeForm onSave={saveRecipe} saving={saving} />
        )}
        {activeTab === "url" && <UrlImportForm onImported={saveRecipe} />}
        {activeTab === "bulk" && (
          <BulkUrlImportForm onImported={saveBulkRecipes} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: Colors.card,
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: "#ffffff",
  },
  tabContent: {
    flex: 1,
  },
});
