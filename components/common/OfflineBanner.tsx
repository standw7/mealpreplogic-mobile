import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useIsOnline } from "../../lib/utils/network";

export default function OfflineBanner() {
  const isOnline = useIsOnline();

  if (isOnline) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>
        You are offline. Some features are unavailable.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    height: 32,
    backgroundColor: "#d97706",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  text: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
});
