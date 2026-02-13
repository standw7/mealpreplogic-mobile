import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Colors } from "../../constants/colors";
import type { Recipe, SyncConflict } from "../../lib/types";

interface Resolution {
  type: string;
  id: string;
  keep: "local" | "server";
}

interface SyncConflictModalProps {
  conflicts: SyncConflict[];
  onResolve: (resolutions: Resolution[]) => void;
  visible: boolean;
}

export default function SyncConflictModal({
  conflicts,
  onResolve,
  visible,
}: SyncConflictModalProps) {
  const [resolutions, setResolutions] = useState<Map<string, "local" | "server">>(
    new Map()
  );

  const allResolved = resolutions.size === conflicts.length;

  function handleChoice(id: string, keep: "local" | "server") {
    setResolutions((prev) => {
      const next = new Map(prev);
      next.set(id, keep);
      return next;
    });
  }

  function handleDone() {
    const result: Resolution[] = conflicts.map((c) => {
      const recipe = c.localVersion as Recipe;
      return {
        type: c.type,
        id: recipe.id,
        keep: resolutions.get(recipe.id) || "server",
      };
    });
    setResolutions(new Map());
    onResolve(result);
  }

  function formatDiff(local: Recipe, server: Recipe): Array<{ label: string; localVal: string; serverVal: string }> {
    const diffs: Array<{ label: string; localVal: string; serverVal: string }> = [];

    if (local.name !== server.name) {
      diffs.push({ label: "Name", localVal: local.name, serverVal: server.name });
    }
    if (local.calories !== server.calories) {
      diffs.push({
        label: "Calories",
        localVal: String(local.calories),
        serverVal: String(server.calories),
      });
    }
    if (local.protein !== server.protein) {
      diffs.push({
        label: "Protein",
        localVal: `${local.protein}g`,
        serverVal: `${server.protein}g`,
      });
    }
    if (local.category !== server.category) {
      diffs.push({
        label: "Category",
        localVal: local.category,
        serverVal: server.category,
      });
    }
    if (local.rating !== server.rating) {
      diffs.push({
        label: "Rating",
        localVal: local.rating != null ? String(local.rating) : "-",
        serverVal: server.rating != null ? String(server.rating) : "-",
      });
    }
    if (local.servings !== server.servings) {
      diffs.push({
        label: "Servings",
        localVal: String(local.servings),
        serverVal: String(server.servings),
      });
    }

    // If no specific diffs detected, show a generic indicator
    if (diffs.length === 0) {
      diffs.push({
        label: "Updated",
        localVal: local.updatedAt ? new Date(local.updatedAt).toLocaleString() : "-",
        serverVal: server.updatedAt ? new Date(server.updatedAt).toLocaleString() : "-",
      });
    }

    return diffs;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => {}}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Sync Conflicts</Text>
        <Text style={styles.subtitle}>
          {conflicts.length} recipe{conflicts.length !== 1 ? "s" : ""} changed
          on both this device and the server. Choose which version to keep for
          each.
        </Text>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {conflicts.map((conflict, index) => {
            const local = conflict.localVersion as Recipe;
            const server = conflict.serverVersion as Recipe;
            const choice = resolutions.get(local.id);
            const diffs = formatDiff(local, server);

            return (
              <View key={local.id} style={styles.card}>
                <Text style={styles.cardTitle}>
                  {index + 1}. {local.name}
                </Text>

                {/* Diff table */}
                <View style={styles.diffTable}>
                  <View style={styles.diffHeader}>
                    <Text style={[styles.diffHeaderCell, styles.diffLabel]} />
                    <Text style={styles.diffHeaderCell}>Local</Text>
                    <Text style={styles.diffHeaderCell}>Server</Text>
                  </View>
                  {diffs.map((d) => (
                    <View key={d.label} style={styles.diffRow}>
                      <Text style={[styles.diffCell, styles.diffLabel]}>
                        {d.label}
                      </Text>
                      <Text
                        style={[
                          styles.diffCell,
                          choice === "local" && styles.diffCellSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {d.localVal}
                      </Text>
                      <Text
                        style={[
                          styles.diffCell,
                          choice === "server" && styles.diffCellSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {d.serverVal}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Choice buttons */}
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[
                      styles.choiceButton,
                      choice === "local" && styles.choiceButtonActive,
                    ]}
                    onPress={() => handleChoice(local.id, "local")}
                  >
                    <Text
                      style={[
                        styles.choiceButtonText,
                        choice === "local" && styles.choiceButtonTextActive,
                      ]}
                    >
                      Keep Local
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.choiceButton,
                      choice === "server" && styles.choiceButtonActive,
                    ]}
                    onPress={() => handleChoice(local.id, "server")}
                  >
                    <Text
                      style={[
                        styles.choiceButtonText,
                        choice === "server" && styles.choiceButtonTextActive,
                      ]}
                    >
                      Keep Server
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.doneButton, !allResolved && styles.doneButtonDisabled]}
            onPress={handleDone}
            disabled={!allResolved}
          >
            <Text
              style={[
                styles.doneButtonText,
                !allResolved && styles.doneButtonTextDisabled,
              ]}
            >
              {allResolved
                ? "Done"
                : `Resolve ${conflicts.length - resolutions.size} remaining`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2f2f7",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.text,
    textAlign: "center",
    marginTop: 20,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    marginHorizontal: 24,
    marginTop: 8,
    marginBottom: 16,
    lineHeight: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 12,
  },
  diffTable: {
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  diffHeader: {
    flexDirection: "row",
    backgroundColor: Colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  diffHeaderCell: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
    paddingVertical: 6,
    paddingHorizontal: 8,
    textAlign: "center",
  },
  diffRow: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  diffCell: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
    paddingVertical: 8,
    paddingHorizontal: 8,
    textAlign: "center",
  },
  diffLabel: {
    fontWeight: "500",
    textAlign: "left",
    color: Colors.textSecondary,
  },
  diffCellSelected: {
    backgroundColor: "#dbeafe",
    fontWeight: "600",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
  },
  choiceButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: "center",
  },
  choiceButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: "#eff6ff",
  },
  choiceButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  choiceButtonTextActive: {
    color: Colors.primary,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  doneButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  doneButtonDisabled: {
    backgroundColor: Colors.border,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  doneButtonTextDisabled: {
    color: Colors.textSecondary,
  },
});
