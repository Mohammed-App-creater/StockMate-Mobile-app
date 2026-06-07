import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  analyticsApi,
  transactionsApi,
  type PeriodSummary,
  type Transaction,
  type TransactionType,
} from '../../store/api';
import { useAuthStore } from '../../store/auth';
import { formatMoney, toNumber } from '../../constants/format';
import { colors } from '../../constants/colors';

function StatCard({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

function TypeBadge({ type }: { type: TransactionType }) {
  const isSale = type === 'sale';
  return (
    <View style={[styles.badge, { backgroundColor: isSale ? '#DCFCE7' : '#DBEAFE' }]}>
      <Text style={[styles.badgeText, { color: isSale ? colors.success : colors.primary }]}>
        {isSale ? 'Sale' : 'Purchase'}
      </Text>
    </View>
  );
}

function txValue(t: Transaction): number {
  return toNumber(t.unit_price) * toNumber(t.total_quantity) - toNumber(t.discount_amount);
}

export default function DashboardScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [summary, setSummary] = useState<PeriodSummary | null>(null);
  const [recent, setRecent] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    // Both endpoints may 404 until the backend ships them — handle independently.
    const [summaryRes, recentRes] = await Promise.allSettled([
      analyticsApi.summary('daily'),
      transactionsApi.list({ limit: 5 }),
    ]);

    if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value.data);
    else setSummary(null);

    if (recentRes.status === 'fulfilled') {
      const data = recentRes.value.data as any;
      setRecent((Array.isArray(data) ? data : data?.items ?? []).slice(0, 5));
    } else {
      setRecent([]);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const name = (user && (user.full_name || user.username)) || 'there';
  const netProfit = toNumber(summary?.net_profit);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <View style={styles.headerRow}>
        <View style={styles.flex1}>
          <Text style={styles.greeting}>Welcome back, {name} 👋</Text>
          <Text style={styles.subtitle}>Today’s overview</Text>
        </View>
        <TouchableOpacity onPress={logout}>
          <Text style={styles.logout}>Log out</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <>
          <View style={styles.grid}>
            <StatCard label="Revenue" value={formatMoney(summary?.total_revenue)} />
            <StatCard label="Cost" value={formatMoney(summary?.total_cost)} />
            <StatCard
              label="Net Profit"
              value={formatMoney(summary?.net_profit)}
              valueColor={netProfit >= 0 ? colors.success : colors.error}
            />
            <StatCard label="Transactions" value={String(summary?.total_transactions ?? 0)} />
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.success }]}
              activeOpacity={0.85}
              onPress={() => router.push({ pathname: '/(app)/transactions/add', params: { type: 'sale' } })}
            >
              <Text style={styles.actionText}>+ Record Sale</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primary }]}
              activeOpacity={0.85}
              onPress={() => router.push({ pathname: '/(app)/transactions/add', params: { type: 'purchase' } })}
            >
              <Text style={styles.actionText}>+ Record Purchase</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Recent transactions</Text>
          {recent.length === 0 ? (
            <Text style={styles.muted}>No recent transactions.</Text>
          ) : (
            recent.map((t) => (
              <TouchableOpacity key={t.id} style={styles.txRow} activeOpacity={0.7} onPress={() => router.push('/(app)/transactions')}>
                <View style={styles.flex1}>
                  <Text style={styles.txName} numberOfLines={1}>
                    {t.product?.name ?? 'Product'}
                  </Text>
                  <Text style={styles.muted}>Qty {t.total_quantity}</Text>
                </View>
                <View style={styles.txRight}>
                  <TypeBadge type={t.transaction_type} />
                  <Text style={styles.txValue}>{formatMoney(txValue(t))}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  flex1: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  greeting: { fontSize: 22, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  logout: { color: colors.error, fontWeight: '600', fontSize: 14, paddingTop: 4 },
  center: { paddingVertical: 60, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 20 },
  statCard: {
    width: '47.5%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  statLabel: { fontSize: 13, color: colors.textMuted },
  statValue: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 6 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  actionBtn: { flex: 1, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  actionText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 28, marginBottom: 10 },
  muted: { fontSize: 14, color: colors.textMuted },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  txName: { fontSize: 15, fontWeight: '600', color: colors.text },
  txRight: { alignItems: 'flex-end', gap: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  txValue: { fontSize: 15, fontWeight: '700', color: colors.primary },
});
