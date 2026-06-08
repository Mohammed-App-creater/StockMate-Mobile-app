import { Stack } from 'expo-router';

export default function ProductsLayout() {
  // Screens render their own headers / navbars to match the design.
  return <Stack screenOptions={{ headerShown: false }} />;
}
