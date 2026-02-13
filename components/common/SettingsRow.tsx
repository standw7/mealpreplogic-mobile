import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { ChevronRight } from "lucide-react-native";
import { Colors } from "../../constants/colors";

interface SettingsRowProps {
  label: string;
  value?: string;
  onPress?: () => void;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
  disabled?: boolean;
}

export default function SettingsRow({
  label,
  value,
  onPress,
  icon,
  rightElement,
  disabled = false,
}: SettingsRowProps) {
  const content = (
    <View style={[styles.row, disabled && styles.disabled]}>
      <View style={styles.left}>
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <Text style={styles.label}>{label}</Text>
      </View>
      <View style={styles.right}>
        {value !== undefined && <Text style={styles.value}>{value}</Text>}
        {rightElement}
        {onPress && !rightElement && (
          <ChevronRight size={18} color={Colors.textSecondary} />
        )}
      </View>
    </View>
  );

  if (onPress && !disabled) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.6}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 54,
    paddingHorizontal: 16,
    backgroundColor: Colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  disabled: {
    opacity: 0.4,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    marginRight: 12,
    width: 24,
    alignItems: "center",
  },
  label: {
    fontSize: 16,
    color: Colors.text,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  value: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
});
