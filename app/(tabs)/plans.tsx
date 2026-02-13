import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { v4 as uuid } from "uuid";

import { useDatabase } from "../../lib/db/provider";
import { getAllRecipes } from "../../lib/db/recipes";
import { insertMealPlan, selectMealPlan } from "../../lib/db/meal-plans";
import { insertShoppingList } from "../../lib/db/shopping-lists";
import { generateShoppingList } from "../../lib/utils/shopping";
import { MealPlanSolver } from "../../lib/solver/solver";
import { rerollMeal } from "../../lib/solver/reroll";
import type { RecipeInput, SolvedPlan } from "../../lib/solver/types";
import type {
  Recipe,
  MacroTargets,
  MealPlan,
  DayPlan,
  MealAssignment,
  MealSlot,
  MacroSummary,
  ShoppingItem,
} from "../../lib/types";
import { Colors } from "../../constants/colors";

import MacroForm from "../../components/plans/MacroForm";
import PlanGrid from "../../components/plans/PlanGrid";

// ---------------------------------------------------------------------------
// Conversion helpers
// ---------------------------------------------------------------------------

/**
 * Convert a Recipe (app type) to a RecipeInput (solver type).
 */
function recipeToSolverInput(recipe: Recipe, defaultFrequency: number): RecipeInput {
  return {
    id: recipe.id,
    name: recipe.name,
    category: recipe.category,
    calories: recipe.calories,
    protein: recipe.protein,
    fat: recipe.fat,
    carbs: recipe.carbs,
    fiber: recipe.fiber ?? 0,
    frequencyLimit: recipe.frequency ?? defaultFrequency,
    rating: recipe.rating ?? null,
    ingredients: recipe.ingredients ?? null,
  };
}

/**
 * Convert a SolvedPlan (solver result) to a MealPlan (app type),
 * hydrating recipe IDs with full Recipe objects.
 */
function solvedPlanToMealPlan(
  solved: SolvedPlan,
  recipesById: Record<string, Recipe>,
  index: number
): MealPlan {
  const days: DayPlan[] = [];

  for (const [dayName, slots] of Object.entries(solved.planData)) {
    const meals: MealAssignment[] = [];
    let totalCalories = 0;
    let totalProtein = 0;
    let totalFat = 0;
    let totalCarbs = 0;

    for (const [slot, recipeId] of Object.entries(slots)) {
      if (recipeId && recipesById[recipeId]) {
        const recipe = recipesById[recipeId];
        meals.push({ slot: slot as MealSlot, recipe });
        totalCalories += recipe.calories;
        totalProtein += recipe.protein;
        totalFat += recipe.fat;
        totalCarbs += recipe.carbs;
      }
    }

    days.push({
      day: dayName,
      meals,
      totalCalories,
      totalProtein,
      totalFat,
      totalCarbs,
    });
  }

  const macroSummary: MacroSummary = {
    avgCalories: solved.macroSummary.dailyAverages.calories ?? 0,
    avgProtein: solved.macroSummary.dailyAverages.protein ?? 0,
    avgFat: solved.macroSummary.dailyAverages.fat ?? 0,
    avgCarbs: solved.macroSummary.dailyAverages.carbs ?? 0,
    avgFiber: solved.macroSummary.dailyAverages.fiber ?? 0,
  };

  return {
    id: uuid(),
    label: solved.name || `Plan ${index + 1}`,
    days,
    macroSummary,
    selected: false,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Build the targets dict for the solver from MacroTargets.
 * Only includes enabled macros.
 */
function buildSolverTargets(
  targets: MacroTargets
): Record<string, number | undefined> {
  const result: Record<string, number | undefined> = {};
  const macroKeys = ["calories", "protein", "fat", "carbs", "fiber"] as const;

  for (const key of macroKeys) {
    const macro = targets[key];
    result[key] = macro.enabled ? macro.value : undefined;
  }

  return result;
}

/**
 * Convert a MealPlan to planData format for shopping list generation.
 */
function mealPlanToPlanData(
  plan: MealPlan
): Record<string, Record<string, string | null>> {
  const planData: Record<string, Record<string, string | null>> = {};
  for (const dayPlan of plan.days) {
    const slots: Record<string, string | null> = {};
    for (const meal of dayPlan.meals) {
      slots[meal.slot] = meal.recipe.id;
    }
    planData[dayPlan.day] = slots;
  }
  return planData;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PlansScreen() {
  const db = useDatabase();
  const router = useRouter();
  const solverRef = useRef(new MealPlanSolver());

  const [plans, setPlans] = useState<MealPlan[] | null>(null);
  const [generating, setGenerating] = useState(false);
  const [rerollingKey, setRerollingKey] = useState<string | null>(null);
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([]);

  // -------------------------------------------------------------------
  // Generate plans
  // -------------------------------------------------------------------
  const handleGenerate = useCallback(
    async (targets: MacroTargets) => {
      setGenerating(true);
      try {
        // 1. Load all recipes from SQLite
        const recipes = await getAllRecipes(db);
        if (recipes.length === 0) {
          Alert.alert(
            "No Recipes",
            "Add some recipes before generating a meal plan."
          );
          setGenerating(false);
          return;
        }
        setAllRecipes(recipes);

        // 2. Convert to RecipeInput format for solver
        const solverInputs = recipes.map((r) =>
          recipeToSolverInput(r, targets.defaultFrequency)
        );

        // 3. Build targets dict from MacroTargets (only enabled macros)
        const solverTargets = buildSolverTargets(targets);

        // 4. Call solver
        const solvedPlans = await solverRef.current.solve(
          solverInputs,
          solverTargets,
          3, // numPlans
          targets.numDays,
          targets.includeSnacks,
          targets.combineLunchDinner,
          targets.selectedSlots,
          targets.priorityOrder,
          targets.preferSimilarIngredients
        );

        if (solvedPlans.length === 0) {
          Alert.alert(
            "No Plans Generated",
            "The solver could not find valid plans. Try adjusting your macro targets or adding more recipes."
          );
          setGenerating(false);
          return;
        }

        // 5. Convert SolvedPlan[] to MealPlan[]
        const recipesById: Record<string, Recipe> = {};
        for (const r of recipes) {
          recipesById[r.id] = r;
        }

        const mealPlans = solvedPlans.map((sp, idx) =>
          solvedPlanToMealPlan(sp, recipesById, idx)
        );

        // 6. Set plans state
        setPlans(mealPlans);
      } catch (error) {
        console.error("Failed to generate plans:", error);
        Alert.alert(
          "Generation Failed",
          "An error occurred while generating plans. Please try again."
        );
      } finally {
        setGenerating(false);
      }
    },
    [db]
  );

  // -------------------------------------------------------------------
  // Select a plan
  // -------------------------------------------------------------------
  const handleSelectPlan = useCallback(
    async (planId: string) => {
      const selectedPlan = plans?.find((p) => p.id === planId);
      if (!selectedPlan) return;

      try {
        // 1. Insert meal plan to SQLite
        const insertedId = await insertMealPlan(db, {
          label: selectedPlan.label,
          days: selectedPlan.days,
          macroSummary: selectedPlan.macroSummary,
          selected: true,
        });

        // 2. Select it
        await selectMealPlan(db, insertedId);

        // 3. Generate shopping list from plan
        const planData = mealPlanToPlanData(selectedPlan);
        const recipesById: Record<string, Recipe> = {};
        for (const r of allRecipes) {
          recipesById[r.id] = r;
        }

        const shoppingItems = generateShoppingList(planData, recipesById);

        // Convert to ShoppingItem[] with IDs
        const items: ShoppingItem[] = shoppingItems.map((item) => ({
          id: uuid(),
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          checked: false,
          category: item.category,
        }));

        await insertShoppingList(db, insertedId, items);

        // 4. Navigate to Shopping tab
        router.push("/(tabs)/shopping");
      } catch (error) {
        console.error("Failed to select plan:", error);
        Alert.alert("Error", "Failed to save the meal plan. Please try again.");
      }
    },
    [plans, allRecipes, db, router]
  );

  // -------------------------------------------------------------------
  // Reroll a meal
  // -------------------------------------------------------------------
  const handleReroll = useCallback(
    async (planIndex: number, day: string, slot: string) => {
      if (!plans || !plans[planIndex]) return;

      const key = `${planIndex}-${day}-${slot}`;
      setRerollingKey(key);

      try {
        const result = rerollMeal(plans[planIndex], day, slot, allRecipes);

        if (!result) {
          Alert.alert(
            "No Alternatives",
            "No suitable replacement recipes found for this slot."
          );
          return;
        }

        // Update the plan in state
        setPlans((prev) => {
          if (!prev) return prev;
          const updated = [...prev];
          updated[planIndex] = result.updatedPlan;
          return updated;
        });
      } catch (error) {
        console.error("Failed to reroll meal:", error);
        Alert.alert("Error", "Failed to reroll the meal. Please try again.");
      } finally {
        setRerollingKey(null);
      }
    },
    [plans, allRecipes]
  );

  // -------------------------------------------------------------------
  // Back to settings
  // -------------------------------------------------------------------
  const handleBackToSettings = useCallback(() => {
    setPlans(null);
    setAllRecipes([]);
  }, []);

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------
  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      {plans === null ? (
        // State 1: No plans generated - show form
        <MacroForm onGenerate={handleGenerate} generating={generating} />
      ) : (
        // State 2: Plans generated - show grid
        <View style={styles.container}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackToSettings}
            activeOpacity={0.7}
          >
            <ArrowLeft size={18} color={Colors.primary} strokeWidth={2} />
            <Text style={styles.backButtonText}>Back to Settings</Text>
          </TouchableOpacity>

          <PlanGrid
            plans={plans}
            onSelectPlan={handleSelectPlan}
            onReroll={handleReroll}
            rerollingKey={rerollingKey}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.primary,
  },
});
