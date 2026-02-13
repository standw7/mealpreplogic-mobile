import React from "react";
import { View, Text, StyleSheet } from "react-native";

import type { DayPlan } from "../../lib/types";
import { Colors } from "../../constants/colors";

import MealSlotCard from "./MealSlotCard";

interface PlanCardProps {
  dayPlan: DayPlan;
  onReroll: (slot: string) => void;
  rerollingSlot: string | null;
}

export default function PlanCard({
  dayPlan,
  onReroll,
  rerollingSlot,
}: PlanCardProps) {
  return (
    <View style={styles.card}>
      {/* Day header */}
      <Text style={styles.dayHeader}>{dayPlan.day}</Text>

      {/* Meal slot cards */}
      {dayPlan.meals.map((assignment) => (
        <MealSlotCard
          key={`${dayPlan.day}-${assignment.slot}`}
          assignment={assignment}
          onReroll={() => onReroll(assignment.slot)}
          rerolling={rerollingSlot === assignment.slot}
        />
      ))}

      {/* Daily totals */}
      <View style={styles.totalsRow}>
        <View style={styles.calBadge}>
          <Text style={styles.calBadgeText}>{dayPlan.totalCalories} cal</Text>
        </View>
        <View style={styles.totalItem}>
          <Text style={styles.totalValue}>{dayPlan.totalProtein}g</Text>
          <Text style={styles.totalLabel}>protein</Text>
        </View>
        <View style={styles.totalItem}>
          <Text style={styles.totalValue}>{dayPlan.totalFat}g</Text>
          <Text style={styles.totalLabel}>fat</Text>
        </View>
        <View style={styles.totalItem}>
          <Text style={styles.totalValue}>{dayPlan.totalCarbs}g</Text>
          <Text style={styles.totalLabel}>carbs</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  dayHeader: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 10,
  },
  totalsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: 10,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  calBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  calBadgeText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.primary,
  },
  totalItem: {
    alignItems: "center",
  },
  totalValue: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
  },
  totalLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
