import React from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import type { Recipe, RecipeCategory } from "../../lib/types";
import { Colors } from "../../constants/colors";

const CATEGORY_COLORS: Record<RecipeCategory, string> = {
  breakfast: "#f59e0b",
  lunch: "#10b981",
  dinner: "#ef4444",
  snack: "#8b5cf6",
  dessert: "#ec4899",
};

interface RecipeCardProps {
  recipe: Recipe;
  onPress: () => void;
}

export default function RecipeCard({ recipe, onPress }: RecipeCardProps) {
  const badgeColor = CATEGORY_COLORS[recipe.category] ?? Colors.primary;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {recipe.imageUrl ? (
        <Image source={{ uri: recipe.imageUrl }} style={styles.image} />
      ) : (
        <View style={[styles.imagePlaceholder, { backgroundColor: badgeColor + "20" }]}>
          <Text style={[styles.placeholderEmoji]}>
            {recipe.category === "breakfast"
              ? "🥞"
              : recipe.category === "lunch"
              ? "🥗"
              : recipe.category === "dinner"
              ? "🍽"
              : recipe.category === "snack"
              ? "🍎"
              : "🍰"}
          </Text>
        </View>
      )}

      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {recipe.name}
        </Text>

        <View style={styles.row}>
          <View style={[styles.badge, { backgroundColor: badgeColor + "20" }]}>
            <Text style={[styles.badgeText, { color: badgeColor }]}>
              {recipe.category.charAt(0).toUpperCase() + recipe.category.slice(1)}
            </Text>
          </View>
          <Text style={styles.calories}>{recipe.calories} cal</Text>
        </View>

        <Text style={styles.macros}>
          P {recipe.protein}g {"  "}F {recipe.fat}g {"  "}C {recipe.carbs}g
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    marginBottom: 12,
    marginHorizontal: 16,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 10,
  },
  imagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderEmoji: {
    fontSize: 32,
  },
  content: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "center",
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  calories: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  macros: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
