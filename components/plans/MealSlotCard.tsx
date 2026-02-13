import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { RefreshCw } from "lucide-react-native";

import type { MealAssignment } from "../../lib/types";
import { Colors, CategoryColors } from "../../constants/colors";

const SLOT_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
  dessert: "Dessert",
};

interface MealSlotCardProps {
  assignment: MealAssignment;
  onReroll: () => void;
  rerolling: boolean;
}

export default function MealSlotCard({
  assignment,
  onReroll,
  rerolling,
}: MealSlotCardProps) {
  const { slot, recipe } = assignment;
  const cat = CategoryColors[slot] ?? {
    main: Colors.primary,
    bg: Colors.primaryLight,
    text: Colors.primaryHover,
  };

  return (
    <View style={styles.card}>
      {/* Left: Image or placeholder */}
      {recipe.imageUrl ? (
        <Image source={{ uri: recipe.imageUrl }} style={styles.image} />
      ) : (
        <View style={[styles.imagePlaceholder, { backgroundColor: cat.bg }]}>
          <Text style={[styles.slotInitial, { color: cat.main }]}>
            {(SLOT_LABELS[slot] || slot).charAt(0).toUpperCase()}
          </Text>
        </View>
      )}

      {/* Middle: Recipe info */}
      <View style={styles.content}>
        <Text style={styles.slotLabel}>{SLOT_LABELS[slot] || slot}</Text>
        <Text style={styles.recipeName} numberOfLines={1}>
          {recipe.name}
        </Text>
        <Text style={styles.macros}>
          {recipe.calories} cal | P {recipe.protein}g | F {recipe.fat}g | C{" "}
          {recipe.carbs}g
        </Text>
      </View>

      {/* Right: Reroll button */}
      <TouchableOpacity
        style={styles.rerollButton}
        onPress={onReroll}
        disabled={rerolling}
        activeOpacity={0.7}
      >
        {rerolling ? (
          <ActivityIndicator size="small" color={Colors.primary} />
        ) : (
          <RefreshCw size={18} color={Colors.primary} strokeWidth={2} />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  image: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  imagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: Colors.card,
    justifyContent: "center",
    alignItems: "center",
  },
  slotInitial: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  content: {
    flex: 1,
    marginLeft: 10,
  },
  slotLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  recipeName: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 2,
  },
  macros: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  rerollButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
});
