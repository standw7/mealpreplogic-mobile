import type { User } from "../types";

const API_BASE = "https://mealpreplogic-production.up.railway.app";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function authHeaders(token: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function handleError(res: Response, fallback: string): Promise<never> {
  const body = await res.json().catch(() => ({}));
  throw new Error(body.detail || fallback);
}

// ---------------------------------------------------------------------------
// Auth endpoints
// ---------------------------------------------------------------------------

/**
 * Authenticate with email + password.
 * POST /auth/login -> { access_token, token_type }
 */
export async function login(email: string, password: string): Promise<string> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    await handleError(res, "Login failed");
  }
  const data = await res.json();
  return data.access_token;
}

/**
 * Register a new account.
 * POST /auth/signup -> { access_token, token_type }
 */
export async function signup(
  email: string,
  password: string
): Promise<string> {
  const res = await fetch(`${API_BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    await handleError(res, "Signup failed");
  }
  const data = await res.json();
  return data.access_token;
}

/**
 * Fetch the currently authenticated user.
 * GET /auth/me -> User
 */
export async function fetchMe(token: string): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: authHeaders(token),
  });
  if (!res.ok) {
    await handleError(res, "Failed to fetch user info");
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Recipe sync endpoints
// ---------------------------------------------------------------------------

/**
 * Fetch all recipes for the authenticated user.
 * GET /recipes/ with optional ?category and ?source query params.
 *
 * The `updatedSince` parameter is reserved for future delta-sync but the
 * current backend does not support it yet, so it is accepted but unused.
 */
export async function fetchServerRecipes(
  token: string,
  _updatedSince?: string
): Promise<any[]> {
  const res = await fetch(`${API_BASE}/recipes/`, {
    headers: authHeaders(token),
  });
  if (!res.ok) {
    await handleError(res, "Failed to fetch recipes");
  }
  return res.json();
}

/**
 * Create or update a recipe on the server.
 *
 * If `recipe.id` looks like a server-side integer ID the recipe is updated
 * via PUT /recipes/{id}; otherwise a new recipe is created via POST /recipes/.
 */
export async function pushRecipeToServer(
  token: string,
  recipe: any
): Promise<any> {
  // Server IDs are integers (possibly stringified). Local UUIDs contain dashes.
  const isServerRecipe =
    recipe.id && !String(recipe.id).includes("-") && Number.isFinite(Number(recipe.id));

  const url = isServerRecipe
    ? `${API_BASE}/recipes/${recipe.id}`
    : `${API_BASE}/recipes/`;
  const method = isServerRecipe ? "PUT" : "POST";

  // Map local camelCase fields to the server's expected snake_case schema.
  const body: Record<string, any> = {
    name: recipe.name,
    category: recipe.category,
    calories: recipe.calories ?? 0,
    protein: recipe.protein ?? 0,
    fat: recipe.fat ?? 0,
    carbohydrates: recipe.carbs ?? 0,
    fiber: recipe.fiber ?? 0,
    ingredients: recipe.ingredients ?? [],
    instructions: recipe.instructions ?? null,
    image_url: recipe.imageUrl ?? null,
    source: recipe.source ?? "manual",
    source_url: recipe.sourceUrl ?? null,
    rating: recipe.rating ?? null,
    frequency_limit: recipe.frequency ?? 3,
    servings: recipe.servings ?? 1,
  };

  const res = await fetch(url, {
    method,
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    await handleError(res, "Failed to push recipe");
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Plan sync endpoints
// ---------------------------------------------------------------------------

/**
 * Fetch all meal plans for the authenticated user.
 * GET /plans/
 */
export async function fetchServerPlans(token: string): Promise<any[]> {
  const res = await fetch(`${API_BASE}/plans/`, {
    headers: authHeaders(token),
  });
  if (!res.ok) {
    await handleError(res, "Failed to fetch plans");
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Preferences
// ---------------------------------------------------------------------------

/**
 * Fetch the user's saved macro/preference settings.
 * GET /auth/preferences
 */
export async function fetchServerPreferences(
  token: string
): Promise<any> {
  const res = await fetch(`${API_BASE}/auth/preferences`, {
    headers: authHeaders(token),
  });
  if (!res.ok) {
    await handleError(res, "Failed to fetch preferences");
  }
  return res.json();
}

/**
 * Save preferences to the server.
 * PUT /auth/preferences
 */
export async function pushPreferences(
  token: string,
  preferences: any
): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/preferences`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify({ preferences }),
  });
  if (!res.ok) {
    await handleError(res, "Failed to save preferences");
  }
}
