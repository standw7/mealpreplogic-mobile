import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { ChevronDown, ChevronUp } from "lucide-react-native";
import type { ShoppingItem } from "../../lib/types";
import { Colors } from "../../constants/colors";
import ShoppingItemRow from "./ShoppingItemRow";

interface CategorySectionProps {
  category: string;
  items: ShoppingItem[];
  onToggleItem: (itemId: string) => void;
}

export default function CategorySection({
  category,
  items,
  onToggleItem,
}: CategorySectionProps) {
  const [expanded, setExpanded] = useState(true);

  const checkedCount = items.filter((i) => i.checked).length;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded((prev) => !prev)}
        activeOpacity={0.6}
      >
        <View style={styles.headerLeft}>
          <Text style={styles.categoryName}>{category.toUpperCase()}</Text>
          <Text style={styles.itemCount}>
            {checkedCount}/{items.length}
          </Text>
        </View>
        {expanded ? (
          <ChevronUp size={18} color={Colors.textSecondary} />
        ) : (
          <ChevronDown size={18} color={Colors.textSecondary} />
        )}
      </TouchableOpacity>

      {expanded &&
        items.map((item) => (
          <ShoppingItemRow
            key={item.id}
            item={item}
            onToggle={() => onToggleItem(item.id)}
          />
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.backgroundAlt,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  categoryName: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.textSecondary,
    letterSpacing: 0.8,
  },
  itemCount: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 8,
    fontWeight: "500",
  },
});
