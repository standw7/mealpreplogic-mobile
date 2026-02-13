import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useDatabase } from "../../../lib/db/provider";
import { getRecipeById, deleteRecipe } from "../../../lib/db/recipes";
import RecipeDetail from "../../../components/recipes/RecipeDetail";
import type { Recipe } from "../../../lib/types";
import { Colors } from "../../../constants/colors";

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDatabase();
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!id) return;
      const result = await getRecipeById(db, id);
      setRecipe(result);
      setLoading(false);
    }
    load();
  }, [db, id]);

  function handleEdit() {
    if (!recipe) return;
    router.push(`/(stack)/recipe/edit/${recipe.id}`);
  }

  function handleDelete() {
    if (!recipe) return;
    Alert.alert(
      "Delete Recipe",
      `Are you sure you want to delete "${recipe.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteRecipe(db, recipe.id);
            router.back();
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!recipe) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <RecipeDetail recipe={recipe} onEdit={handleEdit} onDelete={handleDelete} />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },
});
