import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import * as Sharing from "expo-sharing";
import {
  ShoppingCart,
  Copy,
  Share2,
  CalendarDays,
} from "lucide-react-native";

import { useDatabase } from "../../lib/db/provider";
import { getSelectedMealPlan } from "../../lib/db/meal-plans";
import { getRecipesByIds } from "../../lib/db/recipes";
import {
  getCurrentShoppingList,
  insertShoppingList,
  updateShoppingListItems,
} from "../../lib/db/shopping-lists";
import {
  generateShoppingList,
  generateClipboardText,
} from "../../lib/utils/shopping";
import type { ShoppingItem, MealPlan, Recipe } from "../../lib/types";
import { Colors } from "../../constants/colors";
import CategorySection from "../../components/shopping/CategorySection";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract all unique recipe IDs referenced in a MealPlan's day plans.
 */
function extractRecipeIds(plan: MealPlan): string[] {
  const ids = new Set<string>();
  for (const day of plan.days) {
    for (const meal of day.meals) {
      if (meal.recipe?.id) {
        ids.add(meal.recipe.id);
      }
    }
  }
  return Array.from(ids);
}

/**
 * Convert a MealPlan into the planData shape expected by generateShoppingList:
 * { "Day 1": { "breakfast": "recipe-id", ... }, ... }
 */
function planToPlanData(
  plan: MealPlan
): Record<string, Record<string, string | null>> {
  const planData: Record<string, Record<string, string | null>> = {};
  for (const day of plan.days) {
    const slots: Record<string, string | null> = {};
    for (const meal of day.meals) {
      slots[meal.slot] = meal.recipe?.id ?? null;
    }
    planData[day.day] = slots;
  }
  return planData;
}

/**
 * Group a flat items array by category string.
 */
function groupByCategory(
  items: ShoppingItem[]
): Record<string, ShoppingItem[]> {
  const groups: Record<string, ShoppingItem[]> = {};
  for (const item of items) {
    const cat = item.category || "other";
    if (!groups[cat]) {
      groups[cat] = [];
    }
    groups[cat].push(item);
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function ShoppingScreen() {
  const db = useDatabase();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [shoppingListId, setShoppingListId] = useState<string | null>(null);

  // Use a ref to avoid stale closure when persisting
  const itemsRef = useRef<ShoppingItem[]>([]);
  const listIdRef = useRef<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Check for selected meal plan
      const selectedPlan = await getSelectedMealPlan(db);
      setPlan(selectedPlan);

      if (!selectedPlan) {
        setItems([]);
        setShoppingListId(null);
        return;
      }

      // 2. Check for existing shopping list for this plan
      const existingList = await getCurrentShoppingList(db);

      if (existingList && existingList.planId === selectedPlan.id) {
        // Existing list matches current plan -- reuse it
        setItems(existingList.items);
        setShoppingListId(existingList.id);
        itemsRef.current = existingList.items;
        listIdRef.current = existingList.id;
        return;
      }

      // 3. Generate a new shopping list
      const recipeIds = extractRecipeIds(selectedPlan);
      const recipes = await getRecipesByIds(db, recipeIds);

      // Build a map of id -> recipe
      const recipesById: Record<string, Recipe> = {};
      for (const r of recipes) {
        recipesById[r.id] = r;
      }

      const planData = planToPlanData(selectedPlan);
      const rawItems = generateShoppingList(planData, recipesById);

      // Convert ShoppingItemData[] to ShoppingItem[] (add id + checked)
      let index = 0;
      const shoppingItems: ShoppingItem[] = rawItems.map((raw) => ({
        id: String(index++),
        name: raw.name,
        quantity: raw.quantity,
        unit: raw.unit,
        checked: false,
        category: raw.category,
      }));

      // 4. Persist to SQLite
      const newId = await insertShoppingList(
        db,
        selectedPlan.id,
        shoppingItems
      );

      setItems(shoppingItems);
      setShoppingListId(newId);
      itemsRef.current = shoppingItems;
      listIdRef.current = newId;
    } catch (error) {
      console.error("Failed to load shopping data:", error);
    } finally {
      setLoading(false);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // ------ Actions ------

  const handleToggle = useCallback(
    async (itemId: string) => {
      setItems((prev) => {
        const next = prev.map((item) =>
          item.id === itemId ? { ...item, checked: !item.checked } : item
        );
        itemsRef.current = next;

        // Persist in the background
        const lid = listIdRef.current;
        if (lid) {
          updateShoppingListItems(db, lid, next).catch((err) =>
            console.error("Failed to persist toggle:", err)
          );
        }

        return next;
      });
    },
    [db]
  );

  const handleCopy = useCallback(async () => {
    const clipboardItems = items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      unit: i.unit,
      category: i.category || "other",
    }));
    const text = generateClipboardText(clipboardItems);
    await Clipboard.setStringAsync(text);
    Alert.alert("Copied", "Shopping list copied to clipboard.");
  }, [items]);

  const handleShare = useCallback(async () => {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert("Sharing not available", "Sharing is not supported on this device.");
      return;
    }

    // expo-sharing requires a file URI; fall back to clipboard + alert
    const clipboardItems = items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      unit: i.unit,
      category: i.category || "other",
    }));
    const text = generateClipboardText(clipboardItems);
    await Clipboard.setStringAsync(text);
    Alert.alert("Ready to share", "Shopping list copied to clipboard. Paste it in your preferred app.");
  }, [items]);

  // ------ Computed ------

  const checkedCount = items.filter((i) => i.checked).length;
  const totalCount = items.length;
  const grouped = groupByCategory(items);
  const sortedCategories = Object.keys(grouped).sort();

  // ------ Render ------

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!plan) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
        <View style={styles.centered}>
          <ShoppingCart size={64} color={Colors.border} strokeWidth={1.5} />
          <Text style={styles.emptyTitle}>No meal plan selected</Text>
          <Text style={styles.emptySubtitle}>
            Select a meal plan first to generate your shopping list.
          </Text>
          <TouchableOpacity
            style={styles.goButton}
            onPress={() => router.push("/(tabs)/plans")}
            activeOpacity={0.8}
          >
            <CalendarDays size={18} color="#ffffff" />
            <Text style={styles.goButtonText}>Go to Plans</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (totalCount === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
        <View style={styles.centered}>
          <ShoppingCart size={64} color={Colors.border} strokeWidth={1.5} />
          <Text style={styles.emptyTitle}>Shopping list is empty</Text>
          <Text style={styles.emptySubtitle}>
            The selected plan has no ingredients to shop for.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      {/* Header area */}
      <View style={styles.headerSection}>
        <Text style={styles.planLabel} numberOfLines={1}>
          {plan.label}
        </Text>
        <Text style={styles.progress}>
          {checkedCount} of {totalCount} items checked
        </Text>

        {/* Progress bar */}
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              {
                width:
                  totalCount > 0
                    ? `${Math.round((checkedCount / totalCount) * 100)}%`
                    : "0%",
              },
            ]}
          />
        </View>

        {/* Action buttons */}
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleCopy}
            activeOpacity={0.7}
          >
            <Copy size={16} color={Colors.primary} />
            <Text style={styles.actionButtonText}>Copy</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleShare}
            activeOpacity={0.7}
          >
            <Share2 size={16} color={Colors.primary} />
            <Text style={styles.actionButtonText}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* List of category sections */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {sortedCategories.map((category) => (
          <CategorySection
            key={category}
            category={category}
            items={grouped[category]}
            onToggleItem={handleToggle}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingBottom: 80,
  },

  // Empty state
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 6,
    textAlign: "center",
  },
  goButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 24,
    gap: 8,
  },
  goButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },

  // Header
  headerSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  planLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  progress: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  progressBarTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    marginBottom: 10,
  },
  progressBarFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  actionBar: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primary,
  },

  // List
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 40,
  },
});
