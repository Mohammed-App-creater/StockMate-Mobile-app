import { Redirect, Tabs } from 'expo-router';
import { BarChart3, Home, Package, Repeat } from 'lucide-react-native';
import { useAuthStore } from '../../store/auth';
import { colors } from '../../constants/colors';

export default function AppLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.blueAccent,
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: {
          backgroundColor: colors.navy,
          borderTopWidth: 0,
          height: 64,
          paddingTop: 8,
          paddingBottom: 10,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Home color={color} size={size ?? 23} /> }}
      />
      <Tabs.Screen
        name="products"
        options={{ title: 'Products', tabBarIcon: ({ color, size }) => <Package color={color} size={size ?? 23} /> }}
      />
      <Tabs.Screen
        name="transactions"
        options={{ title: 'Transactions', tabBarIcon: ({ color, size }) => <Repeat color={color} size={size ?? 23} /> }}
      />
      <Tabs.Screen
        name="summary"
        options={{ title: 'Summary', tabBarIcon: ({ color, size }) => <BarChart3 color={color} size={size ?? 23} /> }}
      />
    </Tabs>
  );
}
