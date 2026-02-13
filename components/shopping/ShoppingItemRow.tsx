import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Check, Square } from "lucide-react-native";
import type { ShoppingItem } from "../../lib/types";
import { Colors } from "../../constants/colors";

interface ShoppingItemRowProps {
  item: ShoppingItem;
  onToggle: () => void;
}

function formatQuantity(qty: number, unit: string): string {
  if (qty <= 0) return "";
  let display: string;
  if (qty % 1 === 0) {
    display = String(Math.round(qty));
  } else {
    display = qty.toFixed(1).replace(/0$/, "").replace(/\.$/, "");
  }
  if (!unit) return `\u00D7${display}`;
  return `${display} ${unit}`;
}

export default function ShoppingItemRow({ item, onToggle }: ShoppingItemRowProps) {
  const checked = item.checked;

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onToggle}
      activeOpacity={0.6}
    >
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <Check size={14} color="#ffffff" strokeWidth={3} />}
      </View>

      <Text
        style={[styles.name, checked && styles.nameChecked]}
        numberOfLines={1}
      >
        {item.name}
      </Text>

      {(item.quantity > 0 || item.unit) && (
        <Text style={[styles.quantity, checked && styles.quantityChecked]}>
          {formatQuantity(item.quantity, item.unit)}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  name: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  nameChecked: {
    textDecorationLine: "line-through",
    color: Colors.textSecondary,
  },
  quantity: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginLeft: 8,
    fontWeight: "500",
  },
  quantityChecked: {
    color: Colors.border,
  },
});
