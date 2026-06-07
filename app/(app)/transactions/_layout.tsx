import { Stack } from 'expo-router';
import { colors } from '../../../constants/colors';

export default function TransactionsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { color: colors.text },
        headerTintColor: colors.primary,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Transactions' }} />
      <Stack.Screen name="add" options={{ title: 'New Transaction' }} />
    </Stack>
  );
}
