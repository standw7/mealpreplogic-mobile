import React from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from "react-native";
import {
  BookOpen,
  Edit2,
  Trash2,
  ExternalLink,
} from "lucide-react-native";
import type { Recipe } from "../../lib/types";
import { Colors, CategoryColors } from "../../constants/colors";

interface RecipeDetailProps {
  recipe: Recipe;
  onEdit: () => void;
  onDelete: () => void;
}

export default function RecipeDetail({
  recipe,
  onEdit,
  onDelete,
}: RecipeDetailProps) {
  const cat = CategoryColors[recipe.category] ?? {
    main: Colors.primary,
    bg: Colors.primaryLight,
    text: Colors.primaryHover,
  };

  const handleOpenInBrowser = () => {
    const url = recipe.sourceUrl;
    if (url) {
      Linking.openURL(url);
    }
  };

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
        <View style={[styles.heroPlaceholder, { backgroundColor: cat.bg }]}>
          <BookOpen size={64} color={cat.main} strokeWidth={1.5} />
        </View>
      )}

      {/* Recipe name */}
      <Text style={styles.recipeName}>{recipe.name}</Text>

      {/* Category and source badges */}
      <View style={styles.badgeRow}>
        <View style={[styles.badge, { backgroundColor: cat.bg }]}>
          <Text style={[styles.badgeText, { color: cat.text }]}>
            {recipe.category.charAt(0).toUpperCase() + recipe.category.slice(1)}
          </Text>
        </View>
        <View style={styles.sourceBadge}>
          <Text style={styles.sourceBadgeText}>{recipe.source}</Text>
        </View>
        {recipe.servings ? (
          <View style={styles.sourceBadge}>
            <Text style={styles.sourceBadgeText}>
              {recipe.servings} serving{recipe.servings !== 1 ? "s" : ""}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Macro summary card */}
      <View style={styles.macroCard}>
        <View style={styles.macroRow}>
          <MacroItem label="Calories" value={recipe.calories} unit="kcal" highlight />
          <MacroItem label="Protein" value={recipe.protein} unit="g" />
          <MacroItem label="Fat" value={recipe.fat} unit="g" />
          <MacroItem label="Carbs" value={recipe.carbs} unit="g" />
          <MacroItem label="Fiber" value={recipe.fiber ?? 0} unit="g" />
        </View>

        {/* Macro bar */}
        <View style={styles.macroBarWrap}>
          <MacroBar
            protein={recipe.protein}
            fat={recipe.fat}
            carbs={recipe.carbs}
          />
          <View style={styles.macroLegend}>
            <LegendDot color="#60a5fa" label="Protein" />
            <LegendDot color="#fbbf24" label="Fat" />
            <LegendDot color="#2dd4bf" label="Carbs" />
          </View>
        </View>
      </View>

      {/* Open in Browser button (for web-imported recipes) */}
      {recipe.sourceUrl ? (
        <TouchableOpacity
          style={styles.browserButton}
          onPress={handleOpenInBrowser}
          activeOpacity={0.7}
        >
          <ExternalLink size={18} color={Colors.primary} />
          <Text style={styles.browserButtonText}>View Original Recipe</Text>
        </TouchableOpacity>
      ) : null}

      {/* Ingredients section */}
      {recipe.ingredients && recipe.ingredients.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Ingredients</Text>
          {recipe.ingredients.map((ingredient, index) => (
            <View key={index} style={styles.ingredientRow}>
              <View style={styles.bulletDot} />
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
          activeOpacity={0.7}
        >
          <Edit2 size={18} color={Colors.primary} />
          <Text style={[styles.actionButtonText, { color: Colors.primary }]}>
            Edit
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={onDelete}
          activeOpacity={0.7}
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
  highlight,
}: {
  label: string;
  value: number;
  unit: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.macroItem}>
      <Text style={[styles.macroValue, highlight && { color: Colors.primary }]}>
        {Math.round(value)}
        <Text style={styles.macroUnit}>{unit}</Text>
      </Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
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

  return (
    <View style={styles.macroBar}>
      <View
        style={[
          styles.macroSegment,
          {
            width: `${(protein / total) * 100}%`,
            backgroundColor: "#60a5fa",
            borderTopLeftRadius: 3,
            borderBottomLeftRadius: 3,
          },
        ]}
      />
      <View
        style={[
          styles.macroSegment,
          { width: `${(fat / total) * 100}%`, backgroundColor: "#fbbf24" },
        ]}
      />
      <View
        style={[
          styles.macroSegment,
          {
            width: `${(carbs / total) * 100}%`,
            backgroundColor: "#2dd4bf",
            borderTopRightRadius: 3,
            borderBottomRightRadius: 3,
          },
        ]}
      />
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
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
    height: 220,
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
    flexWrap: "wrap",
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

  // Macro card
  macroCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: Colors.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border + "99",
    padding: 14,
  },
  macroRow: {
    flexDirection: "row",
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
  macroBarWrap: {
    marginTop: 12,
    gap: 6,
  },
  macroBar: {
    flexDirection: "row",
    height: 6,
    borderRadius: 3,
    backgroundColor: "#f3f4f6",
    overflow: "hidden",
  },
  macroSegment: {
    height: 6,
  },
  macroLegend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "500",
  },

  // View in Browser
  browserButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    gap: 8,
  },
  browserButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.primary,
  },

  // Sections
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
    marginBottom: 6,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginTop: 8,
    marginRight: 10,
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

  // Action buttons
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
    borderRadius: 12,
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
