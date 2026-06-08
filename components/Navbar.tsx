import { ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { colors, shadowCard } from '../constants/colors';

export function Navbar({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  const router = useRouter();
  return (
    <View style={styles.navbar}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()} activeOpacity={0.7}>
        <ChevronLeft size={22} color={colors.navy} />
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  navbar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 4, paddingBottom: 14 },
  back: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadowCard },
  title: { fontSize: 19, fontWeight: '700', letterSpacing: -0.4, color: colors.navy },
  sub: { fontSize: 12.5, color: colors.textMuted },
});
