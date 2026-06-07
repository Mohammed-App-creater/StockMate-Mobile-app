import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '../../store/auth';

export default function AuthLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Already signed in? Send them into the app.
  if (isAuthenticated) {
    return <Redirect href="/(app)" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
