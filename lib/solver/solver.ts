/**
 * Meal plan constraint solver using glpk.js (GLPK compiled to WASM).
 *
 * This is a direct port of the Python PuLP-based solver.  The key difference
 * is that glpk.js uses a declarative problem format rather than PuLP's
 * incremental builder pattern.  We accumulate arrays of objective vars,
 * constraints, and binary variable names, then pass them all to glpk.solve().
 */

import GLPKFactory from "glpk.js";
import type { GLPK } from "glpk.js";
import type { RecipeCategory } from "../types";
import type { RecipeInput, SolvedPlan } from "./types";
import {
  MEAL_SLOTS,
  MACRO_CAPS,
  CAP_PENALTY,
  REUSE_PENALTY,
  RATING_WEIGHT,
  PROTEIN_VARIETY_PENALTY,
  PROTEIN_KEYWORDS,
  BASE_MAX_DEV,
} from "./constants";

// ---------------------------------------------------------------------------
// Helper types for building the LP problem
// ---------------------------------------------------------------------------

interface ObjVar {
  name: string;
  coef: number;
}

interface Constraint {
  name: string;
  vars: ObjVar[];
  bnds: { type: number; lb: number; ub: number };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Return the set of protein categories found in a recipe's ingredients.
 */
export function getProteinTypes(recipe: RecipeInput): Set<string> {
  if (!recipe.ingredients || recipe.ingredients.length === 0) {
    return new Set();
  }
  const text = recipe.ingredients.join(" ").toLowerCase();
  const found = new Set<string>();
  for (const [category, keywords] of Object.entries(PROTEIN_KEYWORDS)) {
    if (keywords.some((kw) => text.includes(kw))) {
      found.add(category);
    }
  }
  return found;
}

// ---------------------------------------------------------------------------
// Solver
// ---------------------------------------------------------------------------

/** Singleton GLPK instance (initialised lazily). */
let _glpk: GLPK | null = null;

async function getGlpk(): Promise<GLPK> {
  if (!_glpk) {
    _glpk = await GLPKFactory();
  }
  return _glpk;
}

/**
 * Generates weekly meal plans using GLPK linear programming solver.
 *
 * Uses binary decision variables x[recipe_id][day][meal_slot] to assign
 * exactly one recipe per meal slot per day.  Macro targets are enforced with:
 * - Hard bounds: daily macros within +/-max_dev of target (if feasible)
 * - Soft directional caps: steep penalty for crossing target the wrong way
 * - Deviation objective: minimise distance from target (high weight)
 * - Reuse penalty: prefer different recipes across plans (lower weight)
 * - Rating preference: slight bonus for higher-rated recipes
 */
export class MealPlanSolver {
  /**
   * Generate up to `numPlans` meal plan variations.
   */
  async solve(
    recipes: RecipeInput[],
    targets: Record<string, number | undefined>,
    numPlans = 3,
    numDays = 6,
    includeSnacks = false,
    combineLunchDinner = false,
    selectedSlots: string[] | null = null,
    priorityOrder: string[] | null = null,
    preferSimilarIngredients = false,
  ): Promise<SolvedPlan[]> {
    numDays = Math.max(1, Math.min(numDays, 7));
    const days = Array.from({ length: numDays }, (_, i) => i);
    const dayNames = days.map((i) => `Day ${i + 1}`);

    // Build active meal slots
    let activeSlots: RecipeCategory[];
    if (selectedSlots !== null) {
      const validSlots = new Set<string>([
        "breakfast", "lunch", "dinner", "snack", "dessert",
      ]);
      activeSlots = selectedSlots.filter((s) =>
        validSlots.has(s),
      ) as RecipeCategory[];
      if (activeSlots.length === 0) {
        activeSlots = ["breakfast", "lunch", "dinner"];
      }
    } else {
      activeSlots = ["breakfast", "lunch", "dinner"];
    }
    if (includeSnacks && !activeSlots.includes("snack")) {
      activeSlots.push("snack");
    }

    // Build priority weights and ranks
    const order =
      priorityOrder ?? ["calories", "protein", "fat", "carbs", "fiber"];
    const priorityWeights: Record<string, number> = {};
    const priorityRank: Record<string, number> = {};
    for (let i = 0; i < order.length; i++) {
      priorityWeights[order[i]] = Math.max(1000.0 - 200.0 * i, 200.0);
      priorityRank[order[i]] = i + 1;
    }

    // Hard-bound max deviations based on priority rank
    const maxDeviations: Record<string, number> = {};
    for (const [macro, base] of Object.entries(BASE_MAX_DEV)) {
      const rank = priorityRank[macro] ?? 5;
      const rankMult = 1.0 + (rank - 1) * 0.5;
      maxDeviations[macro] = base * rankMult;
    }

    // Group recipes by category
    const byCategory: Record<string, RecipeInput[]> = {};
    for (const slot of activeSlots) {
      byCategory[slot] = [];
    }
    for (const r of recipes) {
      if (
        combineLunchDinner &&
        (r.category === "lunch" || r.category === "dinner")
      ) {
        if (byCategory["lunch"]) byCategory["lunch"].push(r);
        if (byCategory["dinner"]) byCategory["dinner"].push(r);
      } else if (byCategory[r.category] !== undefined) {
        byCategory[r.category].push(r);
      }
    }

    for (const [cat, catRecipes] of Object.entries(byCategory)) {
      if (catRecipes.length === 0) {
        console.warn(`No recipes available for category: ${cat}`);
        return [];
      }
    }

    const plans: SolvedPlan[] = [];
    const usedRecipeIds = new Set<string>();

    for (let planIdx = 0; planIdx < numPlans; planIdx++) {
      const penalize =
        planIdx > 0 ? new Set<string>(usedRecipeIds) : new Set<string>();

      // Tier 1: hard macro bounds + protein cap (if similar ingredients)
      let plan = await this._solveSingle(
        byCategory,
        targets,
        planIdx,
        days,
        dayNames,
        activeSlots,
        priorityWeights,
        combineLunchDinner,
        penalize,
        maxDeviations,
        preferSimilarIngredients,
        preferSimilarIngredients ? 2 : null,
      );

      // Tier 2: hard macro bounds, no protein cap
      if (plan === null && preferSimilarIngredients) {
        console.info(
          `Plan ${planIdx + 1}: protein cap infeasible, retrying without cap`,
        );
        plan = await this._solveSingle(
          byCategory,
          targets,
          planIdx,
          days,
          dayNames,
          activeSlots,
          priorityWeights,
          combineLunchDinner,
          penalize,
          maxDeviations,
          preferSimilarIngredients,
          null,
        );
      }

      // Tier 3: soft-only (no hard bounds or protein cap)
      if (plan === null) {
        console.info(
          `Plan ${planIdx + 1}: hard bounds infeasible, retrying without`,
        );
        plan = await this._solveSingle(
          byCategory,
          targets,
          planIdx,
          days,
          dayNames,
          activeSlots,
          priorityWeights,
          combineLunchDinner,
          penalize,
          null,
          preferSimilarIngredients,
          null,
        );
      }

      if (plan !== null) {
        plan.name = `Plan ${planIdx + 1}`;
        plans.push(plan);
        for (const dayData of Object.values(plan.planData)) {
          for (const recipeId of Object.values(dayData)) {
            if (recipeId !== null) {
              usedRecipeIds.add(recipeId);
            }
          }
        }
      } else {
        console.warn(`Could not generate plan ${planIdx + 1}`);
      }
    }

    return plans;
  }

  // -----------------------------------------------------------------------
  // Private: build and solve a single LP
  // -----------------------------------------------------------------------

  private async _solveSingle(
    byCategory: Record<string, RecipeInput[]>,
    targets: Record<string, number | undefined>,
    planIdx: number,
    days: number[],
    dayNames: string[],
    activeSlots: RecipeCategory[],
    priorityWeights: Record<string, number>,
    combineLunchDinner: boolean,
    penalizedRecipeIds: Set<string>,
    maxDeviations: Record<string, number> | null,
    preferSimilarIngredients: boolean,
    maxProteinTypes: number | null,
  ): Promise<SolvedPlan | null> {
    const glpk = await getGlpk();

    const numDays = days.length;

    // Build recipe lookup
    const recipeLookup: Record<string, RecipeInput> = {};
    for (const catRecipes of Object.values(byCategory)) {
      for (const r of catRecipes) {
        recipeLookup[r.id] = r;
      }
    }

    // Accumulator arrays for the LP
    const objVars: ObjVar[] = [];
    const constraints: Constraint[] = [];
    const binaries: string[] = [];

    // -----------------------------------------------------------------
    // Decision variables: x[recipeId][day][slot]
    //
    // In glpk.js we don't create variable objects; we just use string
    // names.  We track the variable names to add them to the binaries list.
    // -----------------------------------------------------------------
    type VarMap = Record<string, Record<number, Record<string, string>>>;
    const x: VarMap = {};

    for (const [cat, catRecipes] of Object.entries(byCategory)) {
      for (const r of catRecipes) {
        if (!x[r.id]) x[r.id] = {};
        for (const d of days) {
          if (!x[r.id][d]) x[r.id][d] = {};
          const varName = `x_${r.id}_${d}_${cat}`;
          x[r.id][d][cat] = varName;
          binaries.push(varName);
        }
      }
    }

    // -----------------------------------------------------------------
    // Constraint 1: Exactly one recipe per meal slot per day
    // -----------------------------------------------------------------
    for (const d of days) {
      for (const slot of activeSlots) {
        const vars: ObjVar[] = [];
        for (const r of byCategory[slot]) {
          vars.push({ name: x[r.id][d][slot], coef: 1 });
        }
        constraints.push({
          name: `one_recipe_day${d}_${slot}`,
          vars,
          bnds: { type: glpk.GLP_FX, lb: 1, ub: 1 },
        });
      }
    }

    // -----------------------------------------------------------------
    // Constraint 2: Frequency limit
    // -----------------------------------------------------------------
    for (const [rId, recipe] of Object.entries(recipeLookup)) {
      if (!x[rId]) continue;
      const totalUses: ObjVar[] = [];
      for (const d of days) {
        if (!x[rId][d]) continue;
        for (const slotKey of Object.keys(x[rId][d])) {
          totalUses.push({ name: x[rId][d][slotKey], coef: 1 });
        }
      }
      if (totalUses.length > 0) {
        constraints.push({
          name: `freq_limit_${rId}`,
          vars: totalUses,
          bnds: { type: glpk.GLP_UP, lb: 0, ub: recipe.frequencyLimit },
        });
      }
    }

    // -----------------------------------------------------------------
    // Constraint 3: Block-based consecutive-day grouping
    // -----------------------------------------------------------------
    const sampleFreq = Object.values(recipeLookup)[0]?.frequencyLimit ?? 1;
    const blockSize = Math.min(sampleFreq, numDays);
    const blocks: number[][] = [];
    let start = 0;
    while (start < numDays) {
      const end = Math.min(start + blockSize, numDays);
      blocks.push(Array.from({ length: end - start }, (_, i) => start + i));
      start = end;
    }

    for (const block of blocks) {
      if (block.length <= 1) continue;
      const firstDay = block[0];
      for (let bi = 1; bi < block.length; bi++) {
        const d = block[bi];
        for (const slot of activeSlots) {
          for (const r of byCategory[slot]) {
            // x[r.id][d][slot] - x[r.id][firstDay][slot] == 0
            constraints.push({
              name: `block_same_${r.id}_d${d}_to_d${firstDay}_${slot}`,
              vars: [
                { name: x[r.id][d][slot], coef: 1 },
                { name: x[r.id][firstDay][slot], coef: -1 },
              ],
              bnds: { type: glpk.GLP_FX, lb: 0, ub: 0 },
            });
          }
        }
      }
    }

    // -----------------------------------------------------------------
    // Constraint 4: Slot consistency for combined lunch/dinner
    // -----------------------------------------------------------------
    const slotChoiceBinaries: string[] = [];

    if (
      combineLunchDinner &&
      activeSlots.includes("lunch") &&
      activeSlots.includes("dinner")
    ) {
      const combinedRecipeIds = new Set<string>();
      for (const r of byCategory["lunch"] ?? []) {
        if (
          x[r.id] &&
          days.some((d) => x[r.id][d] && "dinner" in x[r.id][d])
        ) {
          combinedRecipeIds.add(r.id);
        }
      }

      for (const rId of combinedRecipeIds) {
        const choiceVar = `slot_choice_${rId}`;
        slotChoiceBinaries.push(choiceVar);

        for (const d of days) {
          // x[rId][d]["lunch"] <= slot_choice
          // i.e. x[rId][d]["lunch"] - slot_choice <= 0
          if (x[rId][d] && "lunch" in x[rId][d]) {
            constraints.push({
              name: `slot_consist_lunch_${rId}_d${d}`,
              vars: [
                { name: x[rId][d]["lunch"], coef: 1 },
                { name: choiceVar, coef: -1 },
              ],
              bnds: { type: glpk.GLP_UP, lb: 0, ub: 0 },
            });
          }
          // x[rId][d]["dinner"] <= 1 - slot_choice
          // i.e. x[rId][d]["dinner"] + slot_choice <= 1
          if (x[rId][d] && "dinner" in x[rId][d]) {
            constraints.push({
              name: `slot_consist_dinner_${rId}_d${d}`,
              vars: [
                { name: x[rId][d]["dinner"], coef: 1 },
                { name: choiceVar, coef: 1 },
              ],
              bnds: { type: glpk.GLP_UP, lb: 0, ub: 1 },
            });
          }
        }
      }
    }

    // All extra binaries (slot_choice variables)
    binaries.push(...slotChoiceBinaries);

    // =================================================================
    // Objective
    // =================================================================

    // Reuse penalty (relatively low so deviation dominates)
    for (const rId of penalizedRecipeIds) {
      if (!x[rId]) continue;
      for (const d of days) {
        if (!x[rId][d]) continue;
        for (const slotKey of Object.keys(x[rId][d])) {
          objVars.push({ name: x[rId][d][slotKey], coef: REUSE_PENALTY });
        }
      }
    }

    // Rating preference: slightly penalise lower-rated recipes.
    // Unrated recipes are treated as 5-star to encourage diversity.
    for (const [rId, recipe] of Object.entries(recipeLookup)) {
      const rating = recipe.rating !== null ? recipe.rating : 5.0;
      const penalty = (RATING_WEIGHT * (5.0 - rating)) / 5.0;
      if (penalty > 0 && x[rId]) {
        for (const d of days) {
          if (!x[rId][d]) continue;
          for (const slotKey of Object.keys(x[rId][d])) {
            objVars.push({ name: x[rId][d][slotKey], coef: penalty });
          }
        }
      }
    }

    // Protein consolidation: penalise each distinct protein type used.
    const proteinBinaries: string[] = [];

    if (preferSimilarIngredients) {
      const recipeProteins: Record<string, Set<string>> = {};
      for (const [rId, r] of Object.entries(recipeLookup)) {
        recipeProteins[rId] = getProteinTypes(r);
      }
      const allProteins = new Set<string>();
      for (const cats of Object.values(recipeProteins)) {
        for (const c of cats) allProteins.add(c);
      }

      if (allProteins.size > 0) {
        // Binary indicator: use_prot_<protein>_<planIdx>
        const useProtein: Record<string, string> = {};
        for (const p of allProteins) {
          const varName = `use_prot_${p}_${planIdx}`;
          useProtein[p] = varName;
          proteinBinaries.push(varName);
        }

        // Indicator constraints: if any recipe with protein p is
        // selected in any slot, useProtein[p] must be 1.
        for (const [rId, proteins] of Object.entries(recipeProteins)) {
          if (proteins.size === 0 || !x[rId]) continue;
          for (const p of proteins) {
            for (const d of days) {
              if (!x[rId][d]) continue;
              for (const slotKey of Object.keys(x[rId][d])) {
                // useProtein[p] >= x[rId][d][slotKey]
                // i.e. useProtein[p] - x[rId][d][slotKey] >= 0
                constraints.push({
                  name: `prot_ind_${p}_${rId}_d${d}_${slotKey}`,
                  vars: [
                    { name: useProtein[p], coef: 1 },
                    { name: x[rId][d][slotKey], coef: -1 },
                  ],
                  bnds: { type: glpk.GLP_LO, lb: 0, ub: 0 },
                });
              }
            }
          }
        }

        // Objective: penalise each protein type used
        for (const p of allProteins) {
          objVars.push({ name: useProtein[p], coef: PROTEIN_VARIETY_PENALTY });
        }

        // Hard cap on distinct protein types
        if (
          maxProteinTypes !== null &&
          allProteins.size > maxProteinTypes
        ) {
          const protVars: ObjVar[] = [];
          for (const p of allProteins) {
            protVars.push({ name: useProtein[p], coef: 1 });
          }
          constraints.push({
            name: `max_protein_types_${planIdx}`,
            vars: protVars,
            bnds: { type: glpk.GLP_UP, lb: 0, ub: maxProteinTypes },
          });
        }
      }
    }

    binaries.push(...proteinBinaries);

    // -----------------------------------------------------------------
    // Per-day macro constraints and objective
    // -----------------------------------------------------------------

    // Track continuous (slack/deviation) variable names for lower-bound
    // constraints. glpk.js doesn't have an explicit lowBound=0 on vars;
    // we must add individual >= 0 constraints.
    const continuousLbVars: string[] = [];

    const macroFieldMap: Record<string, keyof RecipeInput> = {
      calories: "calories",
      protein: "protein",
      fat: "fat",
      carbs: "carbs",
      fiber: "fiber",
    };

    for (const d of days) {
      // Build daily expression coefficients per macro
      const dailyTerms: Record<string, ObjVar[]> = {
        calories: [],
        protein: [],
        fat: [],
        carbs: [],
        fiber: [],
      };

      for (const slot of activeSlots) {
        for (const r of byCategory[slot]) {
          const varName = x[r.id][d][slot];
          dailyTerms["calories"].push({ name: varName, coef: r.calories });
          dailyTerms["protein"].push({ name: varName, coef: r.protein });
          dailyTerms["fat"].push({ name: varName, coef: r.fat });
          dailyTerms["carbs"].push({ name: varName, coef: r.carbs });
          dailyTerms["fiber"].push({ name: varName, coef: r.fiber });
        }
      }

      for (const macroName of Object.keys(macroFieldMap)) {
        const targetVal = targets[macroName];
        if (targetVal === undefined || targetVal <= 0) continue;

        const dailyExprVars = dailyTerms[macroName];

        // Hard bounds (if provided)
        if (maxDeviations && macroName in maxDeviations) {
          const maxDev = maxDeviations[macroName];

          // daily_expr >= target - maxDev
          constraints.push({
            name: `${macroName}_hard_min_d${d}`,
            vars: [...dailyExprVars],
            bnds: {
              type: glpk.GLP_LO,
              lb: targetVal - maxDev,
              ub: 0,
            },
          });

          // daily_expr <= target + maxDev
          constraints.push({
            name: `${macroName}_hard_max_d${d}`,
            vars: [...dailyExprVars],
            bnds: {
              type: glpk.GLP_UP,
              lb: 0,
              ub: targetVal + maxDev,
            },
          });
        }

        // Soft directional cap
        const cap = MACRO_CAPS[macroName];
        if (cap) {
          const capSlackName = `cap_slack_${macroName}_d${d}`;
          continuousLbVars.push(capSlackName);

          if (cap === "le") {
            // daily_expr <= target + cap_slack
            // => daily_expr - cap_slack <= target
            constraints.push({
              name: `${macroName}_cap_d${d}`,
              vars: [
                ...dailyExprVars,
                { name: capSlackName, coef: -1 },
              ],
              bnds: { type: glpk.GLP_UP, lb: 0, ub: targetVal },
            });
          } else {
            // cap === "ge"
            // daily_expr >= target - cap_slack
            // => daily_expr + cap_slack >= target
            constraints.push({
              name: `${macroName}_cap_d${d}`,
              vars: [
                ...dailyExprVars,
                { name: capSlackName, coef: 1 },
              ],
              bnds: { type: glpk.GLP_LO, lb: targetVal, ub: 0 },
            });
          }

          // Objective: CAP_PENALTY * cap_slack / target
          objVars.push({
            name: capSlackName,
            coef: CAP_PENALTY / targetVal,
          });
        }

        // Deviation from target
        const devPlusName = `dev_plus_${macroName}_d${d}`;
        const devMinusName = `dev_minus_${macroName}_d${d}`;
        continuousLbVars.push(devPlusName);
        continuousLbVars.push(devMinusName);

        // daily_expr - target == dev_plus - dev_minus
        // => daily_expr - dev_plus + dev_minus == target
        constraints.push({
          name: `dev_${macroName}_d${d}`,
          vars: [
            ...dailyExprVars,
            { name: devPlusName, coef: -1 },
            { name: devMinusName, coef: 1 },
          ],
          bnds: { type: glpk.GLP_FX, lb: targetVal, ub: targetVal },
        });

        // Objective: weight * (dev_plus + dev_minus) / target
        const weight = priorityWeights[macroName] ?? 200.0;
        objVars.push({ name: devPlusName, coef: weight / targetVal });
        objVars.push({ name: devMinusName, coef: weight / targetVal });
      }
    }

    // -----------------------------------------------------------------
    // Lower-bound constraints for continuous variables (>= 0)
    // -----------------------------------------------------------------
    for (const varName of continuousLbVars) {
      constraints.push({
        name: `lb_${varName}`,
        vars: [{ name: varName, coef: 1 }],
        bnds: { type: glpk.GLP_LO, lb: 0, ub: 0 },
      });
    }

    // -----------------------------------------------------------------
    // Ensure objective has at least one term
    // -----------------------------------------------------------------
    if (objVars.length === 0) {
      // Add a dummy zero-cost term (use first binary var if available)
      if (binaries.length > 0) {
        objVars.push({ name: binaries[0], coef: 0 });
      }
    }

    // -----------------------------------------------------------------
    // Solve
    // -----------------------------------------------------------------
    let result;
    try {
      result = await glpk.solve(
        {
          name: `MealPlan_${planIdx}`,
          objective: {
            direction: glpk.GLP_MIN,
            name: "obj",
            vars: objVars,
          },
          subjectTo: constraints,
          binaries,
        },
        {
          msglev: glpk.GLP_MSG_OFF,
          tmlim: 10,
        },
      );
    } catch (e) {
      console.warn(`Solver error for plan ${planIdx}:`, e);
      return null;
    }

    if (result.result.status !== glpk.GLP_OPT) {
      console.warn(`Solver status: ${result.result.status}`);
      return null;
    }

    // -----------------------------------------------------------------
    // Extract solution
    // -----------------------------------------------------------------
    const vars = result.result.vars;
    const planData: Record<string, Record<string, string | null>> = {};

    for (const d of days) {
      const dayKey = dayNames[d];
      planData[dayKey] = {};
      for (const slot of activeSlots) {
        planData[dayKey][slot] = null;
        for (const r of byCategory[slot]) {
          const varName = x[r.id][d][slot];
          const rawVal = vars[varName];
          if (rawVal !== undefined && Math.round(rawVal) === 1) {
            planData[dayKey][slot] = r.id;
          }
        }
      }
    }

    const macroSummary = MealPlanSolver.computeMacroSummary(
      planData,
      recipeLookup,
      activeSlots,
      dayNames,
    );

    return { name: "", planData, macroSummary };
  }

  // -----------------------------------------------------------------------
  // Macro summary
  // -----------------------------------------------------------------------

  static computeMacroSummary(
    planData: Record<string, Record<string, string | null>>,
    recipeLookup: Record<string, RecipeInput>,
    activeSlots?: RecipeCategory[],
    dayNames?: string[],
  ): SolvedPlan["macroSummary"] {
    const slots = activeSlots ?? MEAL_SLOTS;
    const days = dayNames ?? Object.keys(planData);

    const dailyBreakdown: Array<Record<string, number | string>> = [];
    const totals: Record<string, number> = {
      calories: 0,
      protein: 0,
      fat: 0,
      carbs: 0,
      fiber: 0,
    };

    for (const dayName of days) {
      const dayData = planData[dayName] ?? {};
      const dayMacros: Record<string, number | string> = {
        day: dayName,
        calories: 0,
        protein: 0,
        fat: 0,
        carbs: 0,
        fiber: 0,
      };

      for (const slot of slots) {
        const recipeId = dayData[slot];
        if (recipeId && recipeLookup[recipeId]) {
          const r = recipeLookup[recipeId];
          (dayMacros["calories"] as number) += r.calories;
          (dayMacros["protein"] as number) += r.protein;
          (dayMacros["fat"] as number) += r.fat;
          (dayMacros["carbs"] as number) += r.carbs;
          (dayMacros["fiber"] as number) += r.fiber;
        }
      }

      dailyBreakdown.push(dayMacros);
      for (const key of Object.keys(totals)) {
        totals[key] += dayMacros[key] as number;
      }
    }

    const numDays = Math.max(days.length, 1);
    const dailyAverages: Record<string, number> = {};
    for (const [k, v] of Object.entries(totals)) {
      dailyAverages[k] = Math.round((v / numDays) * 10) / 10;
    }

    return { dailyAverages, dailyBreakdown };
  }
}
