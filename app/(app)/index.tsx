import { ReactNode, useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { Coins, Receipt, Repeat, ShoppingCart, TrendingUp, UserRound, Wallet } from 'lucide-react-native';
import {
  analyticsApi,
  transactionsApi,
  type PeriodSummary,
  type Transaction,
} from '../../store/api';
import { useAuthStore } from '../../store/auth';
import { formatMoney, toNumber } from '../../constants/format';
import { colors, shadowCard } from '../../constants/colors';
import { Badge, IconChip, Mono, SectionRow, text } from '../../components/ui';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning,';
  if (h < 18) return 'Good afternoon,';
  return 'Good evening,';
}

function StatCard({ label, value, icon, valueColor }: { label: string; value: string; icon: ReactNode; valueColor?: string }) {
  return (
    <View style={styles.stat}>
      <View style={styles.statTop}>
        <Text style={styles.statLabel}>{label}</Text>
        {icon}
      </View>
      <Text style={[styles.statVal, text.tnum, valueColor ? { color: valueColor } : null]}>
        {value}
        <Text style={styles.statCur}> ETB</Text>
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

  const [summary, setSummary] = useState<PeriodSummary | null>(null);
  const [recent, setRecent] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [summaryRes, recentRes] = await Promise.allSettled([
      analyticsApi.summary('daily'),
      transactionsApi.list({ limit: 5 }),
    ]);
    setSummary(summaryRes.status === 'fulfilled' ? summaryRes.value.data : null);
    if (recentRes.status === 'fulfilled') {
      const data = recentRes.value.data as any;
      setRecent((Array.isArray(data) ? data : data?.items ?? []).slice(0, 5));
    } else {
      setRecent([]);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(); };

  const name = (user && (user.full_name || user.username)) || 'there';
  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const netProfit = toNumber(summary?.net_profit);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.headRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greet}>{greeting()}</Text>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.date}>{dateStr}</Text>
          </View>
          <TouchableOpacity style={styles.bell} onPress={() => router.push('/(app)/profile')} accessibilityLabel="Profile">
            <UserRound size={20} color={colors.navy} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            <View style={styles.grid}>
              <StatCard label="Revenue" value={formatMoney(summary?.total_revenue, false)} icon={<IconChip tone="blue"><Coins size={20} color={colors.primary} /></IconChip>} />
              <StatCard label="Cost" value={formatMoney(summary?.total_cost, false)} icon={<IconChip tone="slate"><Wallet size={20} color={colors.navy} /></IconChip>} />
              <StatCard
                label="Net Profit"
                value={formatMoney(summary?.net_profit, false)}
                valueColor={netProfit >= 0 ? colors.success : colors.danger}
                icon={<IconChip tone="green"><TrendingUp size={20} color={colors.success} /></IconChip>}
              />
              <StatCardPlain label="Transactions" value={String(summary?.total_transactions ?? 0)} icon={<IconChip tone="amber"><Repeat size={20} color={colors.warning} /></IconChip>} />
            </View>

            <SectionRow title="Quick Actions" />
            <View style={styles.qactions}>
              <TouchableOpacity activeOpacity={0.9} style={styles.qaShadow} onPress={() => router.push({ pathname: '/(app)/transactions/add', params: { type: 'sale' } })}>
                <LinearGradient colors={['#16A34A', '#12823B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.qaction}>
                  <View style={styles.qaIco}><Receipt size={22} color="#fff" /></View>
                  <View>
                    <Text style={styles.qaLbl}>Record Sale</Text>
                    <Text style={styles.qaSub}>Sell to customer</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.9} style={styles.qaShadow} onPress={() => router.push({ pathname: '/(app)/transactions/add', params: { type: 'purchase' } })}>
                <LinearGradient colors={['#2563EB', '#1D4ED8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.qaction}>
                  <View style={styles.qaIco}><ShoppingCart size={22} color="#fff" /></View>
                  <View>
                    <Text style={styles.qaLbl}>Record Purchase</Text>
                    <Text style={styles.qaSub}>Buy new stock</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <SectionRow
              title="Recent Transactions"
              link={
                <TouchableOpacity onPress={() => router.push('/(app)/transactions')}>
                  <Text style={styles.link}>See all</Text>
                </TouchableOpacity>
              }
            />
            {recent.length === 0 ? (
              <Text style={text.muted}>No recent transactions.</Text>
            ) : (
              <View style={styles.txCard}>
                {recent.map((t, i) => {
                  const isSale = t.transaction_type === 'sale';
                  const pname = t.product?.name ?? 'Product';
                  return (
                    <View key={t.id} style={[styles.txItem, i > 0 && styles.txDivider]}>
                      <Mono name={pname} seed={t.product_id} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.txName} numberOfLines={1}>{pname}</Text>
                        <View style={{ marginTop: 4 }}>
                          <Badge tone={isSale ? 'green' : 'blue'} dot>{isSale ? 'Sale' : 'Purchase'}</Badge>
                        </View>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.txAmt, text.tnum, { color: isSale ? colors.success : colors.navy }]}>
                          {isSale ? '+' : '−'}{formatMoney(txValue(t))}
                        </Text>
                        <Text style={styles.txQty}>{t.total_quantity} units</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Transactions stat card has no " ETB" suffix.
function StatCardPlain({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <View style={styles.stat}>
      <View style={styles.statTop}>
        <Text style={styles.statLabel}>{label}</Text>
        {icon}
      </View>
      <Text style={[styles.statVal, text.tnum]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 28 },
  center: { paddingVertical: 80, alignItems: 'center' },
  headRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 },
  greet: { fontSize: 14, color: colors.textMuted, fontWeight: '500' },
  name: { fontSize: 23, fontWeight: '700', letterSpacing: -0.5, color: colors.navy, marginTop: 1 },
  date: { fontSize: 13, color: colors.textMuted2, marginTop: 2 },
  bell: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadowCard },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 18 },
  stat: { width: '47.5%', flexGrow: 1, backgroundColor: colors.card, borderRadius: 16, padding: 15, ...shadowCard },
  statTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  statLabel: { fontSize: 12.5, color: colors.textMuted, fontWeight: '600' },
  statVal: { fontSize: 19, fontWeight: '700', letterSpacing: -0.4, color: colors.navy },
  statCur: { fontSize: 12, color: colors.textMuted2, fontWeight: '600' },
  qactions: { flexDirection: 'row', gap: 12 },
  qaShadow: { flex: 1, borderRadius: 15, ...shadowCard },
  qaction: { borderRadius: 15, padding: 16, gap: 10, minHeight: 110, justifyContent: 'space-between' },
  qaIco: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  qaLbl: { fontSize: 15, fontWeight: '700', color: '#fff', letterSpacing: -0.2 },
  qaSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  link: { fontSize: 13, fontWeight: '600', color: colors.primary },
  txCard: { backgroundColor: colors.card, borderRadius: 16, ...shadowCard },
  txItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, paddingHorizontal: 15 },
  txDivider: { borderTopWidth: 1, borderTopColor: colors.hairline },
  txName: { fontSize: 14, fontWeight: '600', color: colors.navy },
  txAmt: { fontSize: 14.5, fontWeight: '700', letterSpacing: -0.2 },
  txQty: { fontSize: 11.5, color: colors.textMuted, marginTop: 1 },
});
