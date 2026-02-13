import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Star } from "lucide-react-native";
import type { Recipe, RecipeCategory } from "../../lib/types";
import { Colors } from "../../constants/colors";

const CATEGORIES: { key: RecipeCategory; label: string }[] = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
  { key: "snack", label: "Snack" },
  { key: "dessert", label: "Dessert" },
];

interface ManualRecipeFormProps {
  initialValues?: Partial<Recipe>;
  onSave: (recipe: Partial<Recipe>) => void;
  submitLabel?: string;
  saving?: boolean;
}

export default function ManualRecipeForm({
  initialValues,
  onSave,
  submitLabel = "Save Recipe",
  saving = false,
}: ManualRecipeFormProps) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [category, setCategory] = useState<RecipeCategory>(
    initialValues?.category ?? "dinner"
  );
  const [calories, setCalories] = useState(
    initialValues?.calories?.toString() ?? ""
  );
  const [protein, setProtein] = useState(
    initialValues?.protein?.toString() ?? ""
  );
  const [fat, setFat] = useState(initialValues?.fat?.toString() ?? "");
  const [carbs, setCarbs] = useState(initialValues?.carbs?.toString() ?? "");
  const [fiber, setFiber] = useState(initialValues?.fiber?.toString() ?? "");
  const [servings, setServings] = useState(
    initialValues?.servings?.toString() ?? "1"
  );
  const [ingredients, setIngredients] = useState(
    initialValues?.ingredients?.join("\n") ?? ""
  );
  const [instructions, setInstructions] = useState(
    initialValues?.instructions ?? ""
  );
  const [imageUrl, setImageUrl] = useState(initialValues?.imageUrl ?? "");
  const [rating, setRating] = useState<number | undefined>(
    initialValues?.rating
  );

  // Sync when initialValues changes (e.g. after URL import populates the form)
  useEffect(() => {
    if (initialValues) {
      if (initialValues.name !== undefined) setName(initialValues.name);
      if (initialValues.category !== undefined)
        setCategory(initialValues.category);
      if (initialValues.calories !== undefined)
        setCalories(initialValues.calories.toString());
      if (initialValues.protein !== undefined)
        setProtein(initialValues.protein.toString());
      if (initialValues.fat !== undefined)
        setFat(initialValues.fat.toString());
      if (initialValues.carbs !== undefined)
        setCarbs(initialValues.carbs.toString());
      if (initialValues.fiber !== undefined)
        setFiber(initialValues.fiber.toString());
      if (initialValues.servings !== undefined)
        setServings(initialValues.servings.toString());
      if (initialValues.ingredients !== undefined)
        setIngredients(initialValues.ingredients.join("\n"));
      if (initialValues.instructions !== undefined)
        setInstructions(initialValues.instructions ?? "");
      if (initialValues.imageUrl !== undefined)
        setImageUrl(initialValues.imageUrl ?? "");
      if (initialValues.rating !== undefined) setRating(initialValues.rating);
    }
  }, [initialValues]);

  const handleSave = () => {
    if (!name.trim()) return;

    const ingredientsList = ingredients
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    onSave({
      ...initialValues,
      name: name.trim(),
      category,
      calories: parseFloat(calories) || 0,
      protein: parseFloat(protein) || 0,
      fat: parseFloat(fat) || 0,
      carbs: parseFloat(carbs) || 0,
      fiber: parseFloat(fiber) || 0,
      servings: parseInt(servings, 10) || 1,
      ingredients: ingredientsList,
      instructions: instructions.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
      rating,
      source: initialValues?.source ?? "manual",
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.flex}
      keyboardVerticalOffset={100}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Name */}
        <Text style={styles.label}>
          Name <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Recipe name"
          placeholderTextColor={Colors.textSecondary}
        />

        {/* Category */}
        <Text style={styles.label}>Category</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
        >
          {CATEGORIES.map(({ key, label }) => {
            const isActive = category === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.categoryTab, isActive && styles.categoryTabActive]}
                onPress={() => setCategory(key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.categoryTabText,
                    isActive && styles.categoryTabTextActive,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Macros row 1: Calories, Servings */}
        <View style={styles.row}>
          <View style={styles.rowItem}>
            <Text style={styles.label}>Calories</Text>
            <TextInput
              style={styles.input}
              value={calories}
              onChangeText={setCalories}
              placeholder="0"
              placeholderTextColor={Colors.textSecondary}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.rowItem}>
            <Text style={styles.label}>Servings</Text>
            <TextInput
              style={styles.input}
              value={servings}
              onChangeText={setServings}
              placeholder="1"
              placeholderTextColor={Colors.textSecondary}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Macros row 2: Protein, Fat */}
        <View style={styles.row}>
          <View style={styles.rowItem}>
            <Text style={styles.label}>Protein (g)</Text>
            <TextInput
              style={styles.input}
              value={protein}
              onChangeText={setProtein}
              placeholder="0"
              placeholderTextColor={Colors.textSecondary}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.rowItem}>
            <Text style={styles.label}>Fat (g)</Text>
            <TextInput
              style={styles.input}
              value={fat}
              onChangeText={setFat}
              placeholder="0"
              placeholderTextColor={Colors.textSecondary}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Macros row 3: Carbs, Fiber */}
        <View style={styles.row}>
          <View style={styles.rowItem}>
            <Text style={styles.label}>Carbs (g)</Text>
            <TextInput
              style={styles.input}
              value={carbs}
              onChangeText={setCarbs}
              placeholder="0"
              placeholderTextColor={Colors.textSecondary}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.rowItem}>
            <Text style={styles.label}>Fiber (g)</Text>
            <TextInput
              style={styles.input}
              value={fiber}
              onChangeText={setFiber}
              placeholder="0"
              placeholderTextColor={Colors.textSecondary}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Ingredients */}
        <Text style={styles.label}>Ingredients</Text>
        <Text style={styles.hint}>One ingredient per line</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={ingredients}
          onChangeText={setIngredients}
          placeholder={"1 cup flour\n2 eggs\n1/2 cup sugar"}
          placeholderTextColor={Colors.textSecondary}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />

        {/* Instructions */}
        <Text style={styles.label}>Instructions</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={instructions}
          onChangeText={setInstructions}
          placeholder="Preparation steps..."
          placeholderTextColor={Colors.textSecondary}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />

        {/* Image URL */}
        <Text style={styles.label}>Image URL</Text>
        <TextInput
          style={styles.input}
          value={imageUrl}
          onChangeText={setImageUrl}
          placeholder="https://example.com/image.jpg"
          placeholderTextColor={Colors.textSecondary}
          autoCapitalize="none"
          keyboardType="url"
        />

        {/* Rating */}
        <Text style={styles.label}>Rating</Text>
        <View style={styles.ratingRow}>
          {[1, 2, 3, 4, 5].map((star) => {
            const filled = rating !== undefined && star <= rating;
            return (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(star === rating ? undefined : star)}
                activeOpacity={0.6}
                style={styles.starButton}
              >
                <Star
                  size={28}
                  color={filled ? "#f59e0b" : Colors.border}
                  fill={filled ? "#f59e0b" : "transparent"}
                />
              </TouchableOpacity>
            );
          })}
          {rating !== undefined && (
            <TouchableOpacity onPress={() => setRating(undefined)}>
              <Text style={styles.clearRating}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={[
            styles.saveButton,
            (!name.trim() || saving) && styles.saveButtonDisabled,
          ]}
          onPress={handleSave}
          disabled={!name.trim() || saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>{submitLabel}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    marginTop: 16,
    marginBottom: 6,
  },
  required: {
    color: Colors.error,
  },
  hint: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
    marginTop: -2,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: "#ffffff",
  },
  multiline: {
    minHeight: 100,
    paddingTop: 12,
  },
  categoryRow: {
    gap: 8,
    paddingVertical: 2,
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
  },
  categoryTabActive: {
    backgroundColor: Colors.primary,
  },
  categoryTabText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  categoryTabTextActive: {
    color: "#ffffff",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  rowItem: {
    flex: 1,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  starButton: {
    padding: 4,
  },
  clearRating: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginLeft: 12,
    textDecorationLine: "underline",
  },
  saveButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 28,
    minHeight: 52,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
});
