import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogOut } from 'lucide-react-native';
import { errorMessage, usersApi } from '../../store/api';
import { useAuthStore } from '../../store/auth';
import { formatDate } from '../../constants/format';
import { colors, shadowCard } from '../../constants/colors';
import { Navbar } from '../../components/Navbar';
import { Mono } from '../../components/ui';

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);

  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Refresh the profile from the server on mount.
  const refresh = useCallback(async () => {
    try {
      const res = await usersApi.me();
      await setUser(res.data);
      setFullName(res.data.full_name);
      setUsername(res.data.username);
    } catch {
      // Keep cached values on failure.
    }
  }, [setUser]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const profileDirty = fullName.trim() !== (user?.full_name ?? '') || username.trim() !== (user?.username ?? '');

  const saveProfile = async () => {
    if (!fullName.trim() || !username.trim()) {
      Alert.alert('Missing fields', 'Name and username cannot be empty.');
      return;
    }
    setSavingProfile(true);
    try {
      const res = await usersApi.update({ full_name: fullName.trim(), username: username.trim() });
      await setUser(res.data);
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch (e) {
      Alert.alert('Could not update', errorMessage(e, 'Please try again.'));
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert('Missing fields', 'Enter your current and new password.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Too short', 'New password must be at least 6 characters.');
      return;
    }
    setChangingPassword(true);
    try {
      await usersApi.changePassword({ current_password: currentPassword, new_password: newPassword });
      setCurrentPassword('');
      setNewPassword('');
      Alert.alert('Password changed', 'Your password has been updated.');
    } catch (e) {
      Alert.alert('Could not change password', errorMessage(e, 'Please try again.'));
    } finally {
      setChangingPassword(false);
    }
  };

  const confirmLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Navbar title="Profile" />
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Navbar title="Profile" subtitle="Account settings" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* identity card */}
        <View style={styles.idCard}>
          <Mono name={user.full_name || user.username} seed={user.id} size={56} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.idName} numberOfLines={1}>{user.full_name}</Text>
            <Text style={styles.idUser}>@{user.username}</Text>
            {user.created_at ? <Text style={styles.idMeta}>Member since {formatDate(user.created_at)}</Text> : null}
          </View>
        </View>

        {/* edit profile */}
        <Text style={styles.section}>Edit Profile</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Full name</Text>
          <View style={styles.input}><TextInput style={styles.inputText} value={fullName} onChangeText={setFullName} placeholder="Full name" placeholderTextColor={colors.textMuted2} /></View>
          <Text style={[styles.label, { marginTop: 14 }]}>Username</Text>
          <View style={styles.input}><TextInput style={styles.inputText} value={username} onChangeText={setUsername} autoCapitalize="none" placeholder="username" placeholderTextColor={colors.textMuted2} /></View>
          <TouchableOpacity
            style={[styles.btnPrimary, (!profileDirty || savingProfile) && styles.disabled]}
            onPress={saveProfile}
            disabled={!profileDirty || savingProfile}
            activeOpacity={0.9}
          >
            <Text style={styles.btnPrimaryText}>{savingProfile ? 'Saving…' : 'Save Changes'}</Text>
          </TouchableOpacity>
        </View>

        {/* change password */}
        <Text style={styles.section}>Change Password</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Current password</Text>
          <View style={styles.input}><TextInput style={styles.inputText} value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry placeholder="••••••••" placeholderTextColor={colors.textMuted2} /></View>
          <Text style={[styles.label, { marginTop: 14 }]}>New password</Text>
          <View style={styles.input}><TextInput style={styles.inputText} value={newPassword} onChangeText={setNewPassword} secureTextEntry placeholder="At least 6 characters" placeholderTextColor={colors.textMuted2} /></View>
          <TouchableOpacity
            style={[styles.btnPrimary, changingPassword && styles.disabled]}
            onPress={changePassword}
            disabled={changingPassword}
            activeOpacity={0.9}
          >
            <Text style={styles.btnPrimaryText}>{changingPassword ? 'Updating…' : 'Update Password'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout} activeOpacity={0.85}>
          <LogOut size={19} color={colors.danger} />
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  idCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.card, borderRadius: 16, padding: 16, ...shadowCard },
  idName: { fontSize: 18, fontWeight: '700', color: colors.navy, letterSpacing: -0.3 },
  idUser: { fontSize: 14, color: colors.primary, fontWeight: '600', marginTop: 2 },
  idMeta: { fontSize: 12.5, color: colors.textMuted, marginTop: 3 },
  section: { fontSize: 15, fontWeight: '700', color: colors.navy, marginTop: 24, marginBottom: 10 },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 16, ...shadowCard },
  label: { fontSize: 13, fontWeight: '600', color: colors.navy, marginBottom: 8 },
  input: { backgroundColor: colors.fieldBg, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14 },
  inputText: { fontSize: 15, color: colors.text, paddingVertical: 13 },
  btnPrimary: { height: 50, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, height: 52, borderRadius: 14, backgroundColor: colors.danger50, borderWidth: 1, borderColor: colors.danger100, marginTop: 28 },
  logoutText: { color: colors.danger, fontSize: 16, fontWeight: '700' },
});
