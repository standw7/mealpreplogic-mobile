import { Stack } from "expo-router";

export default function StackLayout() {
  return (
    <Stack>
      <Stack.Screen name="add-recipe" options={{ title: "Add Recipe" }} />
      <Stack.Screen name="recipe/[id]" options={{ title: "Recipe" }} />
      <Stack.Screen name="recipe/edit/[id]" options={{ title: "Edit Recipe" }} />
    </Stack>
  );
}
