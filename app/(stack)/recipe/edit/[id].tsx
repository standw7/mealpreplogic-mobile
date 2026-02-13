import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useDatabase } from "../../../../lib/db/provider";
import { getRecipeById, updateRecipe } from "../../../../lib/db/recipes";
import ManualRecipeForm from "../../../../components/recipes/ManualRecipeForm";
import type { Recipe } from "../../../../lib/types";
import { Colors } from "../../../../constants/colors";

export default function EditRecipeScreen() {
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

  async function handleSave(updates: Partial<Recipe>) {
    if (!id) return;
    await updateRecipe(db, id, updates);
    router.back();
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
        <Text style={styles.errorText}>Recipe not found.</Text>
      </View>
    );
  }

  return (
    <ManualRecipeForm
      initialValues={recipe}
      onSave={handleSave}
      submitLabel="Update Recipe"
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },
  errorText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
});
