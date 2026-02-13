import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import {
  List,
  CheckCircle,
  XCircle,
  Loader,
  Clock,
  WifiOff,
} from "lucide-react-native";
import type { Recipe, RecipeCategory } from "../../lib/types";
import { autoCategorize } from "../../lib/utils/categorizer";
import { useIsOnline } from "../../lib/utils/network";
import { Colors } from "../../constants/colors";

const API_BASE = "https://macronotion-production.up.railway.app";

const URL_REGEX = /https?:\/\/[^\s,]+/g;

type UrlStatus = "pending" | "loading" | "done" | "error";

interface UrlResult {
  url: string;
  status: UrlStatus;
  recipe?: Partial<Recipe>;
  error?: string;
}

interface BulkUrlImportFormProps {
  onImported: (recipes: Partial<Recipe>[]) => void;
}

export default function BulkUrlImportForm({
  onImported,
}: BulkUrlImportFormProps) {
  const isOnline = useIsOnline();
  const [text, setText] = useState("");
  const [results, setResults] = useState<UrlResult[]>([]);
  const [importing, setImporting] = useState(false);
  const cancelRef = useRef(false);

  const extractUrls = (input: string): string[] => {
    const matches = input.match(URL_REGEX);
    if (!matches) return [];
    // Deduplicate
    return [...new Set(matches)];
  };

  const urlCount = extractUrls(text).length;

  const scrapeUrl = async (url: string): Promise<Partial<Recipe>> => {
    const response = await fetch(
      `${API_BASE}/recipes/scrape?category=auto`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Server error (${response.status})`);
    }

    const data = await response.json();

    return {
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
      sourceUrl: data.sourceUrl ?? data.source_url ?? url,
      source: "web",
    };
  };

  const handleImportAll = async () => {
    const urls = extractUrls(text);
    if (urls.length === 0) return;

    cancelRef.current = false;
    setImporting(true);

    // Initialize results
    const initial: UrlResult[] = urls.map((url) => ({
      url,
      status: "pending",
    }));
    setResults(initial);

    // Process sequentially to avoid rate limiting
    const updatedResults: UrlResult[] = [...initial];

    for (let i = 0; i < urls.length; i++) {
      if (cancelRef.current) break;

      // Mark current as loading
      updatedResults[i] = { ...updatedResults[i], status: "loading" };
      setResults([...updatedResults]);

      try {
        const recipe = await scrapeUrl(urls[i]);
        updatedResults[i] = {
          ...updatedResults[i],
          status: "done",
          recipe,
        };
      } catch (err: any) {
        updatedResults[i] = {
          ...updatedResults[i],
          status: "error",
          error: err.message || "Import failed",
        };
      }

      setResults([...updatedResults]);
    }

    setImporting(false);
  };

  const handleCancel = () => {
    cancelRef.current = true;
  };

  const successfulResults = results.filter(
    (r) => r.status === "done" && r.recipe
  );
  const hasResults = results.length > 0;
  const allDone = hasResults && results.every((r) => r.status === "done" || r.status === "error");

  const handleSaveAll = () => {
    const recipes = successfulResults
      .map((r) => r.recipe!)
      .filter(Boolean);
    if (recipes.length > 0) {
      onImported(recipes);
    }
  };

  const handleClear = () => {
    setText("");
    setResults([]);
    cancelRef.current = false;
  };

  const getStatusIcon = (status: UrlStatus) => {
    switch (status) {
      case "pending":
        return <Clock size={16} color={Colors.textSecondary} />;
      case "loading":
        return <ActivityIndicator size="small" color={Colors.primary} />;
      case "done":
        return <CheckCircle size={16} color={Colors.success} />;
      case "error":
        return <XCircle size={16} color={Colors.error} />;
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.iconHeader}>
        <List size={48} color={Colors.primary} strokeWidth={1.5} />
        <Text style={styles.headerTitle}>Bulk Import</Text>
        <Text style={styles.headerSubtitle}>
          Paste multiple recipe URLs (one per line) to import them all at once.
        </Text>
      </View>

      {/* Offline banner */}
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <WifiOff size={16} color="#ffffff" />
          <Text style={styles.offlineBannerText}>
            Bulk import requires internet connection.
          </Text>
        </View>
      )}

      {/* URL input */}
      <Text style={styles.label}>Recipe URLs</Text>
      <Text style={styles.hint}>Paste one URL per line, or a list of URLs</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={text}
        onChangeText={(val) => {
          setText(val);
          if (results.length > 0 && !importing) {
            setResults([]);
          }
        }}
        placeholder={
          "https://www.example.com/recipe-1\nhttps://www.example.com/recipe-2\nhttps://www.example.com/recipe-3"
        }
        placeholderTextColor={Colors.textSecondary}
        multiline
        numberOfLines={8}
        textAlignVertical="top"
        editable={!importing}
      />

      {urlCount > 0 && (
        <Text style={styles.urlCount}>
          {urlCount} URL{urlCount !== 1 ? "s" : ""} detected
        </Text>
      )}

      {/* Import button */}
      {!importing ? (
        <TouchableOpacity
          style={[
            styles.importButton,
            (urlCount === 0 || !isOnline) && styles.buttonDisabled,
          ]}
          onPress={handleImportAll}
          disabled={urlCount === 0 || !isOnline}
          activeOpacity={0.8}
        >
          <Text style={styles.importButtonText}>
            Import All ({urlCount})
          </Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.importButton, styles.cancelButton]}
          onPress={handleCancel}
          activeOpacity={0.8}
        >
          <Text style={styles.importButtonText}>Cancel</Text>
        </TouchableOpacity>
      )}

      {/* Progress */}
      {hasResults && (
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Import Progress</Text>
            <Text style={styles.progressCount}>
              {successfulResults.length} / {results.length} successful
            </Text>
          </View>

          {results.map((result, index) => (
            <View key={index} style={styles.resultRow}>
              <View style={styles.resultIcon}>
                {getStatusIcon(result.status)}
              </View>
              <View style={styles.resultContent}>
                {result.status === "done" && result.recipe ? (
                  <Text style={styles.resultName} numberOfLines={1}>
                    {result.recipe.name}
                  </Text>
                ) : (
                  <Text
                    style={styles.resultUrl}
                    numberOfLines={1}
                    ellipsizeMode="middle"
                  >
                    {result.url}
                  </Text>
                )}
                {result.status === "done" && result.recipe && (
                  <Text style={styles.resultMeta}>
                    {result.recipe.calories} cal | {result.recipe.category}
                  </Text>
                )}
                {result.status === "error" && (
                  <Text style={styles.resultError} numberOfLines={1}>
                    {result.error}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Save All / Clear */}
      {allDone && successfulResults.length > 0 && (
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={styles.saveAllButton}
            onPress={handleSaveAll}
            activeOpacity={0.8}
          >
            <Text style={styles.saveAllButtonText}>
              Save {successfulResults.length} Recipe
              {successfulResults.length !== 1 ? "s" : ""}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClear}
            activeOpacity={0.7}
          >
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
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
    minHeight: 140,
    paddingTop: 12,
  },
  urlCount: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: "600",
    marginTop: 8,
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
  cancelButton: {
    backgroundColor: Colors.textSecondary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  importButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  progressSection: {
    marginTop: 20,
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text,
  },
  progressCount: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  resultIcon: {
    width: 28,
    alignItems: "center",
  },
  resultContent: {
    flex: 1,
    marginLeft: 8,
  },
  resultName: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  resultUrl: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  resultMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  resultError: {
    fontSize: 12,
    color: Colors.error,
    marginTop: 2,
  },
  bottomActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  saveAllButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  saveAllButtonText: {
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
