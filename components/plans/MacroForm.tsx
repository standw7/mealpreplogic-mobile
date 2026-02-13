import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Switch,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { ChevronUp, ChevronDown, Play } from "lucide-react-native";

import { useDatabase } from "../../lib/db/provider";
import { getPreferences, savePreferences } from "../../lib/db/preferences";
import type { MacroTargets } from "../../lib/types";
import { Colors } from "../../constants/colors";

const DEFAULT_TARGETS: MacroTargets = {
  calories: { enabled: true, value: 2000 },
  protein: { enabled: true, value: 150 },
  fat: { enabled: true, value: 65 },
  carbs: { enabled: true, value: 250 },
  fiber: { enabled: false, value: 30 },
  defaultFrequency: 3,
  numDays: 6,
  includeSnacks: false,
  combineLunchDinner: false,
  preferSimilarIngredients: false,
  selectedSlots: ["breakfast", "lunch", "dinner"],
  priorityOrder: ["calories", "protein", "fat", "carbs", "fiber"],
};

const MACRO_LABELS: Record<string, string> = {
  calories: "Calories",
  protein: "Protein (g)",
  fat: "Fat (g)",
  carbs: "Carbs (g)",
  fiber: "Fiber (g)",
};

interface MacroFormProps {
  onGenerate: (targets: MacroTargets) => void;
  generating: boolean;
}

export default function MacroForm({ onGenerate, generating }: MacroFormProps) {
  const db = useDatabase();
  const [targets, setTargets] = useState<MacroTargets>(DEFAULT_TARGETS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const prefs = await getPreferences(db);
        if (prefs) {
          setTargets(prefs);
        }
      } catch (e) {
        console.warn("Failed to load preferences:", e);
      } finally {
        setLoaded(true);
      }
    }
    load();
  }, [db]);

  const updateAndSave = useCallback(
    (updater: (prev: MacroTargets) => MacroTargets) => {
      setTargets((prev) => {
        const next = updater(prev);
        savePreferences(db, next).catch((e) =>
          console.warn("Failed to save preferences:", e)
        );
        return next;
      });
    },
    [db]
  );

  const setMacroEnabled = useCallback(
    (macro: string, enabled: boolean) => {
      updateAndSave((prev) => ({
        ...prev,
        [macro]: { ...(prev as any)[macro], enabled },
      }));
    },
    [updateAndSave]
  );

  const setMacroValue = useCallback(
    (macro: string, text: string) => {
      const value = parseInt(text, 10) || 0;
      updateAndSave((prev) => ({
        ...prev,
        [macro]: { ...(prev as any)[macro], value },
      }));
    },
    [updateAndSave]
  );

  const movePriority = useCallback(
    (index: number, direction: -1 | 1) => {
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= targets.priorityOrder.length) return;
      updateAndSave((prev) => {
        const order = [...prev.priorityOrder];
        [order[index], order[newIndex]] = [order[newIndex], order[index]];
        return { ...prev, priorityOrder: order };
      });
    },
    [targets.priorityOrder.length, updateAndSave]
  );

  if (!loaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const macroKeys = ["calories", "protein", "fat", "carbs", "fiber"] as const;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Macro Targets Section */}
      <Text style={styles.sectionTitle}>Macro Targets</Text>
      <View style={styles.card}>
        {macroKeys.map((macro) => {
          const target = targets[macro];
          return (
            <View key={macro} style={styles.macroRow}>
              <Switch
                value={target.enabled}
                onValueChange={(val) => setMacroEnabled(macro, val)}
                trackColor={{ false: Colors.border, true: Colors.primary + "60" }}
                thumbColor={target.enabled ? Colors.primary : "#f4f3f4"}
              />
              <Text
                style={[
                  styles.macroLabel,
                  !target.enabled && styles.macroLabelDisabled,
                ]}
              >
                {MACRO_LABELS[macro]}
              </Text>
              <TextInput
                style={[
                  styles.macroInput,
                  !target.enabled && styles.macroInputDisabled,
                ]}
                value={String(target.value)}
                onChangeText={(text) => setMacroValue(macro, text)}
                keyboardType="numeric"
                editable={target.enabled}
                selectTextOnFocus
              />
            </View>
          );
        })}
      </View>

      {/* Plan Settings Section */}
      <Text style={styles.sectionTitle}>Plan Settings</Text>
      <View style={styles.card}>
        {/* Number of Days */}
        <Text style={styles.settingLabel}>Number of Days</Text>
        <View style={styles.buttonRow}>
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <TouchableOpacity
              key={n}
              style={[
                styles.dayButton,
                targets.numDays === n && styles.dayButtonActive,
              ]}
              onPress={() => updateAndSave((prev) => ({ ...prev, numDays: n }))}
            >
              <Text
                style={[
                  styles.dayButtonText,
                  targets.numDays === n && styles.dayButtonTextActive,
                ]}
              >
                {n}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Default Frequency */}
        <Text style={styles.settingLabel}>Default Frequency</Text>
        <View style={styles.buttonRow}>
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <TouchableOpacity
              key={n}
              style={[
                styles.dayButton,
                targets.defaultFrequency === n && styles.dayButtonActive,
              ]}
              onPress={() =>
                updateAndSave((prev) => ({ ...prev, defaultFrequency: n }))
              }
            >
              <Text
                style={[
                  styles.dayButtonText,
                  targets.defaultFrequency === n && styles.dayButtonTextActive,
                ]}
              >
                {n}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Toggle settings */}
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Include Snacks</Text>
          <Switch
            value={targets.includeSnacks}
            onValueChange={(val) =>
              updateAndSave((prev) => ({ ...prev, includeSnacks: val }))
            }
            trackColor={{ false: Colors.border, true: Colors.primary + "60" }}
            thumbColor={targets.includeSnacks ? Colors.primary : "#f4f3f4"}
          />
        </View>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Combine Lunch/Dinner</Text>
          <Switch
            value={targets.combineLunchDinner}
            onValueChange={(val) =>
              updateAndSave((prev) => ({ ...prev, combineLunchDinner: val }))
            }
            trackColor={{ false: Colors.border, true: Colors.primary + "60" }}
            thumbColor={targets.combineLunchDinner ? Colors.primary : "#f4f3f4"}
          />
        </View>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Prefer Similar Ingredients</Text>
          <Switch
            value={targets.preferSimilarIngredients}
            onValueChange={(val) =>
              updateAndSave((prev) => ({
                ...prev,
                preferSimilarIngredients: val,
              }))
            }
            trackColor={{ false: Colors.border, true: Colors.primary + "60" }}
            thumbColor={
              targets.preferSimilarIngredients ? Colors.primary : "#f4f3f4"
            }
          />
        </View>
      </View>

      {/* Macro Priority Section */}
      <Text style={styles.sectionTitle}>Macro Priority</Text>
      <View style={styles.card}>
        {targets.priorityOrder.map((macro, index) => (
          <View key={macro} style={styles.priorityRow}>
            <Text style={styles.priorityNumber}>{index + 1}.</Text>
            <Text style={styles.priorityLabel}>
              {MACRO_LABELS[macro] || macro}
            </Text>
            <View style={styles.priorityArrows}>
              <TouchableOpacity
                onPress={() => movePriority(index, -1)}
                disabled={index === 0}
                style={[
                  styles.arrowButton,
                  index === 0 && styles.arrowButtonDisabled,
                ]}
              >
                <ChevronUp
                  size={18}
                  color={index === 0 ? Colors.border : Colors.text}
                  strokeWidth={2}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => movePriority(index, 1)}
                disabled={index === targets.priorityOrder.length - 1}
                style={[
                  styles.arrowButton,
                  index === targets.priorityOrder.length - 1 &&
                    styles.arrowButtonDisabled,
                ]}
              >
                <ChevronDown
                  size={18}
                  color={
                    index === targets.priorityOrder.length - 1
                      ? Colors.border
                      : Colors.text
                  }
                  strokeWidth={2}
                />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      {/* Generate Button */}
      <TouchableOpacity
        style={[styles.generateButton, generating && styles.generateButtonDisabled]}
        onPress={() => onGenerate(targets)}
        disabled={generating}
        activeOpacity={0.8}
      >
        {generating ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Play size={20} color="#ffffff" strokeWidth={2.5} />
        )}
        <Text style={styles.generateButtonText}>
          {generating ? "Generating..." : "Generate Plans"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 10,
    marginTop: 16,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  macroRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  macroLabel: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    marginLeft: 10,
  },
  macroLabelDisabled: {
    color: Colors.textSecondary,
    opacity: 0.5,
  },
  macroInput: {
    width: 80,
    height: 38,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 15,
    color: Colors.text,
    textAlign: "right",
    backgroundColor: "#ffffff",
  },
  macroInputDisabled: {
    opacity: 0.4,
    backgroundColor: Colors.card,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 8,
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: "row",
    marginBottom: 16,
    gap: 6,
  },
  dayButton: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  dayButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dayButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  dayButtonTextActive: {
    color: "#ffffff",
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  toggleLabel: {
    fontSize: 15,
    color: Colors.text,
    flex: 1,
  },
  priorityRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  priorityNumber: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.primary,
    width: 24,
  },
  priorityLabel: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  priorityArrows: {
    flexDirection: "row",
    gap: 4,
  },
  arrowButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  arrowButtonDisabled: {
    opacity: 0.4,
  },
  generateButton: {
    flexDirection: "row",
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
    gap: 8,
  },
  generateButtonDisabled: {
    opacity: 0.7,
  },
  generateButtonText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "700",
  },
});
