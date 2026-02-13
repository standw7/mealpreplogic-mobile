import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

import type { MealPlan } from "../../lib/types";
import { Colors } from "../../constants/colors";
import PlanCard from "./PlanCard";

interface PlanGridProps {
  plans: MealPlan[];
  onSelectPlan: (planId: string) => void;
  onReroll: (planIndex: number, day: string, slot: string) => void;
  rerollingKey: string | null;
}

export default function PlanGrid({
  plans,
  onSelectPlan,
  onReroll,
  rerollingKey,
}: PlanGridProps) {
  const [activePlanIndex, setActivePlanIndex] = useState(0);

  if (plans.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No plans generated</Text>
      </View>
    );
  }

  const activePlan = plans[activePlanIndex];

  return (
    <View style={styles.container}>
      {/* Plan tab selector */}
      <View style={styles.tabRow}>
        {plans.map((plan, index) => (
          <TouchableOpacity
            key={plan.id || `plan-${index}`}
            style={[
              styles.tab,
              activePlanIndex === index && styles.tabActive,
            ]}
            onPress={() => setActivePlanIndex(index)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                activePlanIndex === index && styles.tabTextActive,
              ]}
            >
              {plan.label || `Plan ${index + 1}`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Plan content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Day cards */}
        {activePlan.days.map((dayPlan) => {
          const rerollingSlot =
            rerollingKey &&
            rerollingKey.startsWith(`${activePlanIndex}-${dayPlan.day}-`)
              ? rerollingKey.split("-").slice(2).join("-")
              : null;

          return (
            <PlanCard
              key={dayPlan.day}
              dayPlan={dayPlan}
              onReroll={(slot) => onReroll(activePlanIndex, dayPlan.day, slot)}
              rerollingSlot={rerollingSlot}
            />
          );
        })}

        {/* Macro summary card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Daily Averages</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>
                {Math.round(activePlan.macroSummary.avgCalories)}
              </Text>
              <Text style={styles.summaryLabel}>cal</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>
                {Math.round(activePlan.macroSummary.avgProtein)}g
              </Text>
              <Text style={styles.summaryLabel}>protein</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>
                {Math.round(activePlan.macroSummary.avgFat)}g
              </Text>
              <Text style={styles.summaryLabel}>fat</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>
                {Math.round(activePlan.macroSummary.avgCarbs)}g
              </Text>
              <Text style={styles.summaryLabel}>carbs</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>
                {Math.round(activePlan.macroSummary.avgFiber)}g
              </Text>
              <Text style={styles.summaryLabel}>fiber</Text>
            </View>
          </View>
        </View>

        {/* Select button */}
        <TouchableOpacity
          style={styles.selectButton}
          onPress={() => onSelectPlan(activePlan.id)}
          activeOpacity={0.8}
        >
          <Text style={styles.selectButtonText}>Select This Plan</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tab: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  tabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  tabTextActive: {
    color: "#ffffff",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  summaryCard: {
    backgroundColor: Colors.primary + "08",
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.primary + "20",
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 12,
    textAlign: "center",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  summaryItem: {
    alignItems: "center",
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.primary,
  },
  summaryLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  selectButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  selectButtonText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "700",
  },
});
