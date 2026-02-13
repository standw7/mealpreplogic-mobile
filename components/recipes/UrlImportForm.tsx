import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Link, CheckCircle, AlertCircle, WifiOff } from "lucide-react-native";
import type { Recipe, RecipeCategory } from "../../lib/types";
import { autoCategorize } from "../../lib/utils/categorizer";
import { useIsOnline } from "../../lib/utils/network";
import { Colors } from "../../constants/colors";

const API_BASE = "https://mealpreplogic-production.up.railway.app";

interface UrlImportFormProps {
  onImported: (recipe: Partial<Recipe>) => void;
}

interface ScrapedRecipe {
  name?: string;
  category?: RecipeCategory;
  calories?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
  fiber?: number;
  ingredients?: string[];
  instructions?: string;
  imageUrl?: string;
  image_url?: string;
  servings?: number;
  source_url?: string;
  sourceUrl?: string;
}

export default function UrlImportForm({ onImported }: UrlImportFormProps) {
  const isOnline = useIsOnline();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Partial<Recipe> | null>(null);

  const handleImport = async () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;

    // Basic URL validation
    if (!trimmedUrl.startsWith("http://") && !trimmedUrl.startsWith("https://")) {
      setError("Please enter a valid URL starting with http:// or https://");
      return;
    }

    setLoading(true);
    setError(null);
    setPreview(null);

    try {
      const response = await fetch(
        `${API_BASE}/recipes/scrape?category=auto`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: trimmedUrl }),
        }
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Server error (${response.status})`);
      }

      const data: ScrapedRecipe = await response.json();

      // Normalize the scraped recipe data
      const recipe: Partial<Recipe> = {
        name: data.name ?? "Imported Recipe",
        category:
          data.category ??
          autoCategorize(data.name ?? null, data.ingredients),
        calories: data.calories ?? 0,
        protein: data.protein ?? 0,
        fat: data.fat ?? 0,
        carbs: data.carbs ?? 0,
        fiber: data.fiber ?? 0,
        ingredients: data.ingredients ?? [],
        instructions: data.instructions ?? undefined,
        imageUrl: data.imageUrl ?? data.image_url ?? undefined,
        servings: data.servings ?? 1,
        sourceUrl: data.sourceUrl ?? data.source_url ?? trimmedUrl,
        source: "web",
      };

      setPreview(recipe);
    } catch (err: any) {
      if (
        err.message?.includes("Network request failed") ||
        err.message?.includes("TypeError")
      ) {
        setError("URL import requires internet connection.");
      } else {
        setError(err.message || "Failed to import recipe from URL.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (preview) {
      onImported(preview);
    }
  };

  const handleClear = () => {
    setUrl("");
    setError(null);
    setPreview(null);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.iconHeader}>
        <Link size={48} color={Colors.primary} strokeWidth={1.5} />
        <Text style={styles.headerTitle}>Import from URL</Text>
        <Text style={styles.headerSubtitle}>
          Paste a recipe URL and we will extract the details automatically.
        </Text>
      </View>

      {/* Offline banner */}
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <WifiOff size={16} color="#ffffff" />
          <Text style={styles.offlineBannerText}>
            URL import requires internet connection.
          </Text>
        </View>
      )}

      {/* URL input */}
      <Text style={styles.label}>Recipe URL</Text>
      <TextInput
        style={styles.input}
        value={url}
        onChangeText={(text) => {
          setUrl(text);
          if (error) setError(null);
        }}
        placeholder="https://www.example.com/recipe/..."
        placeholderTextColor={Colors.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        editable={!loading}
      />

      {/* Import button */}
      <TouchableOpacity
        style={[
          styles.importButton,
          (!url.trim() || loading || !isOnline) && styles.buttonDisabled,
        ]}
        onPress={handleImport}
        disabled={!url.trim() || loading || !isOnline}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : (
          <Text style={styles.importButtonText}>Import Recipe</Text>
        )}
      </TouchableOpacity>

      {/* Loading state */}
      {loading && (
        <View style={styles.statusBox}>
          <ActivityIndicator
            size="small"
            color={Colors.primary}
            style={styles.statusIcon}
          />
          <Text style={styles.statusText}>
            Scraping recipe data... This may take a moment.
          </Text>
        </View>
      )}

      {/* Error */}
      {error && (
        <View style={[styles.statusBox, styles.errorBox]}>
          <AlertCircle
            size={20}
            color={Colors.error}
            style={styles.statusIcon}
          />
          <Text style={[styles.statusText, styles.errorText]}>{error}</Text>
        </View>
      )}

      {/* Preview */}
      {preview && (
        <View style={styles.previewCard}>
          <View style={styles.previewHeader}>
            <CheckCircle size={20} color={Colors.success} />
            <Text style={styles.previewTitle}>Recipe Found</Text>
          </View>

          <Text style={styles.previewName}>{preview.name}</Text>

          <View style={styles.previewMeta}>
            <View style={styles.previewBadge}>
              <Text style={styles.previewBadgeText}>
                {preview.category
                  ? preview.category.charAt(0).toUpperCase() +
                    preview.category.slice(1)
                  : "Dinner"}
              </Text>
            </View>
            <Text style={styles.previewCalories}>
              {preview.calories ?? 0} cal
            </Text>
          </View>

          <View style={styles.previewMacros}>
            <Text style={styles.previewMacroItem}>
              P: {preview.protein ?? 0}g
            </Text>
            <Text style={styles.previewMacroItem}>
              F: {preview.fat ?? 0}g
            </Text>
            <Text style={styles.previewMacroItem}>
              C: {preview.carbs ?? 0}g
            </Text>
          </View>

          {preview.ingredients && preview.ingredients.length > 0 && (
            <Text style={styles.previewIngredientCount}>
              {preview.ingredients.length} ingredient
              {preview.ingredients.length !== 1 ? "s" : ""} found
            </Text>
          )}

          <View style={styles.previewActions}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              activeOpacity={0.8}
            >
              <Text style={styles.saveButtonText}>Save Recipe</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClear}
              activeOpacity={0.7}
            >
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  iconHeader: {
    alignItems: "center",
    marginTop: 12,
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
    marginTop: 12,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#d97706",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  offlineBannerText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 6,
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
  importButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    minHeight: 48,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  importButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  statusBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 10,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  errorBox: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
  },
  statusIcon: {
    marginRight: 10,
  },
  statusText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  errorText: {
    color: Colors.error,
  },
  previewCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.success,
  },
  previewName: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 8,
  },
  previewMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  previewBadge: {
    backgroundColor: Colors.primary + "20",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  previewBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primary,
  },
  previewCalories: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  previewMacros: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 8,
  },
  previewMacroItem: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  previewIngredientCount: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  previewActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  saveButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  clearButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: "center",
  },
  clearButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
});
