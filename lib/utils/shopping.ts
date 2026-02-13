/**
 * Ingredient parser and shopping list generator.
 *
 * Ported from backend/app/services/shopping.py in the MealPrepLogic web app.
 */

import type { Recipe } from "../types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ParsedIngredient {
  name: string;
  quantity: number;
  unit: string;
  category: string;
}

export interface ShoppingItemData {
  name: string;
  quantity: number;
  unit: string;
  category: string;
}

// ---------------------------------------------------------------------------
// Category keywords (mirrors _CATEGORY_KEYWORDS)
// ---------------------------------------------------------------------------

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  produce: [
    "lettuce", "tomato", "onion", "garlic", "pepper", "carrot", "broccoli",
    "spinach", "kale", "avocado", "lemon", "lime", "banana", "apple",
    "berry", "berries", "celery", "cucumber", "potato", "mushroom",
    "zucchini", "squash", "corn", "peas", "beans", "ginger", "cilantro",
    "parsley", "basil", "mint", "fruit", "vegetable",
  ],
  protein: [
    "chicken", "beef", "pork", "turkey", "salmon", "fish", "shrimp",
    "tofu", "egg", "eggs", "bacon", "sausage", "steak", "ground",
  ],
  dairy: [
    "milk", "cheese", "yogurt", "butter", "cream", "sour cream",
    "mozzarella", "cheddar", "parmesan",
  ],
  grains: [
    "rice", "pasta", "bread", "flour", "oats", "cereal", "tortilla",
    "noodle", "quinoa", "couscous",
  ],
  pantry: [
    "oil", "vinegar", "sauce", "salt", "pepper", "sugar", "honey",
    "spice", "cumin", "paprika", "cinnamon", "vanilla", "broth",
    "stock", "can", "canned", "dried",
  ],
};

// ---------------------------------------------------------------------------
// Unit maps (mirrors _PLURAL_UNITS, _UNIT_NORMALIZE)
// ---------------------------------------------------------------------------

const PLURAL_UNITS: Record<string, string> = {
  cup: "cups", tbsp: "tbsp", tsp: "tsp", oz: "oz",
  lb: "lbs", g: "g", kg: "kg", ml: "ml", can: "cans",
  clove: "cloves", slice: "slices", piece: "pieces",
  bunch: "bunches", liter: "liters", tablespoon: "tablespoons",
  teaspoon: "teaspoons", ounce: "ounces", pound: "pounds",
  gram: "grams",
};

const UNIT_NORMALIZE: Record<string, string> = {};
for (const [singular, plural] of Object.entries(PLURAL_UNITS)) {
  if (plural !== singular) {
    UNIT_NORMALIZE[plural] = singular;
  }
}
UNIT_NORMALIZE["lbs"] = "lb";
UNIT_NORMALIZE["tbsps"] = "tbsp";
UNIT_NORMALIZE["tsps"] = "tsp";

// ---------------------------------------------------------------------------
// Irregular plurals (mirrors _IRREGULAR_PLURALS)
// ---------------------------------------------------------------------------

const IRREGULAR_PLURALS: Record<string, string> = {
  leaves: "leaf", halves: "half", loaves: "loaf",
  calves: "calf", shelves: "shelf", knives: "knife",
};

// ---------------------------------------------------------------------------
// Unicode fractions (mirrors _UNICODE_FRACTIONS)
// ---------------------------------------------------------------------------

const UNICODE_FRACTIONS: Record<string, number> = {
  "\u00BD": 0.5,          // ½
  "\u2153": 1 / 3,        // ⅓
  "\u2154": 2 / 3,        // ⅔
  "\u00BC": 0.25,         // ¼
  "\u00BE": 0.75,         // ¾
  "\u215B": 0.125,        // ⅛
  "\u215C": 0.375,        // ⅜
  "\u215D": 0.625,        // ⅝
  "\u215E": 0.875,        // ⅞
  "\u2155": 0.2,          // ⅕
  "\u2156": 0.4,          // ⅖
  "\u2157": 0.6,          // ⅗
  "\u2158": 0.8,          // ⅘
  "\u2159": 1 / 6,        // ⅙
  "\u215A": 5 / 6,        // ⅚
};

// ---------------------------------------------------------------------------
// Strip words and skip ingredients (mirrors _STRIP_WORDS, _SKIP_INGREDIENTS)
// ---------------------------------------------------------------------------

const STRIP_WORDS: Set<string> = new Set([
  "large", "medium", "small", "extra-large", "thin", "thick",
  "diced", "chopped", "minced", "sliced", "shredded", "grated",
  "crushed", "ground", "mashed", "julienned", "cubed", "halved",
  "quartered", "torn", "peeled", "trimmed", "deveined", "deboned",
  "softened", "melted", "divided", "packed", "sifted",
  "beaten", "whisked", "scrambled",
  "rinsed", "drained", "strained", "wrung",
  "undrained", "unpeeled", "uncooked", "unskinned", "untrimmed",
  "pitted", "seeded", "cored", "deseeded", "stemmed",
  "toasted", "roasted", "blanched", "steamed",
  "warmed", "cooled", "chilled",
  "squeezed", "juiced", "zested", "pressed",
  "zest",
  "removed", "excess", "liquid", "casing", "casings",
  "cut", "split", "cleaned", "washed", "patted", "dry",
  "finely", "roughly", "thinly", "firmly", "gently", "well", "freshly",
  "lightly", "coarsely", "loosely", "tightly",
  "end", "ends", "stem", "stems", "top", "tops", "tip", "tips",
  "each",
  "fresh", "frozen", "dried", "canned", "cooked", "raw", "ripe",
  "warm", "cold", "hot", "room-temperature", "thawed",
  "boneless", "skinless", "bone-in", "skin-on",
  "optional", "about", "approximately",
  "unsalted", "salted", "unsweetened", "sweetened",
  "of", "into", "for", "the", "and", "or", "with",
]);

const SKIP_INGREDIENTS: Set<string> = new Set([
  "water", "ice", "ice cube", "ice water", "boiling water", "warm water",
  "cold water", "hot water", "tap water",
  "salt pepper", "cooking spray", "nonstick spray",
]);

// ---------------------------------------------------------------------------
// Trailing phrases regex (mirrors _TRAILING_PHRASES)
// ---------------------------------------------------------------------------

const TRAILING_PHRASES = new RegExp(
  ",?\\s*\\b(to taste|divided|or more|or to taste|" +
  "as needed|plus more|at room temperature|room temperature|" +
  "cut into|sliced into|torn into|broken into|" +
  "such as|preferably|if available|store-bought|" +
  "for \\w+|like \\w+)\\b.*$",
  "i",
);

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function singularizeWord(word: string): string {
  if (IRREGULAR_PLURALS[word]) {
    return IRREGULAR_PLURALS[word];
  }
  if (word.length <= 3) {
    return word;
  }
  if (word.endsWith("ies")) {
    return word.slice(0, -3) + "y";
  }
  if (word.endsWith("oes")) {
    return word.slice(0, -2);
  }
  if (word.endsWith("ches") || word.endsWith("shes")) {
    return word.slice(0, -2);
  }
  if (word.endsWith("ses")) {
    return word.slice(0, -2);
  }
  if (word.endsWith("s") && !word.endsWith("ss") && !word.endsWith("us")) {
    return word.slice(0, -1);
  }
  return word;
}

function categorizeIngredient(name: string): string {
  const nameLower = name.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (nameLower.includes(keyword)) {
        return category;
      }
    }
  }
  return "other";
}

function parseQuantityStr(qtyStr: string): number {
  const trimmed = qtyStr.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length === 2 && parts[1].includes("/")) {
    const whole = parseFloat(parts[0]);
    const [num, denom] = parts[1].split("/");
    return whole + parseFloat(num) / parseFloat(denom);
  }
  if (trimmed.includes("/")) {
    const [num, denom] = trimmed.split("/");
    return parseFloat(num) / parseFloat(denom);
  }
  const val = parseFloat(trimmed);
  return isNaN(val) ? 0.0 : val;
}

function formatQuantity(qty: number, unit: string): string {
  if (qty <= 0) {
    return "";
  }
  let display: string;
  if (qty % 1 === 0) {
    display = String(Math.round(qty));
  } else {
    // Format to 1 decimal, strip trailing zero and dot
    display = qty.toFixed(1).replace(/0$/, "").replace(/\.$/, "");
  }
  if (!unit) {
    return `\u00D7${display}`;
  }
  const label = qty > 1 ? (PLURAL_UNITS[unit] || unit) : unit;
  return `${display} ${label}`;
}

// ---------------------------------------------------------------------------
// Exported functions
// ---------------------------------------------------------------------------

/**
 * Normalize an ingredient name: strip parentheticals, trailing phrases,
 * prep words, numbers, and singularize each word.
 */
export function normalizeName(name: string): string {
  // Remove parentheticals
  name = name.replace(/\(.*?\)/g, "");
  // Remove trailing phrases
  name = name.replace(TRAILING_PHRASES, "");
  // Trim at first comma
  const commaIdx = name.indexOf(",");
  if (commaIdx > 0) {
    name = name.slice(0, commaIdx);
  }
  // Remove trailing punctuation
  name = name.replace(/[\-\u2013\u2014./:;]+\s*$/, "");
  // Remove embedded measurements like "8 oz" or "2 cups"
  name = name.replace(
    /\b\d+\.?\d*\s*(ounces?|oz|cups?|tbsp|tsp|tablespoons?|teaspoons?|lbs?|pounds?|grams?|g|kg|ml|liters?)\b\.?/g,
    "",
  );

  let words = name.toLowerCase().split(/\s+/);
  // Drop leading conjunctions
  while (words.length > 0 && ["and", "or", "then", "plus"].includes(words[0])) {
    words.shift();
  }
  // Filter strip words
  words = words.filter((w) => !STRIP_WORDS.has(w));
  // Filter bare numbers
  words = words.filter((w) => !/^\d+\.?\d*$/.test(w));
  // Singularize
  words = words.map(singularizeWord);

  const result = words.join(" ").trim();
  if (result.length <= 1) {
    return "";
  }
  return result;
}

/**
 * Parse a raw ingredient string into a structured object with
 * quantity, unit, name, and category.
 */
export function parseIngredient(raw: string): ParsedIngredient {
  raw = raw.trim();
  if (!raw) {
    return { name: "", quantity: 0.0, unit: "", category: "other" };
  }

  // Remove parentheticals
  const text = raw.replace(/\(.*?\)/g, "").trim();
  let quantity = 0.0;
  let unit = "";
  let remainder = text;

  // Try mixed number: "1 1/2"
  const mixedMatch = remainder.match(/^(\d+)\s+(\d+\/\d+)\s*/);
  if (mixedMatch) {
    quantity = parseFloat(mixedMatch[1]) + parseQuantityStr(mixedMatch[2]);
    remainder = remainder.slice(mixedMatch[0].length);
  } else {
    // Try fraction: "1/2"
    const fracMatch = remainder.match(/^(\d+\/\d+)\s*/);
    if (fracMatch) {
      quantity = parseQuantityStr(fracMatch[1]);
      remainder = remainder.slice(fracMatch[0].length);
    } else {
      // Try decimal / integer
      const qtyMatch = remainder.match(/^(\d+\.?\d*)\s*/);
      if (qtyMatch) {
        quantity = parseFloat(qtyMatch[1]);
        remainder = remainder.slice(qtyMatch[0].length);
        // Check for trailing unicode fraction
        for (const [fracChar, fracVal] of Object.entries(UNICODE_FRACTIONS)) {
          if (remainder.startsWith(fracChar)) {
            quantity += fracVal;
            remainder = remainder.slice(fracChar.length).replace(/^\s+/, "");
            break;
          }
        }
      } else {
        // Check for leading unicode fraction with no preceding number
        for (const [fracChar, fracVal] of Object.entries(UNICODE_FRACTIONS)) {
          if (remainder.startsWith(fracChar)) {
            quantity = fracVal;
            remainder = remainder.slice(fracChar.length).replace(/^\s+/, "");
            break;
          }
        }
      }
    }
  }

  // Try to match a unit
  const unitPattern =
    /^(cups?|tbsp?|tsp?|oz|ounces?|lbs?|pounds?|g|grams?|kg|ml|liters?|cloves?|cans?|bunch(?:es)?|pinch|dash|slices?|pieces?|tablespoons?|teaspoons?|stalks?|heads?|sprigs?)\.?(?=\s|$)/i;
  const unitMatch = remainder.match(unitPattern);
  if (unitMatch) {
    unit = unitMatch[1].toLowerCase();
    unit = UNIT_NORMALIZE[unit] || unit;
    remainder = remainder.slice(unitMatch[0].length).replace(/^\s+/, "");
    if (remainder.toLowerCase().startsWith("of ")) {
      remainder = remainder.slice(3).trim();
    }
  }

  const name = remainder.trim() || raw;
  const category = categorizeIngredient(name);
  if (quantity === 0.0) {
    quantity = 1.0;
  }
  return { name, quantity, unit, category };
}

/**
 * Generate a shopping list from a meal plan and its associated recipes.
 *
 * `planData` maps day names to slot-recipe mappings, e.g.:
 * ```
 * {
 *   "Monday": { "breakfast": "recipe-id-1", "lunch": "recipe-id-2" },
 *   "Tuesday": { "dinner": null }
 * }
 * ```
 *
 * `recipes` maps recipe IDs (string) to Recipe objects.
 */
export function generateShoppingList(
  planData: Record<string, Record<string, string | null>>,
  recipes: Record<string, Recipe>,
): ShoppingItemData[] {
  const scaledIngredients: Array<[string, number]> = [];

  for (const dayName of Object.keys(planData)) {
    const slots = planData[dayName];
    for (const slot of Object.keys(slots)) {
      const recipeId = slots[slot];
      if (recipeId == null) {
        continue;
      }
      const recipe = recipes[recipeId] || recipes[String(recipeId)];
      if (!recipe) {
        continue;
      }
      const ingredients = recipe.ingredients || [];
      const servings = recipe.servings || 1;
      const scale = 1.0 / servings;
      if (Array.isArray(ingredients)) {
        for (const ing of ingredients) {
          scaledIngredients.push([ing, scale]);
        }
      }
    }
  }

  const aggregated: Record<string, { quantity: number; unit: string; category: string }> = {};

  for (const [ingredientStr, scale] of scaledIngredients) {
    const parsed = parseIngredient(ingredientStr);
    const key = normalizeName(parsed.name);
    if (key && !SKIP_INGREDIENTS.has(key)) {
      if (!aggregated[key]) {
        aggregated[key] = { quantity: 0.0, unit: "", category: "other" };
      }
      const existing = aggregated[key];
      existing.quantity += parsed.quantity * scale;
      if (!existing.unit && parsed.unit) {
        existing.unit = parsed.unit;
      }
      if (existing.category === "other" && parsed.category !== "other") {
        existing.category = parsed.category;
      }
    }
  }

  const items: ShoppingItemData[] = [];
  const sortedKeys = Object.keys(aggregated).sort();
  for (const name of sortedKeys) {
    const data = aggregated[name];
    items.push({
      name,
      quantity: Math.round(data.quantity * 100) / 100,
      unit: data.unit,
      category: data.category,
    });
  }
  return items;
}

/**
 * Generate a clipboard-friendly text representation of a shopping list
 * grouped by category.
 */
export function generateClipboardText(items: ShoppingItemData[]): string {
  const byCategory: Record<string, ShoppingItemData[]> = {};
  for (const item of items) {
    const cat = item.category || "other";
    if (!byCategory[cat]) {
      byCategory[cat] = [];
    }
    byCategory[cat].push(item);
  }

  const lines: string[] = [];
  const sortedCategories = Object.keys(byCategory).sort();
  for (const category of sortedCategories) {
    lines.push(`\n--- ${category.toUpperCase()} ---`);
    for (const item of byCategory[category]) {
      const qtyDisplay = formatQuantity(item.quantity, item.unit);
      if (qtyDisplay) {
        lines.push(`[ ] ${item.name} \u2014 ${qtyDisplay}`);
      } else {
        lines.push(`[ ] ${item.name}`);
      }
    }
  }
  return lines.join("\n").trim();
}
