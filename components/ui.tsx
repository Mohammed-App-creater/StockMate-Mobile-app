import { ReactNode } from 'react';
import { StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { colors, shadowCard } from '../constants/colors';

// ---- colored icon chips (t-blue / t-green / t-red / t-amber / t-slate) ----
export type Tone = 'blue' | 'green' | 'red' | 'amber' | 'slate';
export const tint: Record<Tone, { bg: string; fg: string }> = {
  blue: { bg: colors.primary50, fg: colors.primary },
  green: { bg: colors.success50, fg: colors.success },
  red: { bg: colors.danger50, fg: colors.danger },
  amber: { bg: colors.warning50, fg: colors.warning },
  slate: { bg: '#F1F5F9', fg: colors.navy },
};

export function IconChip({ tone, size = 38, children }: { tone: Tone; size?: number; children: ReactNode }) {
  return (
    <View style={[styles.iconChip, { width: size, height: size, backgroundColor: tint[tone].bg }]}>
      {children}
    </View>
  );
}

// ---- Badge ----
export function Badge({
  tone,
  children,
  dot,
  icon,
  style,
}: {
  tone: Tone;
  children: ReactNode;
  dot?: boolean;
  icon?: ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.badge, { backgroundColor: tint[tone].bg }, style]}>
      {dot ? <View style={[styles.badgeDot, { backgroundColor: tint[tone].fg }]} /> : null}
      {icon}
      <Text style={[styles.badgeText, { color: tint[tone].fg }]}>{children}</Text>
    </View>
  );
}

// ---- Monogram thumbnail (initials, stable color from a seed string) ----
const MONO = [
  { bg: '#EFF6FF', fg: '#2563EB' },
  { bg: '#F0FDF4', fg: '#16A34A' },
  { bg: '#FFFBEB', fg: '#D97706' },
  { bg: '#FEF2F2', fg: '#DC2626' },
  { bg: '#F1F5F9', fg: '#334155' },
  { bg: '#FAF5FF', fg: '#7C3AED' },
];
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
export function initials(name: string): string {
  const w = name.replace(/[0-9].*/, '').trim().split(/\s+/);
  return ((w[0]?.[0] || '') + (w[1]?.[0] || '')).toUpperCase();
}
export function Mono({ name, seed, size = 42 }: { name: string; seed?: string; size?: number }) {
  const c = MONO[hash(seed ?? name) % MONO.length];
  return (
    <View style={[styles.mono, { width: size, height: size, backgroundColor: c.bg }]}>
      <Text style={[styles.monoText, { color: c.fg }]}>{initials(name)}</Text>
    </View>
  );
}

// ---- Section header row ("Title" + optional link) ----
export function SectionRow({ title, icon, link }: { title: string; icon?: ReactNode; link?: ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <View style={styles.sectionTitleWrap}>
        {icon}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {link}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export const text = StyleSheet.create({
  h1: { fontSize: 23, fontWeight: '700', letterSpacing: -0.5, color: colors.navy },
  muted: { fontSize: 13, color: colors.textMuted },
  tnum: { fontVariant: ['tabular-nums'] } as TextStyle,
});

const styles = StyleSheet.create({
  iconChip: { borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 21,
    paddingHorizontal: 8,
    borderRadius: 7,
    alignSelf: 'flex-start',
  },
  badgeDot: { width: 5, height: 5, borderRadius: 2.5 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  mono: { borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  monoText: { fontSize: 13, fontWeight: '700' },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
    marginBottom: 12,
  },
  sectionTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2, color: colors.navy },
  card: { backgroundColor: colors.card, borderRadius: 16, ...shadowCard },
});
