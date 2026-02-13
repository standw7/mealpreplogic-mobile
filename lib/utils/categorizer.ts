/**
 * Auto-categorize recipes based on name and ingredients using keyword heuristics.
 */

import type { RecipeCategory } from "../types";

const DESSERT_NAME_KEYWORDS = [
  "cake", "cookie", "cookies", "brownie", "brownies", "pie", "tart",
  "cupcake", "cupcakes", "muffin", "muffins", "pudding", "fudge",
  "ice cream", "gelato", "sorbet", "cheesecake", "tiramisu", "mousse",
  "truffle", "truffles", "macaroon", "macaron", "donut", "doughnut",
  "pastry", "scone", "cobbler", "crumble", "flan", "eclair", "souffle",
  "pavlova", "biscotti", "churro", "churros", "cannoli", "panna cotta",
  "creme brulee", "parfait", "sundae", "meringue", "baklava", "blondie",
  "blondies", "snickerdoodle", "shortcake", "bundt", "frosting",
];

const DESSERT_INGREDIENT_KEYWORDS = [
  "cocoa powder", "chocolate chips", "powdered sugar",
  "confectioners sugar", "frosting", "sprinkles",
];

const BREAKFAST_NAME_KEYWORDS = [
  "breakfast", "pancake", "pancakes", "waffle", "waffles", "oatmeal",
  "omelet", "omelette", "frittata", "granola", "smoothie bowl",
  "french toast", "eggs benedict", "hash brown", "hash browns",
  "porridge", "acai bowl", "overnight oats", "shakshuka",
  "breakfast burrito", "breakfast sandwich", "scramble", "scrambled eggs",
];

const SNACK_NAME_KEYWORDS = [
  "snack", "dip", "hummus", "guacamole", "salsa", "trail mix",
  "energy ball", "energy balls", "protein ball", "protein balls",
  "protein bar", "popcorn", "crackers", "edamame", "bruschetta",
  "crostini", "deviled eggs", "spring roll", "spring rolls",
  "appetizer",
];

const LUNCH_NAME_KEYWORDS = [
  "salad", "sandwich", "sandwiches", "wrap", "wraps", "soup",
  "bowl", "burrito", "quesadilla", "panini", "grain bowl", "poke",
  "pita",
];

const DINNER_NAME_KEYWORDS = [
  "steak", "roast", "grilled", "baked chicken", "stir fry",
  "stir-fry", "casserole", "lasagna", "pasta", "risotto",
  "curry", "stew", "chili", "pot roast", "meatloaf",
  "salmon", "shrimp", "lobster", "pot pie",
];

/**
 * Categorize a recipe based on its name and ingredients.
 *
 * Falls back to "dinner" when no keywords match.
 */
export function autoCategorize(
  name: string | null,
  ingredients?: string[] | null,
): RecipeCategory {
  const nameLower = (name ?? "").toLowerCase();
  const ingredientsText = (ingredients ?? []).join(" ").toLowerCase();

  if (DESSERT_NAME_KEYWORDS.some((kw) => nameLower.includes(kw))) {
    return "dessert";
  }
  if (DESSERT_INGREDIENT_KEYWORDS.some((kw) => ingredientsText.includes(kw))) {
    return "dessert";
  }

  if (BREAKFAST_NAME_KEYWORDS.some((kw) => nameLower.includes(kw))) {
    return "breakfast";
  }

  if (SNACK_NAME_KEYWORDS.some((kw) => nameLower.includes(kw))) {
    return "snack";
  }

  if (LUNCH_NAME_KEYWORDS.some((kw) => nameLower.includes(kw))) {
    return "lunch";
  }

  if (DINNER_NAME_KEYWORDS.some((kw) => nameLower.includes(kw))) {
    return "dinner";
  }

  return "dinner";
}
