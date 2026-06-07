import { Text } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { useAuthStore } from '../../store/auth';
import { colors } from '../../constants/colors';

// Simple emoji tab icons (no icon font dependency needed yet).
const tabIcon = (emoji: string) => () => <Text style={{ fontSize: 20 }}>{emoji}</Text>;

export default function AppLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Not signed in? Send them to login.
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { color: colors.text },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Dashboard', tabBarIcon: tabIcon('🏠') }}
      />
      <Tabs.Screen
        name="products"
        options={{ title: 'Products', tabBarIcon: tabIcon('📦'), headerShown: false }}
      />
      <Tabs.Screen
        name="transactions"
        options={{ title: 'Transactions', tabBarIcon: tabIcon('💰'), headerShown: false }}
      />
      <Tabs.Screen
        name="summary"
        options={{ title: 'Summary', tabBarIcon: tabIcon('📊') }}
      />
    </Tabs>
  );
}
