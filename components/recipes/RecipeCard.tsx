import React from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { BookOpen } from "lucide-react-native";
import type { Recipe } from "../../lib/types";
import { Colors, CategoryColors } from "../../constants/colors";

interface RecipeCardProps {
  recipe: Recipe;
  onPress: () => void;
}

export default function RecipeCard({ recipe, onPress }: RecipeCardProps) {
  const cat = CategoryColors[recipe.category] ?? {
    main: Colors.primary,
    bg: Colors.primaryLight,
    text: Colors.primaryHover,
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {recipe.imageUrl ? (
        <Image source={{ uri: recipe.imageUrl }} style={styles.image} />
      ) : (
        <View style={[styles.imagePlaceholder, { backgroundColor: cat.bg }]}>
          <BookOpen size={28} color={cat.main} strokeWidth={1.5} />
        </View>
      )}

      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {recipe.name}
        </Text>

        <View style={styles.row}>
          <View style={[styles.badge, { backgroundColor: cat.bg }]}>
            <Text style={[styles.badgeText, { color: cat.text }]}>
              {recipe.category.charAt(0).toUpperCase() + recipe.category.slice(1)}
            </Text>
          </View>
          <Text style={styles.calories}>
            <Text style={styles.caloriesValue}>{recipe.calories}</Text> kcal
          </Text>
        </View>

        {/* Macro bar visual */}
        <View style={styles.macroBarContainer}>
          <MacroBar
            protein={recipe.protein}
            fat={recipe.fat}
            carbs={recipe.carbs}
          />
          <View style={styles.macroLegend}>
            <Text style={[styles.macroText, { color: "#60a5fa" }]}>
              P {recipe.protein}g
            </Text>
            <Text style={[styles.macroText, { color: "#fbbf24" }]}>
              F {recipe.fat}g
            </Text>
            <Text style={[styles.macroText, { color: "#2dd4bf" }]}>
              C {recipe.carbs}g
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function MacroBar({
  protein,
  fat,
  carbs,
}: {
  protein: number;
  fat: number;
  carbs: number;
}) {
  const total = protein + fat + carbs;
  if (total === 0) return null;

  const pPct = (protein / total) * 100;
  const fPct = (fat / total) * 100;
  const cPct = (carbs / total) * 100;

  return (
    <View style={styles.macroBar}>
      <View
        style={[styles.macroSegment, { width: `${pPct}%`, backgroundColor: "#60a5fa" }]}
      />
      <View
        style={[styles.macroSegment, { width: `${fPct}%`, backgroundColor: "#fbbf24" }]}
      />
      <View
        style={[
          styles.macroSegment,
          { width: `${cPct}%`, backgroundColor: "#2dd4bf", borderTopRightRadius: 3, borderBottomRightRadius: 3 },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    marginBottom: 12,
    marginHorizontal: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border + "99",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  imagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
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
    marginBottom: 6,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  calories: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  caloriesValue: {
    color: Colors.primary,
    fontWeight: "700",
  },
  macroBarContainer: {
    gap: 4,
  },
  macroBar: {
    flexDirection: "row",
    height: 5,
    borderRadius: 3,
    backgroundColor: "#f3f4f6",
    overflow: "hidden",
  },
  macroSegment: {
    height: 5,
  },
  macroLegend: {
    flexDirection: "row",
    gap: 10,
  },
  macroText: {
    fontSize: 11,
    fontWeight: "600",
  },
});
