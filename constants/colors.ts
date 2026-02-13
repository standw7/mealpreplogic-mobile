export const Colors = {
  // Brand
  primary: "#FF7D2D",
  primaryLight: "#FFF1E6",
  primaryHover: "#E5651F",

  // Surfaces
  background: "#ffffff",
  backgroundAlt: "#FAFAFA",
  card: "#ffffff",

  // Text
  text: "#111827",
  textSecondary: "#6b7280",
  textMuted: "#9CA3AF",

  // Borders
  border: "#e5e7eb",

  // Feedback
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
};

/**
 * Category colors matching the website design.
 * Each category has a main color and a light background variant.
 */
export const CategoryColors: Record<
  string,
  { main: string; bg: string; text: string }
> = {
  breakfast: { main: "#f59e0b", bg: "#fffbeb", text: "#b45309" },
  lunch: { main: "#3b82f6", bg: "#eff6ff", text: "#1d4ed8" },
  dinner: { main: "#8b5cf6", bg: "#f5f3ff", text: "#6d28d9" },
  snack: { main: "#14b8a6", bg: "#f0fdfa", text: "#0f766e" },
  dessert: { main: "#ec4899", bg: "#fdf2f8", text: "#be185d" },
};
