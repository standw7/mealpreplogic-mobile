import React from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { UtensilsCrossed, Edit2, Trash2 } from "lucide-react-native";
import type { Recipe, RecipeCategory } from "../../lib/types";
import { Colors } from "../../constants/colors";

interface RecipeDetailProps {
  recipe: Recipe;
  onEdit: () => void;
  onDelete: () => void;
}

const CATEGORY_COLORS: Record<RecipeCategory, string> = {
  breakfast: "#f59e0b",
  lunch: "#10b981",
  dinner: "#ef4444",
  snack: "#8b5cf6",
  dessert: "#ec4899",
};

export default function RecipeDetail({
  recipe,
  onEdit,
  onDelete,
}: RecipeDetailProps) {
  const categoryColor = CATEGORY_COLORS[recipe.category] ?? Colors.primary;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hero image or placeholder */}
      {recipe.imageUrl ? (
        <Image
          source={{ uri: recipe.imageUrl }}
          style={styles.heroImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.heroPlaceholder, { backgroundColor: categoryColor + "20" }]}>
          <UtensilsCrossed size={64} color={categoryColor} />
        </View>
      )}

      {/* Recipe name */}
      <Text style={styles.recipeName}>{recipe.name}</Text>

      {/* Category and source badges */}
      <View style={styles.badgeRow}>
        <View style={[styles.badge, { backgroundColor: categoryColor + "20" }]}>
          <Text style={[styles.badgeText, { color: categoryColor }]}>
            {recipe.category}
          </Text>
        </View>
        <View style={styles.sourceBadge}>
          <Text style={styles.sourceBadgeText}>{recipe.source}</Text>
        </View>
      </View>

      {/* Macro bar */}
      <View style={styles.macroBar}>
        <MacroItem label="Calories" value={recipe.calories} unit="kcal" />
        <MacroItem label="Protein" value={recipe.protein} unit="g" />
        <MacroItem label="Fat" value={recipe.fat} unit="g" />
        <MacroItem label="Carbs" value={recipe.carbs} unit="g" />
        <MacroItem label="Fiber" value={recipe.fiber ?? 0} unit="g" />
      </View>

      {/* Ingredients section */}
      {recipe.ingredients && recipe.ingredients.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Ingredients</Text>
          {recipe.ingredients.map((ingredient, index) => (
            <View key={index} style={styles.ingredientRow}>
              <Text style={styles.bullet}>{"\u2022"}</Text>
              <Text style={styles.ingredientText}>{ingredient}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Instructions section */}
      {recipe.instructions ? (
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Instructions</Text>
          <Text style={styles.instructionsText}>{recipe.instructions}</Text>
        </View>
      ) : null}

      {/* Action buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={onEdit}
        >
          <Edit2 size={18} color={Colors.primary} />
          <Text style={[styles.actionButtonText, { color: Colors.primary }]}>
            Edit
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={onDelete}
        >
          <Trash2 size={18} color={Colors.error} />
          <Text style={[styles.actionButtonText, { color: Colors.error }]}>
            Delete
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function MacroItem({
  label,
  value,
  unit,
}: {
  label: string;
  value: number;
  unit: string;
}) {
  return (
    <View style={styles.macroItem}>
      <Text style={styles.macroValue}>
        {Math.round(value)}
        <Text style={styles.macroUnit}>{unit}</Text>
      </Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingBottom: 40,
  },
  heroImage: {
    width: "100%",
    height: 250,
  },
  heroPlaceholder: {
    width: "100%",
    height: 250,
    justifyContent: "center",
    alignItems: "center",
  },
  recipeName: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.text,
    marginHorizontal: 16,
    marginTop: 16,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 10,
    gap: 8,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  sourceBadge: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  sourceBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  macroBar: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  macroItem: {
    flex: 1,
    alignItems: "center",
  },
  macroValue: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
  },
  macroUnit: {
    fontSize: 11,
    fontWeight: "400",
    color: Colors.textSecondary,
  },
  macroLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  section: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 8,
  },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  bullet: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginRight: 8,
    lineHeight: 22,
  },
  ingredientText: {
    fontSize: 15,
    color: Colors.text,
    flex: 1,
    lineHeight: 22,
  },
  instructionsText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 24,
  },
  actionRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 28,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 6,
  },
  editButton: {
    borderColor: Colors.primary,
  },
  deleteButton: {
    borderColor: Colors.error,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
