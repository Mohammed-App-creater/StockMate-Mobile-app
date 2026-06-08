import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Eye, EyeOff, Lock, Package, User } from 'lucide-react-native';
import { api, authApi } from '../../store/api';
import { useAuthStore } from '../../store/auth';
import { colors, shadowCard } from '../../constants/colors';

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    if (!username || !password) {
      setError('Please enter your username and password.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await authApi.login({ username: username.trim(), password });
      const token = res.data?.access_token;
      if (!token) throw new Error('No token in response');
      // Fetch the profile with the fresh token (the store isn't set yet).
      let user = null;
      try {
        const me = await api.get('/users/me', { headers: { Authorization: `Bearer ${token}` } });
        user = me.data;
      } catch {
        // Non-fatal — the greeting falls back to "there".
      }
      await login(token, user);
      router.replace('/(app)');
    } catch (e: any) {
      const status = e?.response?.status;
      setError(
        status === 401 || status === 400
          ? 'Invalid username or password.'
          : 'Could not reach the server. Check your connection.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Package size={38} color="#fff" />
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.title}>
              Stock<Text style={styles.titleAccent}>Mate</Text>
            </Text>
            <Text style={styles.tag}>Wholesale inventory & accounting</Text>
          </View>
        </View>

        <Text style={styles.welcome}>Welcome back</Text>
        <Text style={styles.welcomeSub}>Sign in to manage your books</Text>

        <Text style={styles.label}>Username</Text>
        <View style={styles.inputWrap}>
          <User size={19} color={colors.textMuted2} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="username"
            placeholderTextColor={colors.textMuted2}
            returnKeyType="next"
          />
        </View>

        <Text style={[styles.label, { marginTop: 16 }]}>Password</Text>
        <View style={styles.inputWrap}>
          <Lock size={19} color={colors.textMuted2} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { paddingRight: 44 }]}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            placeholder="••••••••"
            placeholderTextColor={colors.textMuted2}
            returnKeyType="done"
            onSubmitEditing={onLogin}
          />
          <TouchableOpacity style={styles.eye} onPress={() => setShowPassword((s) => !s)} hitSlop={8}>
            {showPassword ? <EyeOff size={19} color={colors.textMuted2} /> : <Eye size={19} color={colors.textMuted2} />}
          </TouchableOpacity>
        </View>

        <Text style={styles.forgot}>Forgot password?</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={onLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>{loading ? 'Signing in…' : 'Sign In'}</Text>
        </TouchableOpacity>

        <View style={{ flex: 1 }} />
        <Text style={styles.foot}>ERCA receipt-compliance ready · Addis Ababa</Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, paddingHorizontal: 28 },
  brand: { alignItems: 'center', gap: 16, marginTop: 70, marginBottom: 44 },
  logo: {
    width: 76,
    height: 76,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 16 },
    elevation: 8,
  },
  title: { fontSize: 30, fontWeight: '700', letterSpacing: -0.8, color: colors.navy },
  titleAccent: { color: colors.primary },
  tag: { fontSize: 14.5, color: colors.textMuted, marginTop: 4 },
  welcome: { fontSize: 20, fontWeight: '700', color: colors.navy, letterSpacing: -0.4 },
  welcomeSub: { fontSize: 14, color: colors.textMuted, marginTop: 4, marginBottom: 26 },
  label: { fontSize: 13, fontWeight: '600', color: colors.navy, marginBottom: 8 },
  inputWrap: { position: 'relative', justifyContent: 'center' },
  inputIcon: { position: 'absolute', left: 14, zIndex: 2 },
  input: {
    height: 50,
    backgroundColor: colors.fieldBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingLeft: 44,
    paddingRight: 14,
    fontSize: 15,
    color: colors.text,
  },
  eye: { position: 'absolute', right: 12, padding: 4 },
  forgot: { textAlign: 'right', fontSize: 13, fontWeight: '600', color: colors.primary, marginTop: 6, marginBottom: 26 },
  error: { color: colors.danger, fontSize: 13, marginBottom: 14, marginTop: -10 },
  button: {
    height: 54,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadowCard,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  foot: { textAlign: 'center', fontSize: 12.5, color: colors.textMuted2, paddingBottom: 26 },
});
