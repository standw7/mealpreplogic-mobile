import React, { useState, useCallback } from "react";
import {
  View,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useFocusEffect } from "expo-router";
import { Plus, UtensilsCrossed } from "lucide-react-native";

import { useDatabase } from "../../lib/db/provider";
import { getAllRecipes } from "../../lib/db/recipes";
import type { Recipe, RecipeCategory } from "../../lib/types";
import { Colors } from "../../constants/colors";

import CategoryTabs from "../../components/recipes/CategoryTabs";
import RecipeCard from "../../components/recipes/RecipeCard";

export default function RecipesScreen() {
  const db = useDatabase();
  const router = useRouter();

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadRecipes = useCallback(async () => {
    try {
      const filters =
        selectedCategory !== "all"
          ? { category: selectedCategory as RecipeCategory }
          : undefined;
      const data = await getAllRecipes(db, filters);
      setRecipes(data);
    } catch (error) {
      console.error("Failed to load recipes:", error);
    } finally {
      setLoading(false);
    }
  }, [db, selectedCategory]);

  // Reload recipes when screen gains focus (e.g. after adding/editing)
  useFocusEffect(
    useCallback(() => {
      loadRecipes();
    }, [loadRecipes])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRecipes();
    setRefreshing(false);
  }, [loadRecipes]);

  const handleCategorySelect = useCallback((category: string) => {
    setSelectedCategory(category);
  }, []);

  const renderRecipe = useCallback(
    ({ item }: { item: Recipe }) => (
      <RecipeCard
        recipe={item}
        onPress={() => router.push(`/(stack)/recipe/${item.id}`)}
      />
    ),
    [router]
  );

  const keyExtractor = useCallback((item: Recipe) => item.id, []);

  const renderEmpty = useCallback(() => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <UtensilsCrossed size={64} color={Colors.border} strokeWidth={1.5} />
        <Text style={styles.emptyTitle}>No recipes yet</Text>
        <Text style={styles.emptySubtitle}>
          Tap + to add your first recipe
        </Text>
      </View>
    );
  }, [loading]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <CategoryTabs
        selected={selectedCategory}
        onSelect={handleCategorySelect}
      />

      <FlatList
        data={recipes}
        renderItem={renderRecipe}
        keyExtractor={keyExtractor}
        contentContainerStyle={
          recipes.length === 0 ? styles.listEmpty : styles.listContent
        }
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/(stack)/add-recipe")}
        activeOpacity={0.85}
      >
        <Plus size={28} color="#ffffff" strokeWidth={2.5} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    paddingTop: 4,
    paddingBottom: 100,
  },
  listEmpty: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
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
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
});
